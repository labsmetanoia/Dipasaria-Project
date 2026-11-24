// Standing orders: shared rules used by both data adapters, the server actions and the scheduled job.
import type { BoxInput, BusinessAccount, CustomerAddress, DeliveryArea, DeliverySlot, PaymentMethod, Product, Settings, StandingOrder, StandingOrderInput, StandingOrderRun } from "./types";
import { lineTotal, quote, roundQty, unitPrice } from "./pricing";
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

type Schedule = Pick<StandingOrder, "weekdays"> & Partial<Pick<StandingOrder, "every_weeks" | "anchor_date">>;

/** Does `date` fall on the schedule: one of its weekdays and, for a two-weekly box, an even number of weeks from its first delivery. */
export function onSchedule(so: Schedule, date: string): boolean {
  if (!so.weekdays.includes(isoWeekday(date))) return false;
  if ((so.every_weeks ?? 1) < 2 || !so.anchor_date) return true;
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${so.anchor_date}T00:00:00Z`)) / 86400_000);
  return days >= 0 && Math.floor(days / 7) % 2 === 0;
}

/** Is this standing order due for delivery on `date`? */
export function isDue(so: StandingOrder, date: string): boolean {
  return so.status === "active" && onSchedule(so, date) && !so.skip_dates.includes(date);
}

/** The next `n` delivery dates on or after `from` that are on the schedule (skips included, so they can be shown). */
export function upcomingDates(so: Schedule, from: string, n = 4): string[] {
  const out: string[] = [];
  for (let i = 0; out.length < n && i < 70; i++) {
    const d = addDays(from, i);
    if (onSchedule(so, d)) out.push(d);
  }
  return out;
}

// ---------- household weekly boxes ----------
export const MAX_BOXES = 3;
export const BOX_PAYMENTS: PaymentMethod[] = ["qris", "transfer"];

/** Price of a box's items at household prices (catch-weight items are an estimate until weighed). */
export function boxSubtotal(lines: StandingOrder["lines"], products: Product[]): number {
  return lines.reduce((s, l) => {
    const product = products.find((p) => p.variants.some((v) => v.id === l.variant_id));
    const variant = product?.variants.find((v) => v.id === l.variant_id);
    if (!product || !variant) return s;
    const prep = l.prep_option_id ? product.prep_options.find((o) => o.id === l.prep_option_id) : null;
    return s + lineTotal(unitPrice(variant, "retail", null) + (prep?.surcharge ?? 0), roundQty(l.qty, variant));
  }, 0);
}

/** Validate a household's weekly box. Returns an Indonesian error or null. Availability is checked each week, not here. */
export function validateBox(input: BoxInput, addresses: CustomerAddress[], products: Product[], slots: DeliverySlot[], areas: DeliveryArea[], settings: Settings): string | null {
  const days = [...new Set(input.weekdays.map(Number))].filter((d) => d >= 1 && d <= 7);
  if (days.length !== 1) return "Pilih satu hari pengiriman.";
  if (input.every_weeks !== 1 && input.every_weeks !== 2) return "Pilih setiap minggu atau dua minggu sekali.";
  if (!slots.some((s) => s.id === input.slot_id && s.is_active && s.segment !== "business")) return "Jam pengiriman ini tidak tersedia.";
  if (!BOX_PAYMENTS.includes(input.payment_method)) return "Kotak mingguan dibayar dengan QRIS atau transfer bank.";
  const address = addresses.find((a) => a.id === input.address_id);
  if (!address) return "Pilih alamat pengiriman dari buku alamat Anda.";
  if (!address.area_id || !areas.some((a) => a.id === address.area_id && a.is_active)) return "Lengkapi wilayah pengiriman pada alamat ini di buku alamat.";
  const lines = input.lines.filter((l) => l.qty > 0);
  if (!lines.length) return "Tambahkan minimal satu produk ke kotak.";
  if (lines.length > 20) return "Maksimal 20 produk per kotak.";
  for (const l of lines) {
    const product = products.find((p) => p.variants.some((v) => v.id === l.variant_id));
    const variant = product?.variants.find((v) => v.id === l.variant_id);
    if (!product || !variant || !variant.is_active || !product.is_active || variant.business_only) return "Salah satu produk sudah tidak tersedia. Hapus produk tersebut dari kotak.";
    if (!Number.isFinite(l.qty) || l.qty < variant.min_qty || l.qty > 50) return `${product.name}: jumlah tidak valid.`;
    if (l.prep_option_id && !product.prep_options.some((o) => o.id === l.prep_option_id)) return `${product.name}: cara penyiapan tidak tersedia.`;
  }
  if (boxSubtotal(lines, products) < settings.min_order_retail) return `Isi kotak belum mencapai minimal pesanan Rp${settings.min_order_retail.toLocaleString("id-ID")}.`;
  if (String(input.name ?? "").trim().length > 60) return "Nama kotak maksimal 60 karakter.";
  return null;
}

/**
 * When a box order with a known total must be paid: the order cut-off on the evening before delivery (the box is
 * created two evenings before, so that is about a day), never less than the usual payment window, never past midnight.
 */
export function boxPayBy(deliveryDate: string, settings: Pick<Settings, "cutoff_time" | "payment_window_minutes">, nowMs = Date.now()): string {
  const dayStart = Date.parse(`${deliveryDate}T00:00:00+07:00`);
  const cutoff = Date.parse(`${addDays(deliveryDate, -1)}T${settings.cutoff_time}:00+07:00`);
  const window = nowMs + Math.max(30, settings.payment_window_minutes || 120) * 60_000;
  return new Date(Math.min(dayStart, Math.max(cutoff, window))).toISOString();
}

/** May the customer still skip this box order: unpaid, not yet weighed or packed, before the cut-off for its delivery day. */
export function boxSkippable(o: { client_ref?: string | null; segment: string; status: string; payment_status: string; weighed_at: string | null; delivery_date: string }, bookable: string[]): boolean {
  return Boolean(o.client_ref?.startsWith("so:")) && o.segment === "retail" && (o.status === "new" || o.status === "confirmed")
    && o.payment_status === "unpaid" && !o.weighed_at && bookable.includes(o.delivery_date);
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
export interface RunOutcome { /** delivery date this outcome is for */ date?: string; standing_order_id: string; account_name: string; status: "placed" | "skipped" | "failed" | "already"; order_id?: string; order_code?: string; error?: string; note?: string; missing?: string[] }

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
      // Household boxes are created one evening earlier (for the day after `date`), so the customer has about a day
      // to pay or skip. `date` itself is processed too: it catches a box subscribed after last night's run, or a
      // missed run. Each (box, date) is claimed once, so the overlap never creates a second order.
      for (const d of so.customer_id ? [date, addDays(date, 1)] : [date]) out.push(...(await runOne(repo, so, d, ctx)));
    } catch (e) {
      // One failure (network, database) must not stop the rest of the evening's run.
      out.push({ standing_order_id: so.id, account_name: so.account_id ?? so.customer_id ?? so.id, status: "failed", error: e instanceof Error ? e.message : String(e) });
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
export function availableLines(so: Pick<StandingOrder, "lines">, account: BusinessAccount | null, ctx: RunContext, areaId: string | null = account?.area_id ?? null) {
  const ok: StandingOrder["lines"] = [];
  const missing: string[] = [];
  for (const l of so.lines) {
    const q = quote({ settings: ctx.settings, products: ctx.products, areas: ctx.areas, promos: [], account, now: nowJakarta() },
      { lines: [{ product_id: "", variant_id: l.variant_id, qty: l.qty, prep_option_id: l.prep_option_id }], area_id: areaId });
    if (q.errors.length) missing.push(q.errors[0]);
    else ok.push(l);
  }
  return { ok, missing };
}

/** Who a standing order is delivered to: a restaurant (its account), or a household (customer + saved address). */
interface Party { label: string; account: BusinessAccount | null; customer_name: string; phone: string; address: string; area_id: string; maps_url: string | null }

async function partyOf(repo: Repo, so: StandingOrder): Promise<{ label: string; party: Party | null; error?: string; pause?: string }> {
  if (so.customer_id) {
    const customer = await repo.getCustomer(so.customer_id);
    const label = customer ? `${customer.name || `+${customer.phone}`} (rumah tangga)` : so.customer_id;
    if (!customer) return { label, party: null, error: "Akun pelanggan sudah dihapus." };
    const address = (await repo.listAddresses(customer.id)).find((a) => a.id === so.address_id);
    if (!address || !address.area_id) return { label, party: null, error: "Alamat pengiriman kotak sudah dihapus atau belum memiliki wilayah.", pause: "address" };
    return { label, party: { label, account: null, customer_name: address.recipient || customer.name || "Pelanggan", phone: customer.phone, address: address.address, area_id: address.area_id, maps_url: address.maps_url } };
  }
  const account = so.account_id ? await repo.getAccount(so.account_id) : null;
  const label = account?.business_name ?? so.account_id ?? so.id;
  if (!account || account.status !== "approved" || !account.area_id) return { label, party: null, error: "Akun bisnis tidak aktif atau belum memiliki wilayah pengiriman." };
  return { label, party: { label, account, customer_name: account.business_name, phone: account.phone, address: account.address, area_id: account.area_id, maps_url: null } };
}

/** A household box whose last two orders were both cancelled unpaid is paused, so it stops holding stock and delivery slots. */
async function twoUnpaidInARow(repo: Repo, so: StandingOrder): Promise<boolean> {
  const recent = (await repo.listStandingRuns({ standingOrderId: so.id, limit: 6 })).filter((r) => r.order_id && r.created_at > so.updated_at).slice(0, 2);
  if (recent.length < 2) return false;
  const orders = await Promise.all(recent.map((r) => repo.getOrder(r.order_id!)));
  return orders.every((o) => o && o.status === "cancelled" && o.history.some((h) => h.status === "cancelled" && h.note?.startsWith("Dibatalkan otomatis")));
}

async function runOne(repo: Repo, so: StandingOrder, date: string, ctx: RunContext): Promise<RunOutcome[]> {
  const productOf = (variantId: string) => ctx.products.find((p) => p.variants.some((v) => v.id === variantId))?.id ?? "";
  const out: RunOutcome[] = [];
  const box = Boolean(so.customer_id);
  if (!isDue(so, date)) {
    if (so.status === "active" && onSchedule(so, date)) out.push({ date, standing_order_id: so.id, account_name: (await partyOf(repo, so)).label, status: "skipped" });
    return out;
  }
  const { label: name, party, error: partyError, pause } = await partyOf(repo, so);
  const unpaid = box && party ? await twoUnpaidInARow(repo, so) : false;
  const run = await repo.claimStandingRun(so.id, date);
  if (!run) { out.push({ date, standing_order_id: so.id, account_name: name, status: "already" }); return out; }
  if (!party || unpaid) {
    const error = unpaid ? "Dijeda otomatis: dua kotak terakhir tidak dibayar sampai batas waktu." : partyError ?? "Pelanggan tidak ditemukan.";
    if (unpaid || pause) await repo.setStandingOrderStatus(so.id, "paused", unpaid ? "unpaid" : pause);
    await repo.finishStandingRun(run.id, { error });
    out.push({ date, standing_order_id: so.id, account_name: name, status: "failed", error });
    return out;
  }
  // Partial delivery: a sold-out item is left out and noted, the rest of the order still goes out.
  let { ok: lines, missing } = availableLines(so, party.account, ctx, party.area_id);
  let res: Awaited<ReturnType<Repo["placeOrder"]>> = { ok: false, error: "" };
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!lines.length) { res = { ok: false, error: `Semua produk dalam ${box ? "kotak" : "pesanan rutin"} ini tidak tersedia malam ini.` }; break; }
    const note = `${box ? "Kotak mingguan" : "Pesanan rutin"}: ${so.name}${so.note ? ` · ${so.note}` : ""}${missing.length ? ` · Tidak tersedia malam ini: ${missing.join(" ")}` : ""}`;
    res = await repo.placeOrder({
      lines: lines.map((l) => ({ product_id: productOf(l.variant_id), variant_id: l.variant_id, qty: l.qty, prep_option_id: l.prep_option_id })),
      customer_name: party.customer_name,
      phone: party.phone,
      address: party.address,
      area_id: party.area_id,
      maps_url: party.maps_url ?? undefined,
      delivery_date: date,
      slot_id: so.slot_id,
      payment_method: so.payment_method,
      customer_note: note.slice(0, 400),
      // the same run never creates two orders, even if it is retried after a crash or a lost response
      client_ref: `so:${so.id}:${date}`,
    }, party.account);
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
    // A box with a known total is paid by the cut-off on the evening before delivery (about a day), not within two hours.
    if (box && res.data.pay_by) await repo.setOrderPayBy(res.data.id, boxPayBy(date, ctx.settings));
    await repo.finishStandingRun(run.id, { order_id: res.data.id, order_code: res.data.code, note: note ?? null });
    out.push({ date, standing_order_id: so.id, account_name: name, status: "placed", order_id: res.data.id, order_code: res.data.code, note, missing });
  } else {
    const error = missing.length && !res.error.startsWith("Semua produk") ? `${res.error} (Tidak tersedia: ${missing.join(" ")})` : res.error;
    await repo.finishStandingRun(run.id, { error, note: note ?? null });
    out.push({ date, standing_order_id: so.id, account_name: name, status: "failed", error });
  }
  return out;
}

/** Tomorrow's date in Jakarta: the delivery date the evening job prepares (independent of the cut-off setting). */
export function jakartaTomorrow(now: { date: string }): string {
  return addDays(now.date, 1);
}

export type { StandingOrder, StandingOrderRun, Result };
