// In-memory adapter used when Supabase is not configured (local review, previews).
// It applies the same business rules as the SQL functions, via src/lib/pricing.ts.

import type {
  AppError,
  GatewayOutcome,
  Payment,
  WaMessage,
  Customer,
  CustomerAddress,
  JobRun,
  AccountApplication,
  BusinessAccount,
  BuyingLine,
  Category,
  DailySummary,
  DeliveryArea,
  DeliverySlot,
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  PlaceOrderInput,
  Product,
  Promo,
  Settings,
  StandingOrder,
  StandingOrderRun,
  Variant,
} from "../types";
import type { OrderFilter, Repo, Result, SalesRow } from "./repo";
import { seedAccounts, seedAreas, seedCategories, seedProducts, seedPromos, seedSettings, seedSlots } from "./seed";
import { availableDates, lineTotal, quote, segmentOf, slotsForSegment, unitPrice } from "../pricing";
import { addDays, isValidPhone, jam, jamRange, normalizePhone, nowJakarta } from "../format";
import { newId, orderCode, randomCode, sessionToken } from "../ids";
import { TEXT_LIMITS, paymentChangeError, safeMapsUrl, statusChangeError, weighError } from "../orderRules";

interface Store {
  settings: Settings;
  categories: Category[];
  products: Product[];
  areas: DeliveryArea[];
  slots: DeliverySlot[];
  promos: Promo[];
  accounts: BusinessAccount[];
  sessions: Map<string, { account_id: string; expires: number }>;
  orders: Order[];
  standing: StandingOrder[];
  standingRuns: StandingOrderRun[];
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

function buildStore(): Store {
  const store: Store = {
    settings: clone(seedSettings),
    categories: clone(seedCategories),
    products: clone(seedProducts),
    areas: clone(seedAreas),
    slots: clone(seedSlots),
    promos: clone(seedPromos),
    accounts: clone(seedAccounts),
    sessions: new Map(),
    orders: [],
    standing: [],
    standingRuns: [],
  };
  seedDemoOrders(store);
  // Demo standing order: the seafood restaurant's Monday / Wednesday / Friday kitchen order.
  const now = new Date().toISOString();
  store.standing.push({
    id: "so_bahari", account_id: "ba_bahari", name: "Stok ikan Sen–Rab–Jum", weekdays: [1, 3, 5], slot_id: "s_dapur", payment_method: "terms",
    lines: [{ variant_id: "v_kakap_l", qty: 5, prep_option_id: "pp_kakap_siangi" }, { variant_id: "v_udang_40", qty: 3, prep_option_id: null }, { variant_id: "v_telur_tray", qty: 2, prep_option_id: null }],
    status: "active", skip_dates: [], note: null, created_at: now, updated_at: now,
  });
  return store;
}

function itemFrom(store: Store, variantId: string, qty: number, prepId: string | null, segment: "retail" | "business", account: BusinessAccount | null): OrderItem {
  const product = store.products.find((p) => p.variants.some((v) => v.id === variantId))!;
  const variant = product.variants.find((v) => v.id === variantId)!;
  const prep = prepId ? product.prep_options.find((p) => p.id === prepId) ?? null : null;
  const base = unitPrice(variant, segment, account);
  const unit_price = base + (prep?.surcharge ?? 0);
  return {
    id: newId("oi"),
    order_id: "",
    product_id: product.id,
    variant_id: variant.id,
    category_id: product.category_id,
    product_name: product.name,
    variant_label: variant.label,
    unit: variant.unit,
    storage_class: product.storage_class,
    is_catch_weight: product.is_catch_weight,
    qty_ordered: qty,
    qty_final: null,
    unit_price,
    prep_option_id: prep?.id ?? null,
    prep_label: prep?.label ?? null,
    prep_surcharge: prep?.surcharge ?? 0,
    unit_cost: variant.cost,
    line_total_est: lineTotal(unit_price, qty),
    line_total_final: null,
  };
}

function seedDemoOrders(store: Store) {
  const tomorrow = addDays(nowJakarta().date, 1);
  const mk = (
    code: string,
    account: BusinessAccount | null,
    customer: { name: string; phone: string; address: string; area_id: string },
    slot_id: string,
    payment_method: Order["payment_method"],
    status: OrderStatus,
    lines: Array<[string, number, string | null]>,
    createdHoursAgo: number,
    note = "",
  ) => {
    const segment = segmentOf(account);
    const items = lines.map(([vid, q, pp]) => itemFrom(store, vid, q, pp, segment, account));
    const subtotal = items.reduce((s, i) => s + i.line_total_est, 0);
    const area = store.areas.find((a) => a.id === customer.area_id)!;
    const slot = store.slots.find((s) => s.id === slot_id)!;
    const fee = subtotal >= (segment === "business" ? store.settings.free_delivery_business : store.settings.free_delivery_retail) ? 0 : area.fee;
    const created = new Date(Date.now() - createdHoursAgo * 3600_000).toISOString();
    const id = newId("o");
    const o: Order = {
      id,
      code,
      segment,
      account_id: account?.id ?? null,
      customer_name: customer.name,
      phone: customer.phone,
      address: customer.address,
      area_id: area.id,
      area_name: area.name,
      maps_url: null,
      delivery_date: tomorrow,
      slot_id: slot.id,
      slot_label: `${slot.label} ${jamRange(slot.start_time, slot.end_time)}`,
      payment_method,
      payment_status: payment_method === "terms" || payment_method === "cod" ? "unpaid" : "unpaid",
      status,
      subtotal_est: subtotal,
      discount: 0,
      delivery_fee: fee,
      total_est: subtotal + fee,
      subtotal_final: null,
      total_final: null,
      has_catch_weight: items.some((i) => i.is_catch_weight),
      weighed_at: null,
      promo_code: null,
      customer_note: note,
      internal_note: "",
      created_at: created,
      history: [{ status: "new", at: created }, ...(status !== "new" ? [{ status, at: new Date(Date.now() - (createdHoursAgo - 1) * 3600_000).toISOString() }] : [])],
      items: items.map((i) => ({ ...i, order_id: id })),
    };
    store.orders.push(o);
  };
  const bahari = store.accounts[0];
  const minang = store.accounts[1];
  mk(`DP-${tomorrow.replace(/-/g, "").slice(2)}-BHR1`, bahari, { name: bahari.business_name, phone: bahari.phone, address: bahari.address, area_id: "a_utara" }, "s_dapur", "terms", "confirmed",
    [["v_kakap_l", 6, "pp_kakap_siangi"], ["v_kerapu", 3, "pp_kerapu_siangi"], ["v_cumi", 4, "pp_cumi_bersih"], ["v_udang_40", 3, null], ["v_telur_peti", 1, null]], 14, "Kakap tolong yang 1,5 kg ke atas.");
  mk(`DP-${tomorrow.replace(/-/g, "").slice(2)}-MNG1`, minang, { name: minang.business_name, phone: minang.phone, address: minang.address, area_id: "a_utara" }, "s_dapur", "cod", "confirmed",
    [["v_kembung", 8, "pp_kembung_siangi"], ["v_tongkol", 5, null], ["v_ayam8", 6, null], ["v_minyak_18l", 1, null], ["v_telur_tray", 4, null]], 12);
  mk(`DP-${tomorrow.replace(/-/g, "").slice(2)}-RT01`, null, { name: "Ibu Dewi", phone: "6281300000011", address: "Apartemen Taman Anggrek Tower 2, Jakarta Barat", area_id: "a_barat_timur" }, "s_pagi", "qris", "new",
    [["v_udang_60", 1, "pp_udang_kupas"], ["v_dada", 2, null], ["v_nugget", 1, null], ["v_salmon", 2, null]], 3, "Titip ke resepsionis jika tidak ada di rumah.");
  mk(`DP-${tomorrow.replace(/-/g, "").slice(2)}-RT02`, null, { name: "Bapak Arif", phone: "6281300000012", address: "Jl. Senopati No. 21, Jakarta Selatan", area_id: "a_selatan" }, "s_sore", "transfer", "new",
    [["v_udang_beku", 2, null], ["v_dori", 1, null], ["v_sosis", 2, null], ["v_kecap_520", 1, null]], 1);
  store.orders[3].payment_status = "awaiting_confirmation";
}

declare global {
  // eslint-disable-next-line no-var
  var __dipasariaStore: Store | undefined;
}

function getStore(): Store {
  if (!globalThis.__dipasariaStore) globalThis.__dipasariaStore = buildStore();
  return globalThis.__dipasariaStore;
}

// Kept on globalThis like the store: Next.js may load this module once per route bundle, and these must be shared.
const g = globalThis as typeof globalThis & { __dpMem?: { loginFailures: Map<string, number[]>; rateHits: Map<string, number[]>; errorLog: Map<string, AppError>; jobs: Map<string, JobRun>; payments: Payment[]; wa: WaMessage[]; customers: Customer[]; addresses: CustomerAddress[]; csessions: Map<string, { customer_id: string; expires: number }>; codes: Map<string, { hash: string; expires: number; attempts: number; created: number }> } };
g.__dpMem ??= { loginFailures: new Map(), rateHits: new Map(), errorLog: new Map(), jobs: new Map(), payments: [], wa: [], customers: [], addresses: [], csessions: new Map(), codes: new Map() };
g.__dpMem.payments ??= [];
g.__dpMem.wa ??= [];
g.__dpMem.customers ??= [];
g.__dpMem.addresses ??= [];
g.__dpMem.csessions ??= new Map();
g.__dpMem.codes ??= new Map();
const { loginFailures, rateHits, errorLog, jobs, payments, wa, customers, addresses, csessions, codes } = g.__dpMem;
const cancelOpenPayments = (orderId: string) => { for (const p of payments) if (p.order_id === orderId && p.status === "pending") p.status = "cancelled"; };
const rp = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

/** Same rule as place_order in SQL: households paying a known total by transfer/QRIS pay within the window, before the delivery day starts. */
function payByFor(o: Pick<Order, "segment" | "payment_method" | "has_catch_weight" | "delivery_date">, settings: Settings, nowMs = Date.now()): string | null {
  const win = settings.payment_window_minutes ?? 0;
  if (o.segment !== "retail" || (o.payment_method !== "transfer" && o.payment_method !== "qris") || o.has_catch_weight || win <= 0) return null;
  const dayStart = Date.parse(`${o.delivery_date}T00:00:00+07:00`);
  return new Date(Math.min(nowMs + win * 60_000, dayStart)).toISOString();
}
const ok = <T,>(data: T): Result<T> => ({ ok: true, data });
const fail = <T,>(error: string): Result<T> => ({ ok: false, error });

/** Re-price after weighing with the terms agreed at order time: the fee never goes up, the promo uses its saved type and value. */
function recomputeTotals(o: Order) {
  const weighed = o.items.every((i) => !i.is_catch_weight || i.qty_final !== null);
  if (!weighed) return;
  const subtotal = o.items.reduce((s, i) => s + (i.line_total_final ?? i.line_total_est), 0);
  let fee = o.delivery_fee;
  let discount = 0;
  if (o.promo_type === "percent") discount = Math.round((subtotal * (o.promo_value ?? 0)) / 100);
  else if (o.promo_type === "fixed") discount = Math.min(o.promo_value ?? 0, subtotal);
  else if (o.promo_type === "free_delivery") fee = 0;
  else if (o.promo_code) discount = Math.min(o.discount, subtotal);
  o.subtotal_final = subtotal;
  o.discount = discount;
  o.delivery_fee = fee;
  o.total_final = Math.max(0, subtotal - discount + fee);
}

export const memoryRepo: Repo = {
  mode: "memory",

  async getSettings() { return clone(getStore().settings); },
  async getCategories() { return clone(getStore().categories).sort((a, b) => a.sort - b.sort); },
  async getProducts(opts) {
    const ps = getStore().products.filter((p) => opts?.includeInactive || p.is_active);
    return clone(ps).sort((a, b) => a.sort - b.sort).map((p) => ({ ...p, variants: p.variants.filter((v) => opts?.includeInactive || v.is_active).sort((a, b) => a.sort - b.sort).map((v) => (opts?.includeCost ? v : { ...v, cost: 0 })) }));
  },
  async getProductBySlug(slug) {
    const p = getStore().products.find((x) => x.slug === slug && x.is_active);
    return p ? { ...clone(p), variants: clone(p).variants.map((v) => ({ ...v, cost: 0 })) } : null;
  },
  async getAreas(opts) { return clone(getStore().areas.filter((a) => opts?.includeInactive || a.is_active)).sort((a, b) => a.sort - b.sort); },
  async getSlots(opts) { return clone(getStore().slots.filter((s) => opts?.includeInactive || s.is_active)).sort((a, b) => a.sort - b.sort); },
  async getPromoByCode(code) {
    const p = getStore().promos.find((x) => x.code.toUpperCase() === code.trim().toUpperCase());
    return p ? clone(p) : null;
  },
  async getSlotUsage(dates) {
    const out: Record<string, number> = {};
    for (const o of getStore().orders) {
      if (o.status === "cancelled" || !dates.includes(o.delivery_date)) continue;
      const k = `${o.delivery_date}|${o.slot_id}`;
      out[k] = (out[k] ?? 0) + 1;
    }
    return out;
  },

  async hasOrderedBefore(phone) {
    const p = normalizePhone(phone);
    return getStore().orders.some((o) => o.phone === p && o.status !== "cancelled");
  },

  async placeOrder(input, account) {
    const store = getStore();
    const now = nowJakarta();
    const segment = segmentOf(account);
    // Idempotency: a retried or double-tapped submit returns the order already created for this checkout.
    const ref = input.client_ref?.trim();
    if (ref) {
      if (ref.length > 64) return fail("Permintaan tidak valid.");
      const existing = store.orders.find((o) => o.client_ref === ref);
      if (existing) return ok(clone(existing));
    }
    if (!input.customer_name?.trim()) return fail("Nama penerima wajib diisi.");
    if (!isValidPhone(input.phone)) return fail("Nomor WhatsApp tidak valid.");
    if (!input.address?.trim()) return fail("Alamat pengiriman wajib diisi.");
    if (!input.lines?.length) return fail("Keranjang Anda masih kosong.");
    if (input.customer_name.length > TEXT_LIMITS.name || input.address.length > TEXT_LIMITS.address || (input.customer_note ?? "").length > TEXT_LIMITS.note) {
      return fail("Teks terlalu panjang. Nama maksimal 80, alamat dan catatan maksimal 400 karakter.");
    }
    const phone = normalizePhone(input.phone);
    const isFirst = !(await this.hasOrderedBefore(phone));
    const q = quote(
      { settings: store.settings, products: store.products, areas: store.areas, promos: store.promos, account, now, isFirstOrder: isFirst },
      { lines: input.lines, area_id: input.area_id, promo_code: input.promo_code },
    );
    if (q.errors.length) return fail(q.errors[0]);
    if (!q.min_order_met) return fail(`Pesanan belum mencapai minimal pesanan Rp${q.min_order.toLocaleString("id-ID")}.`);
    if (input.promo_code && q.promo_error) return fail(q.promo_error);
    const area = store.areas.find((a) => a.id === input.area_id && a.is_active);
    if (!area) return fail("Wilayah pengiriman tidak valid.");
    if (!availableDates(store.settings, now).includes(input.delivery_date)) return fail(`Tanggal pengiriman tidak tersedia. Batas pemesanan untuk pengiriman besok pukul ${jam(store.settings.cutoff_time)} WIB.`);
    const slot = slotsForSegment(store.slots, segment).find((s) => s.id === input.slot_id);
    if (!slot) return fail("Jam pengiriman ini tidak tersedia untuk pesanan Anda.");
    const used = (await this.getSlotUsage([input.delivery_date]))[`${input.delivery_date}|${slot.id}`] ?? 0;
    if (used >= slot.capacity) return fail("Kuota jam pengiriman ini sudah penuh. Silakan pilih jam lain.");
    const pm = input.payment_method;
    if (!["qris", "transfer", "cod", "terms"].includes(pm)) return fail("Metode pembayaran tidak valid.");
    if (pm === "cod" && !(segment === "business" && account?.allow_cod)) return fail("Bayar di tempat (COD) hanya tersedia untuk akun bisnis yang telah disetujui.");
    if (pm === "terms" && !(segment === "business" && account && account.payment_terms !== "prepaid")) return fail("Pembayaran tempo hanya tersedia untuk akun bisnis dengan fasilitas tempo.");

    // Reserve stock
    for (const l of q.lines) {
      if (l.variant.stock_qty !== null) {
        const v = store.products.find((p) => p.id === l.product.id)!.variants.find((x) => x.id === l.variant.id)!;
        v.stock_qty = (v.stock_qty ?? 0) - l.qty;
      }
    }
    if (q.promo) {
      const pr = store.promos.find((p) => p.id === q.promo!.id)!;
      pr.used_count += 1;
    }
    const id = newId("o");
    const created = new Date().toISOString();
    const items: OrderItem[] = q.lines.map((l) => ({
      id: newId("oi"),
      order_id: id,
      product_id: l.product.id,
      variant_id: l.variant.id,
      category_id: l.product.category_id,
      product_name: l.product.name,
      variant_label: l.variant.label,
      unit: l.variant.unit,
      storage_class: l.product.storage_class,
      is_catch_weight: l.product.is_catch_weight,
      qty_ordered: l.qty,
      qty_final: null,
      unit_price: l.unit_price,
      prep_option_id: l.prep?.id ?? null,
      prep_label: l.prep?.label ?? null,
      prep_surcharge: l.prep?.surcharge ?? 0,
      unit_cost: l.variant.cost,
      line_total_est: l.line_total,
      line_total_final: null,
    }));
    const order: Order = {
      id,
      code: orderCode(input.delivery_date),
      segment,
      account_id: account?.id ?? null,
      customer_name: input.customer_name.trim(),
      phone,
      address: input.address.trim(),
      area_id: area.id,
      area_name: area.name,
      maps_url: safeMapsUrl(input.maps_url),
      delivery_date: input.delivery_date,
      slot_id: slot.id,
      slot_label: `${slot.label} ${jamRange(slot.start_time, slot.end_time)}`,
      payment_method: pm,
      payment_status: "unpaid",
      status: "new",
      subtotal_est: q.subtotal,
      discount: q.discount,
      delivery_fee: q.delivery_fee,
      total_est: q.total,
      subtotal_final: q.has_catch_weight ? null : q.subtotal,
      total_final: q.has_catch_weight ? null : q.total,
      has_catch_weight: q.has_catch_weight,
      weighed_at: null,
      promo_code: q.promo?.code ?? null,
      promo_type: q.promo?.type ?? null,
      promo_value: q.promo?.value ?? null,
      client_ref: ref || null,
      pay_by: null,
      wa_opt_in: input.wa_opt_in !== false,
      customer_note: input.customer_note?.trim() ?? "",
      internal_note: "",
      created_at: created,
      history: [{ status: "new", at: created }],
      items,
    };
    order.pay_by = payByFor(order, store.settings);
    store.orders.unshift(order);
    return ok(clone(order));
  },

  async lookupOrder(code, phone) {
    const p = normalizePhone(phone);
    const o = getStore().orders.find((x) => x.code.toUpperCase() === code.trim().toUpperCase() && x.phone === p);
    return o ? clone(o) : null;
  },
  async customerConfirmPayment(code, phone) {
    const o = getStore().orders.find((x) => x.code.toUpperCase() === code.trim().toUpperCase() && x.phone === normalizePhone(phone));
    if (!o) return fail("Pesanan tidak ditemukan.");
    // only once the final amount is known (weighed orders are paid on the final invoice)
    if (o.payment_status === "unpaid" && o.total_final !== null && o.status !== "cancelled") {
      o.payment_status = "awaiting_confirmation";
      o.pay_by = null;
    }
    return ok(clone(o));
  },
  async getOrdersForAccount(accountId, limit = 20) {
    return clone(getStore().orders.filter((o) => o.account_id === accountId).slice(0, limit));
  },

  async applyAccount(input) {
    const store = getStore();
    if (!input.business_name?.trim() || !input.contact_name?.trim()) return fail("Nama usaha dan nama kontak wajib diisi.");
    if (!isValidPhone(input.phone)) return fail("Nomor WhatsApp tidak valid.");
    const phone = normalizePhone(input.phone);
    if (store.accounts.some((a) => a.phone === phone)) return fail("Nomor ini sudah terdaftar. Hubungi kami melalui WhatsApp untuk mendapatkan kode akses.");
    const acc: BusinessAccount = {
      id: newId("ba"),
      business_name: input.business_name.trim(),
      contact_name: input.contact_name.trim(),
      phone,
      address: input.address?.trim() ?? "",
      area_id: input.area_id,
      business_type: input.business_type,
      discount_pct: 0,
      payment_terms: "prepaid",
      allow_cod: false,
      status: "pending",
      access_code: null,
      preferred_slot_id: null,
      notes: input.notes?.trim() ?? "",
      applied_at: new Date().toISOString(),
      approved_at: null,
    };
    store.accounts.unshift(acc);
    return ok(clone(acc));
  },
  async businessLogin(phone, code) {
    const store = getStore();
    const p = normalizePhone(phone);
    // Lockout against guessing access codes: 5 failed attempts per phone number in 15 minutes (mirrors SQL business_login).
    const since = Date.now() - 15 * 60_000;
    const recent = (loginFailures.get(p) ?? []).filter((t) => t > since);
    if (recent.length >= 5) throw new Error("Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit atau hubungi kami melalui WhatsApp.");
    const acc = store.accounts.find((a) => a.phone === p && a.status === "approved" && a.access_code && a.access_code.toUpperCase() === code.trim().toUpperCase());
    if (!acc) { loginFailures.set(p, [...recent, Date.now()]); return null; }
    loginFailures.delete(p);
    const token = sessionToken();
    store.sessions.set(token, { account_id: acc.id, expires: Date.now() + 90 * 86400_000 });
    return { token, account: clone(acc) };
  },
  async getAccountBySession(token) {
    const store = getStore();
    const s = store.sessions.get(token);
    if (!s || s.expires < Date.now()) return null;
    const acc = store.accounts.find((a) => a.id === s.account_id && a.status === "approved");
    return acc ? clone(acc) : null;
  },
  async endSession(token) { getStore().sessions.delete(token); },

  async listOrders(filter) {
    let os = getStore().orders.slice();
    if (filter.date) os = os.filter((o) => o.delivery_date === filter.date);
    if (filter.status === "open") os = os.filter((o) => !["completed", "cancelled"].includes(o.status));
    else if (filter.status) os = os.filter((o) => o.status === filter.status);
    if (filter.segment) os = os.filter((o) => o.segment === filter.segment);
    if (filter.q) {
      const q = filter.q.toLowerCase();
      os = os.filter((o) => o.code.toLowerCase().includes(q) || o.customer_name.toLowerCase().includes(q) || o.phone.includes(q));
    }
    os.sort((a, b) => (a.delivery_date + a.slot_label).localeCompare(b.delivery_date + b.slot_label) || a.created_at.localeCompare(b.created_at));
    return clone(os.slice(0, filter.limit ?? 200));
  },
  async getOrder(id) {
    const o = getStore().orders.find((x) => x.id === id);
    return o ? clone(o) : null;
  },
  async updateOrderStatus(id, status, note) {
    const store = getStore();
    const o = store.orders.find((x) => x.id === id);
    if (!o) return fail("Pesanan tidak ditemukan.");
    const err = statusChangeError(o, status);
    if (err) return fail(err);
    if (status === o.status) return ok(clone(o));
    if (status === "cancelled") {
      for (const i of o.items) {
        const v = store.products.find((p) => p.id === i.product_id)?.variants.find((x) => x.id === i.variant_id);
        if (v && v.stock_qty !== null) v.stock_qty += i.qty_ordered;
      }
      if (o.promo_code) { const pr = store.promos.find((p) => p.code === o.promo_code); if (pr) pr.used_count = Math.max(0, pr.used_count - 1); }
      o.payment_status = o.payment_status === "paid" || o.payment_status === "awaiting_confirmation" ? "refund_due" : "void";
      cancelOpenPayments(o.id);
    }
    o.status = status;
    o.history.push({ status, at: new Date().toISOString(), note });
    return ok(clone(o));
  },
  async weighOrder(id, items) {
    const store = getStore();
    const o = store.orders.find((x) => x.id === id);
    if (!o) return fail("Pesanan tidak ditemukan.");
    const blocked = weighError(o);
    if (blocked) return fail(blocked);
    for (const w of items) {
      const it = o.items.find((i) => i.id === w.item_id && i.is_catch_weight);
      if (!it) return fail("Baris pesanan tidak ditemukan.");
      if (typeof w.qty_final !== "number" || !Number.isFinite(w.qty_final) || w.qty_final < 0 || w.qty_final > 500) return fail("Berat tidak valid. Isi berat dalam kg, misalnya 1,25.");
    }
    // every weighed line needs a weight, counting the ones already weighed earlier
    const given = new Map(items.map((w) => [w.item_id, w.qty_final]));
    if (o.items.some((i) => i.is_catch_weight && i.qty_final === null && !given.has(i.id))) return fail("Isi berat semua produk yang ditimbang.");
    for (const it of o.items) {
      const w = given.get(it.id);
      if (w !== undefined) { it.qty_final = w; it.line_total_final = lineTotal(it.unit_price, w); }
    }
    for (const it of o.items) if (!it.is_catch_weight && it.qty_final === null) { it.qty_final = it.qty_ordered; it.line_total_final = it.line_total_est; }
    recomputeTotals(o);
    o.weighed_at = new Date().toISOString();
    o.history.push({ status: "weighed", at: o.weighed_at });
    cancelOpenPayments(o.id); // a QR issued for the previous amount must not be paid any more
    return ok(clone(o));
  },
  async setPaymentStatus(id, status) {
    const o = getStore().orders.find((x) => x.id === id);
    if (!o) return fail("Pesanan tidak ditemukan.");
    const err = paymentChangeError(o, status);
    if (err) return fail(err);
    o.payment_status = status;
    if (status === "paid" || status === "awaiting_confirmation") o.pay_by = null;
    if (status === "paid") o.history.push({ status: "paid", at: new Date().toISOString() });
    return ok(clone(o));
  },
  async updateOrderInternalNote(id, note) {
    const o = getStore().orders.find((x) => x.id === id);
    if (!o) return fail("Pesanan tidak ditemukan.");
    o.internal_note = note;
    return ok(clone(o));
  },
  async dailySummary(date) {
    const store = getStore();
    const os = store.orders.filter((o) => o.delivery_date === date && o.status !== "cancelled");
    const cats = new Map(store.categories.map((c) => [c.id, c]));
    let sales = 0, cost = 0, nonSea = 0, unpaid = 0, toWeigh = 0;
    const by_status: DailySummary["by_status"] = { new: 0, confirmed: 0, packing: 0, delivering: 0, completed: 0, cancelled: 0 };
    for (const o of store.orders.filter((o) => o.delivery_date === date)) by_status[o.status]++;
    for (const o of os) {
      const total = o.total_final ?? o.total_est;
      sales += total;
      for (const i of o.items) {
        const q = i.qty_final ?? i.qty_ordered;
        cost += i.unit_cost * q;
        if (!cats.get(i.category_id)?.is_seafood) nonSea += i.line_total_final ?? i.line_total_est;
      }
      if (o.payment_status !== "paid" && o.payment_status !== "void") unpaid += total;
      if (o.has_catch_weight && !o.weighed_at) toWeigh++;
    }
    // net of promo discounts, so gross profit is what was actually earned
    const productSales = os.reduce((s, o) => s + (o.subtotal_final ?? o.subtotal_est) - o.discount, 0);
    const gp = productSales - cost;
    return {
      date,
      orders_total: os.length,
      orders_retail: os.filter((o) => o.segment === "retail").length,
      orders_business: os.filter((o) => o.segment === "business").length,
      sales,
      est_cost: cost,
      est_gross_profit: gp,
      margin_pct: productSales ? (gp / productSales) * 100 : 0,
      non_seafood_share_pct: productSales ? (nonSea / productSales) * 100 : 0,
      unpaid_amount: unpaid,
      to_weigh: toWeigh,
      by_status,
    };
  },
  async buyingList(date) {
    const store = getStore();
    const map = new Map<string, BuyingLine>();
    const counted = new Set<string>();
    const weighed = new Set<string>();
    for (const o of store.orders.filter((o) => o.delivery_date === date && o.status !== "cancelled")) {
      for (const i of o.items) {
        const k = i.variant_id;
        const p = store.products.find((x) => x.id === i.product_id);
        const line = map.get(k) ?? {
          product_id: i.product_id,
          product_name: i.product_name,
          scientific_name: p?.scientific_name ?? null,
          variant_label: i.variant_label,
          unit: i.unit,
          storage_class: i.storage_class,
          qty: 0,
          qty_with_buffer: 0,
          order_count: 0,
          prep_notes: [],
        };
        line.qty += i.qty_ordered;
        if (!counted.has(`${k}|${o.id}`)) { counted.add(`${k}|${o.id}`); line.order_count++; }
        if (i.is_catch_weight) weighed.add(k);
        if (i.prep_label) line.prep_notes.push(`${o.customer_name}: ${i.prep_label} ${i.qty_ordered} ${i.unit}`);
        map.set(k, line);
      }
    }
    const buf = store.settings.catch_weight_buffer_pct / 100;
    const out = [...map.values()].map((l) => ({ ...l, qty_with_buffer: [...weighed].some((k) => map.get(k) === l) ? Math.ceil(l.qty * (1 + buf) * 2) / 2 : l.qty }));
    const order = { chilled: 0, frozen: 1, ambient: 2 };
    return out.sort((a, b) => order[a.storage_class] - order[b.storage_class] || a.product_name.localeCompare(b.product_name));
  },
  async salesReport(from, to) {
    const store = getStore();
    const cats = new Map(store.categories.map((c) => [c.id, c]));
    const rows = new Map<string, SalesRow>();
    for (const o of store.orders) {
      if (o.status === "cancelled" || o.delivery_date < from || o.delivery_date > to) continue;
      const r = rows.get(o.delivery_date) ?? { date: o.delivery_date, orders: 0, sales: 0, gross_profit: 0, non_seafood_sales: 0 };
      r.orders++;
      r.sales += o.total_final ?? o.total_est;
      r.gross_profit -= o.discount;
      for (const i of o.items) {
        const q = i.qty_final ?? i.qty_ordered;
        const line = i.line_total_final ?? i.line_total_est;
        r.gross_profit += line - i.unit_cost * q;
        if (!cats.get(i.category_id)?.is_seafood) r.non_seafood_sales += line;
      }
      rows.set(o.delivery_date, r);
    }
    return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
  },

  async listAccounts() {
    return clone(getStore().accounts).sort((a, b) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1) || b.applied_at.localeCompare(a.applied_at));
  },
  async getAccount(id) {
    const a = getStore().accounts.find((x) => x.id === id);
    return a ? clone(a) : null;
  },
  async approveAccount(id, patch) {
    const a = getStore().accounts.find((x) => x.id === id);
    if (!a) return fail("Akun tidak ditemukan.");
    Object.assign(a, patch, { status: "approved", approved_at: a.approved_at ?? new Date().toISOString(), access_code: a.access_code ?? randomCode(6) });
    return ok(clone(a));
  },
  async updateAccount(id, patch) {
    const a = getStore().accounts.find((x) => x.id === id);
    if (!a) return fail("Akun tidak ditemukan.");
    const { id: _id, ...rest } = patch;
    void _id;
    Object.assign(a, rest);
    return ok(clone(a));
  },
  async regenerateAccessCode(id) {
    const a = getStore().accounts.find((x) => x.id === id);
    if (!a) return fail("Akun tidak ditemukan.");
    a.access_code = randomCode(6);
    return ok(clone(a));
  },

