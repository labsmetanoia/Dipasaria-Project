// Standing orders: shared rules used by both data adapters, the server actions and the scheduled job.
import type { BusinessAccount, DeliveryArea, DeliverySlot, PaymentMethod, Product, Settings, StandingOrder, StandingOrderInput, StandingOrderRun } from "./types";
import { quote } from "./pricing";
import type { Repo, Result } from "./data/repo";
import { addDays, nowJakarta } from "./format";

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
export function validateStanding(input: StandingOrderInput, account: BusinessAccount, products: Product[], slots: DeliverySlot[], ctx?: { settings: Settings; areas: DeliveryArea[]; now: { date: string; minutesOfDay: number } }): string | null {
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
  // Price it like a real order so an order below the business minimum is refused now, not failed every night.
  if (ctx) {
    const q = quote({ settings: ctx.settings, products, areas: ctx.areas, promos: [], account, now: ctx.now },
      { lines: lines.map((l) => ({ product_id: "", variant_id: l.variant_id, qty: l.qty, prep_option_id: l.prep_option_id })), area_id: account.area_id });
    if (q.errors.length) return q.errors[0];
    if (!q.min_order_met) return `Pesanan rutin belum mencapai minimal pesanan bisnis Rp${q.min_order.toLocaleString("id-ID")} per pengiriman.`;
  }
  return null;
}

/** `note` lists items left out because they were unavailable that night; the rest of the order was still placed. */
export interface RunOutcome { standing_order_id: string; account_name: string; status: "placed" | "skipped" | "failed" | "already"; order_id?: string; order_code?: string; error?: string; note?: string; missing?: string[] }

/**
 * Turn every standing order due on `date` into a real order. Idempotent: a run is claimed per (standing order, date)
 * before placing, so a second call for the same date does nothing for orders already processed.
 */
export async function runStandingOrders(repo: Repo, date: string): Promise<RunOutcome[]> {
  const [all, products, settings, areas] = await Promise.all([repo.listStandingOrders(), repo.getProducts(), repo.getSettings(), repo.getAreas()]);
  const ctx: RunContext = { products, settings, areas };
  const out: RunOutcome[] = [];
  for (const so of all) {
    try {
      out.push(...(await runOne(repo, so, date, ctx)));
    } catch (e) {
      // One failure (network, database) must not stop the rest of the evening's run.
      out.push({ standing_order_id: so.id, account_name: so.account_id, status: "failed", error: e instanceof Error ? e.message : String(e) });
    }
  }
  const placed = out.filter((r) => r.status === "placed").length;
  const failed = out.filter((r) => r.status === "failed").length;
  const partial = out.filter((r) => r.status === "placed" && r.note).length;
  try { await repo.recordJob("standing_orders", `${date}: ${placed} dibuat${partial ? ` (${partial} sebagian)` : ""}, ${failed} gagal`); } catch { /* informational only */ }
  return out;
}

interface RunContext { products: Product[]; settings: Settings; areas: DeliveryArea[] }

/**
 * Split a standing order's lines into those that can be delivered tonight and those that cannot
 * (product switched off, sold out today, not enough stock). Each line is checked on its own, with the same rules as checkout.
 */
export function availableLines(so: Pick<StandingOrder, "lines">, account: BusinessAccount, ctx: RunContext) {
  const ok: StandingOrder["lines"] = [];
  const missing: string[] = [];
  for (const l of so.lines) {
    const q = quote({ settings: ctx.settings, products: ctx.products, areas: ctx.areas, promos: [], account, now: nowJakarta() },
      { lines: [{ product_id: "", variant_id: l.variant_id, qty: l.qty, prep_option_id: l.prep_option_id }], area_id: account.area_id });
    if (q.errors.length) missing.push(q.errors[0]);
    else ok.push(l);
  }
  return { ok, missing };
}

async function runOne(repo: Repo, so: StandingOrder, date: string, ctx: RunContext): Promise<RunOutcome[]> {
  const productOf = (variantId: string) => ctx.products.find((p) => p.variants.some((v) => v.id === variantId))?.id ?? "";
  const out: RunOutcome[] = [];
  {
    const account = await repo.getAccount(so.account_id);
    const name = account?.business_name ?? so.account_id;
    if (!isDue(so, date)) {
      if (so.status === "active" && so.weekdays.includes(isoWeekday(date))) out.push({ standing_order_id: so.id, account_name: name, status: "skipped" });
      return out;
    }
    const run = await repo.claimStandingRun(so.id, date);
    if (!run) { out.push({ standing_order_id: so.id, account_name: name, status: "already" }); return out; }
    if (!account || account.status !== "approved" || !account.area_id) {
      const error = "Akun bisnis tidak aktif atau belum memiliki wilayah pengiriman.";
      await repo.finishStandingRun(run.id, { error });
      out.push({ standing_order_id: so.id, account_name: name, status: "failed", error });
      return out;
    }
    // Partial delivery: a sold-out item is left out and noted, the rest of the kitchen's order still goes out.
    let { ok: lines, missing } = availableLines(so, account, ctx);
    let res: Awaited<ReturnType<Repo["placeOrder"]>> = { ok: false, error: "" };
    for (let attempt = 0; attempt < 3; attempt++) {
      if (!lines.length) { res = { ok: false, error: "Semua produk dalam pesanan rutin ini tidak tersedia malam ini." }; break; }
      const note = `Pesanan rutin: ${so.name}${so.note ? ` · ${so.note}` : ""}${missing.length ? ` · Tidak tersedia malam ini: ${missing.join(" ")}` : ""}`;
      res = await repo.placeOrder({
        lines: lines.map((l) => ({ product_id: productOf(l.variant_id), variant_id: l.variant_id, qty: l.qty, prep_option_id: l.prep_option_id })),
        customer_name: account.business_name,
        phone: account.phone,
        address: account.address,
        area_id: account.area_id,
        delivery_date: date,
        slot_id: so.slot_id,
        payment_method: so.payment_method,
        customer_note: note.slice(0, 400),
        // the same run never creates two orders, even if it is retried after a crash or a lost response
        client_ref: `so:${so.id}:${date}`,
      }, account);
      if (res.ok) break;
      // Stock can change between the check and the order (another customer bought the last kilo): drop that line and retry.
      const err = res.error;
      const hit = lines.find((l) => { const p = ctx.products.find((x) => x.id === productOf(l.variant_id)); return p && err.startsWith(p.name); });
      if (!hit) break;
      lines = lines.filter((l) => l !== hit);
      missing = [...missing, err];
    }
    const note = missing.length ? missing.join(" ") : undefined;
    if (res.ok) {
      await repo.finishStandingRun(run.id, { order_id: res.data.id, order_code: res.data.code, note: note ?? null });
      out.push({ standing_order_id: so.id, account_name: name, status: "placed", order_id: res.data.id, order_code: res.data.code, note, missing });
    } else {
      const error = missing.length && !res.error.startsWith("Semua produk") ? `${res.error} (Tidak tersedia: ${missing.join(" ")})` : res.error;
      await repo.finishStandingRun(run.id, { error, note: note ?? null });
      out.push({ standing_order_id: so.id, account_name: name, status: "failed", error });
    }
  }
  return out;
}

/** Tomorrow's date in Jakarta: the delivery date the evening job prepares (independent of the cut-off setting). */
export function jakartaTomorrow(now: { date: string }): string {
  return addDays(now.date, 1);
}

export type { StandingOrder, StandingOrderRun, Result };
