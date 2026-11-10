// Standing orders: shared rules used by both data adapters, the server actions and the scheduled job.
import type { BusinessAccount, DeliverySlot, PaymentMethod, Product, StandingOrder, StandingOrderInput, StandingOrderRun } from "./types";
import type { Repo, Result } from "./data/repo";
import { addDays } from "./format";

export const WEEKDAYS = {
  id: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
} as const;

/** ISO weekday (1 = Monday … 7 = Sunday) of a YYYY-MM-DD date. */
export function isoWeekday(date: string): number {
  const d = new Date(`${date}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Is this standing order due for delivery on `date`? */
export function isDue(so: StandingOrder, date: string): boolean {
  return so.status === "active" && so.weekdays.includes(isoWeekday(date)) && !so.skip_dates.includes(date);
}

/** The next `n` delivery dates on or after `from` that match the weekdays (skips included, so they can be shown). */
export function upcomingDates(so: Pick<StandingOrder, "weekdays">, from: string, n = 4): string[] {
  const out: string[] = [];
  for (let i = 0; out.length < n && i < 28; i++) {
    const d = addDays(from, i);
    if (so.weekdays.includes(isoWeekday(d))) out.push(d);
  }
  return out;
}

/** Payment methods a business account may use on a standing order. */
export function allowedPayments(account: BusinessAccount): PaymentMethod[] {
  const out: PaymentMethod[] = [];
  if (account.payment_terms !== "prepaid") out.push("terms");
  out.push("transfer", "qris");
  if (account.allow_cod) out.push("cod");
  return out;
}

/** Validate a customer's standing-order input against the catalogue, slots and account. Returns an Indonesian error or null. */
export function validateStanding(input: StandingOrderInput, account: BusinessAccount, products: Product[], slots: DeliverySlot[]): string | null {
  if (account.status !== "approved") return "Pesanan rutin hanya tersedia untuk akun bisnis yang telah disetujui.";
  const days = [...new Set(input.weekdays)].filter((d) => d >= 1 && d <= 7);
  if (!days.length) return "Pilih minimal satu hari pengiriman.";
  const slot = slots.find((s) => s.id === input.slot_id && s.is_active && s.segment !== "retail");
  if (!slot) return "Jam pengiriman tidak tersedia untuk akun bisnis.";
  if (!allowedPayments(account).includes(input.payment_method)) return "Metode pembayaran ini tidak tersedia untuk akun Anda.";
  const lines = input.lines.filter((l) => l.qty > 0);
  if (!lines.length) return "Tambahkan minimal satu produk ke pesanan rutin.";
  for (const l of lines) {
    const product = products.find((p) => p.variants.some((v) => v.id === l.variant_id));
    const variant = product?.variants.find((v) => v.id === l.variant_id);
    if (!product || !variant || !variant.is_active || !product.is_active) return "Salah satu produk sudah tidak tersedia. Hapus produk tersebut dari pesanan rutin.";
    if (l.qty < variant.min_qty) return `${product.name}: pembelian minimal ${variant.min_qty} per pengiriman.`;
    if (l.prep_option_id && !product.prep_options.some((o) => o.id === l.prep_option_id)) return `${product.name}: cara penyiapan tidak tersedia.`;
  }
  if (input.name.trim().length > 60) return "Nama pesanan rutin maksimal 60 karakter.";
  return null;
}

export interface RunOutcome { standing_order_id: string; account_name: string; status: "placed" | "skipped" | "failed" | "already"; order_code?: string; error?: string }

/**
 * Turn every standing order due on `date` into a real order. Idempotent: a run is claimed per (standing order, date)
 * before placing, so a second call for the same date does nothing for orders already processed.
 */
export async function runStandingOrders(repo: Repo, date: string): Promise<RunOutcome[]> {
  const [all, products] = await Promise.all([repo.listStandingOrders(), repo.getProducts()]);
  const productOf = (variantId: string) => products.find((p) => p.variants.some((v) => v.id === variantId))?.id ?? "";
  const out: RunOutcome[] = [];
  for (const so of all) {
    const account = await repo.getAccount(so.account_id);
    const name = account?.business_name ?? so.account_id;
    if (!isDue(so, date)) {
      if (so.status === "active" && so.weekdays.includes(isoWeekday(date))) out.push({ standing_order_id: so.id, account_name: name, status: "skipped" });
      continue;
    }
    const run = await repo.claimStandingRun(so.id, date);
    if (!run) { out.push({ standing_order_id: so.id, account_name: name, status: "already" }); continue; }
    if (!account || account.status !== "approved" || !account.area_id) {
      const error = "Akun bisnis tidak aktif atau belum memiliki wilayah pengiriman.";
      await repo.finishStandingRun(run.id, { error });
      out.push({ standing_order_id: so.id, account_name: name, status: "failed", error });
      continue;
    }
    const res = await repo.placeOrder({
      lines: so.lines.map((l) => ({ product_id: productOf(l.variant_id), variant_id: l.variant_id, qty: l.qty, prep_option_id: l.prep_option_id })),
      customer_name: account.business_name,
      phone: account.phone,
      address: account.address,
      area_id: account.area_id,
      delivery_date: date,
      slot_id: so.slot_id,
      payment_method: so.payment_method,
      customer_note: `Pesanan rutin: ${so.name}${so.note ? ` · ${so.note}` : ""}`,
    }, account);
    if (res.ok) {
      await repo.finishStandingRun(run.id, { order_id: res.data.id, order_code: res.data.code });
      out.push({ standing_order_id: so.id, account_name: name, status: "placed", order_code: res.data.code });
    } else {
      await repo.finishStandingRun(run.id, { error: res.error });
      out.push({ standing_order_id: so.id, account_name: name, status: "failed", error: res.error });
    }
  }
  return out;
}

export type { StandingOrder, StandingOrderRun, Result };