  async upsertProduct(p) {
    const store = getStore();
    const existing = store.products.find((x) => x.id === p.id);
    if (existing) {
      Object.assign(existing, p, { variants: existing.variants, prep_options: existing.prep_options });
      return ok(clone(existing));
    }
    const np: Product = { ...p, variants: [], prep_options: [] };
    store.products.push(np);
    return ok(clone(np));
  },
  async updateVariant(id, patch) {
    for (const p of getStore().products) {
      const v = p.variants.find((x) => x.id === id);
      if (v) {
        const { id: _id, product_id: _pid, ...rest } = patch;
        void _id; void _pid;
        Object.assign(v, rest);
        return ok(clone(v));
      }
    }
    return fail("Varian tidak ditemukan.");
  },
  async createVariant(v) {
    const p = getStore().products.find((x) => x.id === v.product_id);
    if (!p) return fail("Produk tidak ditemukan.");
    const nv: Variant = { ...v, id: newId("v") };
    p.variants.push(nv);
    return ok(clone(nv));
  },
  async setProductAvailability(productId, available) {
    const p = getStore().products.find((x) => x.id === productId);
    if (!p) return fail("Produk tidak ditemukan.");
    p.available_today = available;
    return ok(undefined);
  },
  async upsertPrepOption(po) {
    const p = getStore().products.find((x) => x.id === po.product_id);
    if (!p) return fail("Produk tidak ditemukan.");
    const ex = p.prep_options.find((x) => x.id === po.id);
    if (ex) Object.assign(ex, po); else p.prep_options.push({ ...po, id: po.id || newId("pp") });
    return ok(undefined);
  },
  async deletePrepOption(id) {
    for (const p of getStore().products) p.prep_options = p.prep_options.filter((x) => x.id !== id);
    return ok(undefined);
  },

  async listPromos() { return clone(getStore().promos); },
  async upsertPromo(pr) {
    const store = getStore();
    const ex = store.promos.find((x) => x.id === pr.id);
    const dup = store.promos.find((x) => x.code.toUpperCase() === pr.code.toUpperCase() && x.id !== pr.id);
    if (dup) return fail("Kode promo sudah dipakai.");
    if (ex) Object.assign(ex, pr); else store.promos.push({ ...pr, id: pr.id || newId("pr") });
    return ok(clone(store.promos.find((x) => x.code === pr.code)!));
  },
  async deletePromo(id) {
    const store = getStore();
    store.promos = store.promos.filter((x) => x.id !== id);
    return ok(undefined);
  },

  async updateSettings(patch) {
    const s = getStore().settings;
    Object.assign(s, patch);
    return ok(clone(s));
  },
  async upsertArea(a) {
    const store = getStore();
    const ex = store.areas.find((x) => x.id === a.id);
    if (ex) Object.assign(ex, a); else store.areas.push({ ...a, id: a.id || newId("a") });
    return ok(clone(a));
  },
  async upsertSlot(s) {
    const store = getStore();
    const ex = store.slots.find((x) => x.id === s.id);
    if (ex) Object.assign(ex, s); else store.slots.push({ ...s, id: s.id || newId("s") });
    return ok(clone(s));
  },

  async listStandingOrders(filter) {
    const list = getStore().standing.filter((s) => !filter?.accountId || s.account_id === filter.accountId);
    return clone(list).sort((a, b) => a.created_at.localeCompare(b.created_at));
  },
  async saveStandingOrder(accountId, input) {
    const store = getStore();
    const now = new Date().toISOString();
    const lines = input.lines.filter((l) => l.qty > 0).map((l) => ({ variant_id: l.variant_id, qty: l.qty, prep_option_id: l.prep_option_id ?? null }));
    const weekdays = [...new Set(input.weekdays)].sort();
    const name = input.name.trim() || "Pesanan rutin";
    if (input.id) {
      const ex = store.standing.find((s) => s.id === input.id && s.account_id === accountId);
      if (!ex) return fail("Pesanan rutin tidak ditemukan.");
      Object.assign(ex, { name, weekdays, slot_id: input.slot_id, payment_method: input.payment_method, lines, note: input.note ?? null, updated_at: now });
      return ok(clone(ex));
    }
    const so: StandingOrder = { id: newId("so"), account_id: accountId, name, weekdays, slot_id: input.slot_id, payment_method: input.payment_method, lines, status: "active", skip_dates: [], note: input.note ?? null, created_at: now, updated_at: now };
    store.standing.push(so);
    return ok(clone(so));
  },
  async setStandingOrderStatus(id, status) {
    const so = getStore().standing.find((s) => s.id === id);
    if (!so) return fail("Pesanan rutin tidak ditemukan.");
    so.status = status; so.updated_at = new Date().toISOString();
    return ok(clone(so));
  },
  async setStandingSkip(id, date, skip) {
    const so = getStore().standing.find((s) => s.id === id);
    if (!so) return fail("Pesanan rutin tidak ditemukan.");
    so.skip_dates = skip ? [...new Set([...so.skip_dates, date])].sort() : so.skip_dates.filter((d) => d !== date);
    so.updated_at = new Date().toISOString();
    return ok(clone(so));
  },
  async deleteStandingOrder(id) {
    const store = getStore();
    store.standing = store.standing.filter((s) => s.id !== id);
    store.standingRuns = store.standingRuns.filter((r) => r.standing_order_id !== id);
    return ok(undefined);
  },
  async listStandingRuns(filter) {
    const runs = getStore().standingRuns.filter((r) => (!filter?.date || r.delivery_date === filter.date) && (!filter?.standingOrderId || r.standing_order_id === filter.standingOrderId));
    return clone(runs).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, filter?.limit ?? 100);
  },
  async claimStandingRun(standingOrderId, date) {
    const store = getStore();
    const prev = store.standingRuns.find((r) => r.standing_order_id === standingOrderId && r.delivery_date === date);
    // a run that failed may be retried (after the problem is fixed); one that placed an order, or is in progress, may not
    if (prev && prev.order_id === null && prev.error !== null) { prev.error = null; prev.created_at = new Date().toISOString(); return clone(prev); }
    if (prev) return null;
    const run: StandingOrderRun = { id: newId("sr"), standing_order_id: standingOrderId, delivery_date: date, order_id: null, order_code: null, error: null, note: null, created_at: new Date().toISOString() };
    store.standingRuns.push(run);
    return clone(run);
  },
  async finishStandingRun(runId, patch) {
    const run = getStore().standingRuns.find((r) => r.id === runId);
    if (run) Object.assign(run, { order_id: patch.order_id ?? null, order_code: patch.order_code ?? null, error: patch.error ?? null, note: patch.note ?? null });
  },

  async hitRateLimit(key, windowSeconds, max) {
    const since = Date.now() - windowSeconds * 1000;
    const recent = (rateHits.get(key) ?? []).filter((t) => t > since);
    if (recent.length >= max) { rateHits.set(key, recent); return false; }
    recent.push(Date.now());
    rateHits.set(key, recent);
    return true;
  },
  async expireUnpaidOrders() {
    const now = Date.now();
    const due = getStore().orders.filter((o) => o.pay_by && Date.parse(o.pay_by) < now && o.payment_status === "unpaid" && (o.status === "new" || o.status === "confirmed"));
    for (const o of due) await this.updateOrderStatus(o.id, "cancelled", "Dibatalkan otomatis: pembayaran belum diterima sampai batas waktu.");
    jobs.set("expire_unpaid", { job: "expire_unpaid", last_at: new Date().toISOString(), result: `${due.length} dibatalkan` });
    return due.length;
  },
  async setOrderPayBy(id, payBy) {
    const o = getStore().orders.find((x) => x.id === id);
    if (!o) return fail("Pesanan tidak ditemukan.");
    o.pay_by = payBy;
    return ok(clone(o));
  },
  async logError(e) {
    const fp = `${e.source}|${e.message.slice(0, 300)}|${e.path ?? ""}`;
    const now = new Date().toISOString();
    const cur = errorLog.get(fp);
    if (!cur || cur.resolved) {
      errorLog.set(fp, { fingerprint: fp, source: e.source, message: e.message.slice(0, 1000), path: (e.path ?? "").slice(0, 300), digest: e.digest ?? null, detail: e.detail?.slice(0, 4000) ?? null, count: 1, first_at: now, last_at: now, resolved: false });
      return 1;
    }
    Object.assign(cur, { count: cur.count + 1, last_at: now, digest: e.digest ?? null, detail: e.detail?.slice(0, 4000) ?? null });
    return cur.count;
  },
  async listErrors(opts) {
    return clone([...errorLog.values()].filter((e) => opts?.includeResolved || !e.resolved).sort((a, b) => b.last_at.localeCompare(a.last_at)).slice(0, opts?.limit ?? 100));
  },
  async resolveErrors(fingerprints) {
    for (const e of errorLog.values()) if (fingerprints === "all" || fingerprints.includes(e.fingerprint)) e.resolved = true;
  },
  async recordJob(job, result) {
    jobs.set(job, { job, last_at: new Date().toISOString(), result });
  },
  async listJobs() {
    return clone([...jobs.values()]);
  },
  async ping() {
    return true;
  },

  async createPayment(p) {
    const row: Payment = { ...p, status: "pending", amount_paid: null, created_at: new Date().toISOString(), paid_at: null };
    payments.push(row);
    return clone(row);
  },
  async listPayments(orderId) {
    return clone(payments.filter((p) => p.order_id === orderId).sort((a, b) => b.created_at.localeCompare(a.created_at)));
  },
  async getPayment(id) {
    const p = payments.find((x) => x.id === id);
    return p ? clone(p) : null;
  },
  async recordGatewayPayment(id, status, amount): Promise<GatewayOutcome> {
    const pay = payments.find((x) => x.id === id);
    if (!pay) throw new Error("Pembayaran tidak ditemukan.");
    if (pay.status === "paid" || status === "pending") return "noop";
    if (status !== "paid") { if (pay.status === "pending") pay.status = status; return "updated"; }
    Object.assign(pay, { status: "paid", paid_at: new Date().toISOString(), amount_paid: amount });
    const o = getStore().orders.find((x) => x.id === pay.order_id)!;
    const note = (s: string) => { o.internal_note = [o.internal_note, `[QRIS] ${s}`].filter(Boolean).join("\n"); };
    const paid = amount ?? 0;
    if (o.status === "cancelled") { o.payment_status = "refund_due"; note(`${rp(paid)} diterima (${id}) setelah pesanan dibatalkan. Kembalikan dana ke pelanggan.`); return "late"; }
    if (o.payment_status === "paid") { note(`Pembayaran ganda ${rp(paid)} (${id}). Kembalikan kelebihan dana.`); return "duplicate"; }
    if (o.total_final === null || paid !== o.total_final) {
      o.payment_status = "awaiting_confirmation"; o.pay_by = null;
      note(`Diterima ${rp(paid)}, tagihan ${o.total_final === null ? "belum final" : rp(o.total_final)}. Periksa selisih sebelum menandai lunas.`);
      return "mismatch";
    }
    o.payment_status = "paid"; o.pay_by = null;
    o.history.push({ status: "paid", at: new Date().toISOString(), note: "QRIS otomatis" });
    return "paid";
  },

  async enqueueWa(m) {
    if (wa.some((x) => x.order_id === m.order_id && x.kind === m.kind && x.dedupe === m.dedupe)) return null;
    const row: WaMessage = { ...m, provider_id: null, error: null, attempts: 0, created_at: new Date().toISOString(), sent_at: null };
    wa.push(row);
    return clone(row);
  },
  async claimWa(id, attempts) {
    const row = wa.find((x) => x.id === id);
    const stuck = row?.status === "sending" && Date.parse(row.sent_at ?? row.created_at) < Date.now() - 300_000;
    if (!row || row.attempts !== attempts || !(row.status === "queued" || row.status === "failed" || stuck)) return false;
    Object.assign(row, { status: "sending", attempts: attempts + 1, sent_at: new Date().toISOString() });
    return true;
  },
  async updateWa(id, patch) {
    const row = wa.find((x) => x.id === id);
    if (row) Object.assign(row, patch);
  },
  async listWa(orderId) {
    return clone(wa.filter((x) => x.order_id === orderId).sort((a, b) => a.created_at.localeCompare(b.created_at)));
  },
  async listWaRecent(limit, statuses) {
    return clone(wa.filter((x) => !statuses || statuses.includes(x.status)).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit));
  },
  async getWa(id) {
    const row = wa.find((x) => x.id === id);
    return row ? clone(row) : null;
  },
  async listWaPending(limit) {
    const since = Date.now() - 86400_000;
    const stuck = Date.now() - 300_000;
    return clone(wa.filter((x) => (x.status === "queued" || (x.status === "failed" && x.attempts < 3) || (x.status === "sending" && Date.parse(x.sent_at ?? x.created_at) < stuck)) && Date.parse(x.created_at) > since).slice(0, limit));
  },
  async listOrdersPayBySoon(minutes) {
    const now = Date.now(), until = now + minutes * 60_000;
    return clone(getStore().orders.filter((o) => o.pay_by && Date.parse(o.pay_by) > now && Date.parse(o.pay_by) <= until && o.payment_status === "unpaid" && (o.status === "new" || o.status === "confirmed")));
  },
  async customerRequestCode(phone, codeHash) {
    const p = normalizePhone(phone);
    if (!/^62\d{8,13}$/.test(p)) return fail("Nomor WhatsApp tidak valid.");
    const cur = codes.get(p);
    if (cur && Date.now() - cur.created < 60_000) return fail("Kode baru saja dikirim. Tunggu satu menit sebelum meminta lagi.");
    codes.set(p, { hash: codeHash, expires: Date.now() + 600_000, attempts: 0, created: Date.now() });
    return ok(p);
  },
  async customerLogin(phone, codeHash, tokenHash) {
    const p = normalizePhone(phone);
    const c = codes.get(p);
    if (!c || c.expires < Date.now()) return { status: "expired" };
    if (c.attempts >= 5) return { status: "locked" };
    if (c.hash !== codeHash) { c.attempts++; return { status: c.attempts >= 5 ? "locked" : "wrong" }; }
    codes.delete(p);
    let cu = customers.find((x) => x.phone === p);
    if (!cu) { cu = { id: newId("cu"), phone: p, name: "", marketing_opt_in: false, marketing_opt_in_at: null, created_at: new Date().toISOString(), last_login_at: null }; customers.push(cu); }
    cu.last_login_at = new Date().toISOString();
    csessions.set(tokenHash, { customer_id: cu.id, expires: Date.now() + 90 * 86400_000 });
    return { status: "ok", customerId: cu.id };
  },
  async getCustomerBySession(tokenHash) {
    const s = csessions.get(tokenHash);
    if (!s || s.expires < Date.now()) return null;
    const cu = customers.find((x) => x.id === s.customer_id);
    return cu ? clone(cu) : null;
  },
  async endCustomerSession(tokenHash) {
    csessions.delete(tokenHash);
  },
  async updateCustomer(id, patch) {
    const cu = customers.find((x) => x.id === id);
    if (!cu) return null;
    if (patch.name !== undefined) cu.name = patch.name;
    if (patch.marketing_opt_in !== undefined && patch.marketing_opt_in !== cu.marketing_opt_in) { cu.marketing_opt_in = patch.marketing_opt_in; cu.marketing_opt_in_at = patch.marketing_opt_in ? new Date().toISOString() : null; }
    return clone(cu);
  },
  async deleteCustomer(id) {
    const i = customers.findIndex((x) => x.id === id);
    if (i >= 0) customers.splice(i, 1);
    for (let j = addresses.length - 1; j >= 0; j--) if (addresses[j].customer_id === id) addresses.splice(j, 1);
    for (const [k, s] of csessions) if (s.customer_id === id) csessions.delete(k);
  },
  async listCustomers(limit) {
    return clone([...customers].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit));
  },
  async listAddresses(customerId) {
    return clone(addresses.filter((a) => a.customer_id === customerId).sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.created_at.localeCompare(b.created_at)));
  },
  async saveAddress(customerId, a) {
    const mine = addresses.filter((x) => x.customer_id === customerId);
    const existing = a.id ? mine.find((x) => x.id === a.id) : undefined;
    if (a.id && !existing) return fail("Alamat tidak ditemukan.");
    if (!existing && mine.length >= 10) return fail("Maksimal 10 alamat tersimpan.");
    if (a.is_default || mine.length === 0) for (const x of mine) x.is_default = false;
    const row: CustomerAddress = existing ?? { id: newId("ca"), customer_id: customerId, label: "", recipient: "", address: "", area_id: null, maps_url: null, is_default: false, created_at: new Date().toISOString() };
    Object.assign(row, { label: a.label, recipient: a.recipient, address: a.address, area_id: a.area_id, maps_url: safeMapsUrl(a.maps_url), is_default: a.is_default || mine.length === 0 });
    if (!existing) addresses.push(row);
    return ok(clone(row));
  },
  async deleteAddress(customerId, id) {
    const i = addresses.findIndex((x) => x.id === id && x.customer_id === customerId);
    if (i < 0) return;
    const wasDefault = addresses[i].is_default;
    addresses.splice(i, 1);
    const next = addresses.find((x) => x.customer_id === customerId);
    if (wasDefault && next) next.is_default = true;
  },
  async getOrdersByPhone(phone, limit) {
    const p = normalizePhone(phone);
    return clone(getStore().orders.filter((o) => o.phone === p && o.segment === "retail").sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit));
  },
  async listOrdersPastPayBy() {
    const now = Date.now();
    return clone(getStore().orders.filter((o) => o.pay_by && Date.parse(o.pay_by) < now && o.payment_status === "unpaid" && (o.status === "new" || o.status === "confirmed")));
  },
};
