// In-memory adapter used when Supabase is not configured (local review, previews).
// It applies the same business rules as the SQL functions, via src/lib/pricing.ts.

import type {
  Campaign,
  Quotation,
  Refund,
  Rating,
  FunnelRow,
  AccountPayment,
  ContractPrice,
  PaymentAllocation,
  AppError,
  GatewayOutcome,
  Payment,
  WaMessage,
  Claim,
  Purchase,
  Customer,
  CustomerAddress,
  JobRun,
  BusinessAccount,
  BuyingLine,
  Category,
  DailySummary,
  DeliveryArea,
  DeliverySlot,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  Promo,
  Settings,
  StandingOrder,
  StandingOrderRun,
  Variant,
} from "../types";
import type { Repo, Result, SalesRow } from "./repo";
import { seedAccounts, seedAreas, seedCampaigns, seedCategories, seedProducts, seedPromos, seedSettings, seedSlots } from "./seed";
import { availableDates, lineTotal, quote, segmentOf, slotsForSegment, unitPrice } from "../pricing";
import { addDays, isValidPhone, jam, jamRange, normalizePhone, nowJakarta } from "../format";
import { newId, orderCode, randomCode, sessionToken } from "../ids";
import { TEXT_LIMITS, paymentChangeError, safeMapsUrl, statusChangeError, weighError } from "../orderRules";
import { amountOf, buildLedger, dueDateFor, termsBlock } from "../receivables";
import { cleanNpwp, npwpError, quoteCode, quoteError } from "../sales";
import { PREORDER_COD_ERROR, campaignError, cartCampaign, preorderDateError, preorderPaymentError } from "../campaigns";

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
  accPayments: AccountPayment[];
  allocations: PaymentAllocation[];
  contracts: ContractPrice[];
  campaigns: Campaign[];
  refunds: Refund[];
  quotes: Quotation[];
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
    accPayments: [],
    allocations: [],
    contracts: [],
    campaigns: clone(seedCampaigns),
    refunds: [],
    quotes: [],
  };
  seedDemoOrders(store);
  seedReceivables(store);
  // Demo standing order: the seafood restaurant's Monday / Wednesday / Friday kitchen order.
  const now = new Date().toISOString();
  store.standing.push({
    id: "so_bahari", account_id: "ba_bahari", customer_id: null, address_id: null, every_weeks: 1, anchor_date: null, paused_reason: null, name: "Stok ikan Sen–Rab–Jum", weekdays: [1, 3, 5], slot_id: "s_dapur", payment_method: "terms",
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
      due_date: payment_method === "terms" && account ? dueDateFor(tomorrow, account.payment_terms) : null,
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

/**
 * Demo receivables: past tempo invoices for the two example restaurants, a payment, and one contract price, so the
 * Piutang pages show every ageing bucket. Seafood Bahari stays within its terms; Sinar Minang has an invoice past the
 * grace days (its tempo is refused until paid).
 */
function seedReceivables(store: Store) {
  const today = nowJakarta().date;
  const past = (code: string, acc: BusinessAccount, daysAgo: number, lines: Array<[string, number]>) => {
    const items = lines.map(([vid, q]) => itemFrom(store, vid, q, null, "business", acc));
    for (const i of items) { i.qty_final = i.qty_ordered; i.line_total_final = i.line_total_est; }
    const subtotal = items.reduce((s, i) => s + i.line_total_est, 0);
    const slot = store.slots.find((s) => s.id === "s_dapur")!;
    const area = store.areas.find((a) => a.id === acc.area_id)!;
    const delivery = addDays(today, -daysAgo);
    const at = `${delivery}T06:30:00+07:00`;
    const id = newId("o");
    const o: Order = {
      id, code: `DP-${delivery.replace(/-/g, "").slice(2)}-${code}`, segment: "business", account_id: acc.id, customer_name: acc.business_name, phone: acc.phone,
      address: acc.address, area_id: area.id, area_name: area.name, maps_url: null, delivery_date: delivery, slot_id: slot.id,
      slot_label: `${slot.label} ${jamRange(slot.start_time, slot.end_time)}`, payment_method: "terms", payment_status: "unpaid", status: "completed",
      subtotal_est: subtotal, discount: 0, delivery_fee: 0, total_est: subtotal, subtotal_final: subtotal, total_final: subtotal,
      has_catch_weight: false, weighed_at: null, promo_code: null, due_date: dueDateFor(delivery, acc.payment_terms), delivered_at: new Date(at).toISOString(),
      delivery_note: "Dapur", customer_note: "", internal_note: "", created_at: new Date(Date.parse(at) - 86400_000).toISOString(),
      history: [{ status: "new", at: new Date(Date.parse(at) - 86400_000).toISOString() }, { status: "completed", at: new Date(at).toISOString(), note: "Diterima: Dapur" }],
      items: items.map((i) => ({ ...i, order_id: id })),
    };
    store.orders.push(o);
    return o;
  };
  const [bahari, minang] = store.accounts;
  past("BHR7", bahari, 9, [["v_salmon", 8], ["v_udang_beku", 6], ["v_telur_peti", 1]]);
  past("BHR8", bahari, 4, [["v_salmon", 6], ["v_dori", 4], ["v_minyak_18l", 1]]);
  past("MNG5", minang, 20, [["v_ayam8", 10], ["v_minyak_18l", 2], ["v_telur_peti", 1]]);
  past("MNG6", minang, 8, [["v_ayam8", 8], ["v_telur_peti", 1]]);
  const pay = (account_id: string, amount: number, daysAgo: number, reference: string) => store.accPayments.push({
    id: newId("ap"), account_id, amount, paid_on: addDays(today, -daysAgo), method: "transfer", reference, note: "", created_at: new Date(Date.now() - daysAgo * 86400_000).toISOString(),
  });
  const first = store.orders.find((o) => o.code.endsWith("-BHR7"))!;
  pay(bahari.id, amountOf(first), 2, "BCA 0211");
  pay(minang.id, 500000, 12, "Mandiri 7781");
  store.contracts.push({ id: "cp_bahari_kakap", account_id: bahari.id, variant_id: "v_kakap_l", price: 88000, starts_on: addDays(today, -30), ends_on: null, note: "Kontrak Q4: kakap merah 1–2 kg", created_at: new Date().toISOString() });
  allocateCredit(store, bahari.id);
  allocateCredit(store, minang.id);
}

/** Same matching as SQL allocate_account_credit(): oldest due invoice first, oldest payment first; releases over-allocations. */
function allocateCredit(store: Store, accountId: string) {
  const orderById = new Map(store.orders.map((o) => [o.id, o]));
  const accPayIds = new Set(store.accPayments.filter((p) => p.account_id === accountId).map((p) => p.id));
  store.allocations = store.allocations.filter((a) => !(accPayIds.has(a.payment_id) && orderById.get(a.order_id)?.status === "cancelled"));
  const allocOf = (orderId: string) => store.allocations.filter((a) => a.order_id === orderId).reduce((s, a) => s + a.amount, 0);
  for (const o of store.orders.filter((x) => x.account_id === accountId)) {
    let excess = allocOf(o.id) - amountOf(o);
    if (excess <= 0) continue;
    const mine = store.allocations.filter((a) => a.order_id === o.id).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
    for (const a of mine) {
      if (excess <= 0) break;
      if (a.amount <= excess) { excess -= a.amount; store.allocations = store.allocations.filter((x) => x.id !== a.id); }
      else { a.amount -= excess; excess = 0; }
    }
  }
  const usedOf = (paymentId: string) => store.allocations.filter((a) => a.payment_id === paymentId).reduce((s, a) => s + a.amount, 0);
  const invoices = store.orders
    .filter((o) => o.account_id === accountId && o.payment_method === "terms" && o.status !== "cancelled" && (o.payment_status === "unpaid" || o.payment_status === "awaiting_confirmation") && o.total_final !== null)
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || a.delivery_date.localeCompare(b.delivery_date) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const pays = store.accPayments.filter((p) => p.account_id === accountId).sort((a, b) => a.paid_on.localeCompare(b.paid_on) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  for (const inv of invoices) {
    let need = (inv.total_final ?? 0) - allocOf(inv.id);
    for (const p of pays) {
      if (need <= 0) break;
      const rem = p.amount - usedOf(p.id);
      if (rem <= 0) continue;
      const take = Math.min(need, rem);
      store.allocations.push({ id: newId("pa"), payment_id: p.id, order_id: inv.id, amount: take, created_at: new Date().toISOString() });
      need -= take;
    }
    if (need <= 0) {
      inv.payment_status = "paid";
      inv.pay_by = null;
      inv.history.push({ status: "paid", at: new Date().toISOString(), note: "Dari pembayaran tempo" });
    }
  }
}

/** Contract prices that still matter (current or future), attached to an account for pricing. */
function withContracts(store: Store, a: BusinessAccount): BusinessAccount {
  const today = nowJakarta().date;
  return { ...clone(a), contract_prices: clone(store.contracts.filter((c) => c.account_id === a.id && (!c.ends_on || c.ends_on >= today))) };
}

declare global {
  var __dipasariaStore: Store | undefined;
}

function getStore(): Store {
  if (!globalThis.__dipasariaStore) globalThis.__dipasariaStore = buildStore();
  return globalThis.__dipasariaStore;
}

// Kept on globalThis like the store: Next.js may load this module once per route bundle, and these must be shared.
const g = globalThis as typeof globalThis & { __dpMem?: { loginFailures: Map<string, number[]>; rateHits: Map<string, number[]>; errorLog: Map<string, AppError>; jobs: Map<string, JobRun>; payments: Payment[]; wa: WaMessage[]; customers: Customer[]; addresses: CustomerAddress[]; csessions: Map<string, { customer_id: string; expires: number }>; codes: Map<string, { hash: string; expires: number; attempts: number; created: number }>; claims: Claim[]; alerts: Array<{ product_id: string; phone: string; notified: boolean }>; purchases: Purchase[]; funnel?: FunnelRow[]; ratings?: Rating[] } };
g.__dpMem ??= { loginFailures: new Map(), rateHits: new Map(), errorLog: new Map(), jobs: new Map(), payments: [], wa: [], customers: [], addresses: [], csessions: new Map(), codes: new Map(), claims: [], alerts: [], purchases: [] };
g.__dpMem.claims ??= [];
g.__dpMem.funnel ??= [];
const funnel = g.__dpMem.funnel;
g.__dpMem.ratings ??= [];
const ratings = g.__dpMem.ratings;
g.__dpMem.alerts ??= [];
g.__dpMem.purchases ??= [];
g.__dpMem.payments ??= [];
g.__dpMem.wa ??= [];
g.__dpMem.customers ??= [];
g.__dpMem.addresses ??= [];
g.__dpMem.csessions ??= new Map();
g.__dpMem.codes ??= new Map();
const { loginFailures, rateHits, errorLog, jobs, payments, wa, customers, addresses, csessions, codes, claims, alerts, purchases } = g.__dpMem;
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
  async getCampaigns(opts) {
    const cs = getStore().campaigns.filter((c) => opts?.includeInactive || c.is_active);
    return clone([...cs].sort((a, b) => b.deliver_from.localeCompare(a.deliver_from)));
  },
  async saveCampaign(c) {
    const store = getStore();
    const err = campaignError(c);
    if (err) return fail(err);
    if (store.campaigns.some((x) => x.slug === c.slug && x.id !== c.id)) return fail("Alamat halaman ini sudah dipakai pre-order lain.");
    const ex = c.id ? store.campaigns.find((x) => x.id === c.id) : undefined;
    if (c.id && !ex) return fail("Pre-order tidak ditemukan.");
    if (ex) { Object.assign(ex, c); return ok(clone(ex)); }
    const nc: Campaign = { ...c, id: newId("cm"), created_at: new Date().toISOString() };
    store.campaigns.push(nc);
    return ok(clone(nc));
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

  async placeOrder(input, sessionAccount) {
    const store = getStore();
    const now = nowJakarta();
    // the stored account is the authority (limit, terms, contract prices), not the copy from the session
    const stored = sessionAccount ? store.accounts.find((a) => a.id === sessionAccount.id) : undefined;
    const account = stored ? withContracts(store, stored) : null;
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
      { lines: input.lines, area_id: input.area_id, promo_code: input.promo_code, delivery_date: input.delivery_date },
    );
    if (q.errors.length) return fail(q.errors[0]);
    if (!q.min_order_met) return fail(`Pesanan belum mencapai minimal pesanan Rp${q.min_order.toLocaleString("id-ID")}.`);
    if (input.promo_code && q.promo_error) return fail(q.promo_error);
    const area = store.areas.find((a) => a.id === input.area_id && a.is_active);
    if (!area) return fail("Wilayah pengiriman tidak valid.");
    // a pre-order (any line from a seasonal campaign) uses the campaign's delivery days instead (as in SQL place_order)
    const pre = cartCampaign(input.lines, store.products, store.campaigns);
    if (pre.error) return fail(pre.error);
    if (pre.campaign) {
      const e = preorderDateError(pre.campaign, store.settings, now, input.delivery_date);
      if (e) return fail(e);
    } else if (!availableDates(store.settings, now).includes(input.delivery_date)) return fail(`Tanggal pengiriman tidak tersedia. Batas pemesanan untuk pengiriman besok pukul ${jam(store.settings.cutoff_time)} WIB.`);
    const slot = slotsForSegment(store.slots, segment).find((s) => s.id === input.slot_id);
    if (!slot) return fail("Jam pengiriman ini tidak tersedia untuk pesanan Anda.");
    const used = (await this.getSlotUsage([input.delivery_date]))[`${input.delivery_date}|${slot.id}`] ?? 0;
    if (used >= slot.capacity) return fail("Kuota jam pengiriman ini sudah penuh. Silakan pilih jam lain.");
    const pm = input.payment_method;
    if (!["qris", "transfer", "cod", "terms"].includes(pm)) return fail("Metode pembayaran tidak valid.");
    if (pre.campaign && pm === "cod") return fail(PREORDER_COD_ERROR);
    // a gift is paid by the sender: the recipient must never be asked for money at the door (as in SQL place_order)
    const gift = input.gift ?? null;
    if (gift) {
      if (pm === "cod") return fail("Hadiah dibayar oleh pengirim: pilih QRIS atau transfer.");
      if (!isValidPhone(String(gift.recipient_phone ?? ""))) return fail("Nomor WhatsApp penerima hadiah tidak valid.");
      if (String(gift.message ?? "").length > 300 || String(gift.from ?? "").length > 60) return fail("Pesan kartu maksimal 300 karakter dan nama pengirim maksimal 60 karakter.");
    }
    if (pm === "cod" && !(segment === "business" && account?.allow_cod)) return fail("Bayar di tempat (COD) hanya tersedia untuk akun bisnis yang telah disetujui.");
    if (pm === "terms" && !(segment === "business" && account && account.payment_terms !== "prepaid")) return fail("Pembayaran tempo hanya tersedia untuk akun bisnis dengan fasilitas tempo.");
    if (pm === "terms" && account) {
      const block = termsBlock(buildLedger(account, store.orders, store.accPayments, store.allocations, now.date), account, store.settings, q.total, now.date);
      if (block) return fail(block);
    }

    if (pre.campaign) {
      const e = preorderPaymentError(pm, q.has_catch_weight);
      if (e) return fail(e);
    }

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
      stock_reserved: l.variant.stock_qty !== null,
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
      substitution: input.substitution === "similar" || input.substitution === "remove" ? input.substitution : "contact",
      delivered_at: null,
      delivery_note: null,
      cod_collected: null,
      due_date: pm === "terms" && account ? dueDateFor(input.delivery_date, account.payment_terms) : null,
      gift_message: gift ? String(gift.message ?? "").trim() : null,
      gift_from: gift ? String(gift.from ?? "").trim() || null : null,
      recipient_phone: gift ? normalizePhone(gift.recipient_phone) : null,
      campaign_id: pre.campaign?.id ?? null,
      customer_note: input.customer_note?.trim() ?? "",
      internal_note: "",
      created_at: created,
      history: [{ status: "new", at: created }],
      items,
    };
    order.pay_by = payByFor(order, store.settings);
    store.orders.unshift(order);
    if (pm === "terms" && account && !q.has_catch_weight) allocateCredit(store, account.id);
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
    const npwpErr = npwpError(input.npwp);
    if (npwpErr) return fail(npwpErr);
    const acc: BusinessAccount = {
      npwp: cleanNpwp(input.npwp), tax_name: null, tax_address: null,
      id: newId("ba"),
      business_name: input.business_name.trim(),
      contact_name: input.contact_name.trim(),
      phone,
      address: input.address?.trim() ?? "",
      area_id: input.area_id,
      business_type: input.business_type,
      discount_pct: 0,
      credit_limit: null,
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
    const acc = store.accounts.find((a) => a.phone === p && a.status === "approved" && a.access_code && a.access_code.toUpperCase() === code.trim().toUpperCase());
    if (!acc) {
      // after 5 wrong tries wrong codes get the lockout message; the right code still works (no lock-out by strangers)
      if (recent.length >= 5) throw new Error("Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit atau hubungi kami melalui WhatsApp.");
      loginFailures.set(p, [...recent, Date.now()]);
      return null;
    }
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
    return acc ? withContracts(store, acc) : null;
  },
  async endSession(token) { getStore().sessions.delete(token); },

  async listOrders(filter) {
    let os = getStore().orders.slice();
    if (filter.date) os = os.filter((o) => o.delivery_date === filter.date);
    if (filter.status === "open") os = os.filter((o) => !["completed", "cancelled"].includes(o.status));
    else if (filter.status) os = os.filter((o) => o.status === filter.status);
    if (filter.segment) os = os.filter((o) => o.segment === filter.segment);
    if (filter.campaignId) os = os.filter((o) => o.campaign_id === filter.campaignId);
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
        if (v && v.stock_qty !== null && i.stock_reserved) v.stock_qty += i.qty_ordered; // only what was taken
      }
      if (o.promo_code) { const pr = store.promos.find((p) => p.code === o.promo_code); if (pr) pr.used_count = Math.max(0, pr.used_count - 1); }
      const before = o.payment_status;
      o.payment_status = before === "paid" || before === "awaiting_confirmation" ? "refund_due" : "void";
      cancelOpenPayments(o.id);
      // a tempo invoice settled from the restaurant's payments: the money goes back to its credit, nothing to refund
      if (o.payment_method === "terms") {
        const alloc = store.allocations.filter((a) => a.order_id === o.id).reduce((s, a) => s + a.amount, 0);
        if (alloc > 0) {
          store.allocations = store.allocations.filter((a) => a.order_id !== o.id);
          if (alloc >= amountOf(o) || (before !== "paid" && before !== "awaiting_confirmation")) o.payment_status = "void";
        }
      }
    }
    o.status = status;
    o.history.push({ status, at: new Date().toISOString(), note });
    if (status === "cancelled" && o.payment_method === "terms" && o.account_id) allocateCredit(store, o.account_id);
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
    if (o.payment_method === "terms" && o.account_id) allocateCredit(store, o.account_id);
    return ok(clone(o));
  },
  async setPaymentStatus(id, status) {
    const o = getStore().orders.find((x) => x.id === id);
    if (!o) return fail("Pesanan tidak ditemukan.");
    const err = paymentChangeError(o, status);
    if (err) return fail(err);
    // a tempo invoice marked unpaid again gives its share of the restaurant's payments back to the account's credit
    if (o.payment_method === "terms" && o.payment_status === "paid" && (status === "unpaid" || status === "awaiting_confirmation")) {
      getStore().allocations = getStore().allocations.filter((a) => a.order_id !== o.id);
    }
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
    return getStore().accounts.map((a) => withContracts(getStore(), a)).sort((a, b) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1) || b.applied_at.localeCompare(a.applied_at));
  },
  async getAccount(id) {
    const a = getStore().accounts.find((x) => x.id === id);
    return a ? withContracts(getStore(), a) : null;
  },
  async approveAccount(id, patch) {
    const a = getStore().accounts.find((x) => x.id === id);
    if (!a) return fail("Akun tidak ditemukan.");
    Object.assign(a, { ...patch, preferred_slot_id: patch.preferred_slot_id ?? a.preferred_slot_id }, { status: "approved", approved_at: a.approved_at ?? new Date().toISOString(), access_code: a.access_code ?? randomCode(6) });
    return ok(clone(a));
  },
  async updateAccount(id, patch) {
    const a = getStore().accounts.find((x) => x.id === id);
    if (!a) return fail("Akun tidak ditemukan.");
    const { id: _id, contract_prices: _cp, ...rest } = patch;
    void _id; void _cp;
    Object.assign(a, rest);
    return ok(clone(a));
  },
  async regenerateAccessCode(id) {
    const a = getStore().accounts.find((x) => x.id === id);
    if (!a) return fail("Akun tidak ditemukan.");
    a.access_code = randomCode(6);
    for (const [t, s] of getStore().sessions) if (s.account_id === id) getStore().sessions.delete(t); // old code's sessions end (as in SQL)
    return ok(clone(a));
  },

  async upsertProduct(p) {
    const store = getStore();
    // same rule as the products_campaign_fixed_price constraint
    if (p.campaign_id && !store.campaigns.some((c) => c.id === p.campaign_id)) return fail("Pre-order tidak ditemukan.");
    if (p.campaign_id && p.is_catch_weight) return fail("Produk pre-order harus berharga tetap (tidak ditimbang), agar dapat dibayar di muka.");
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
    const list = getStore().standing.filter((s) => (!filter?.accountId || s.account_id === filter.accountId) && (!filter?.customerId || s.customer_id === filter.customerId));
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
    const so: StandingOrder = { id: newId("so"), account_id: accountId, customer_id: null, address_id: null, every_weeks: 1, anchor_date: null, paused_reason: null, name, weekdays, slot_id: input.slot_id, payment_method: input.payment_method, lines, status: "active", skip_dates: [], note: input.note ?? null, created_at: now, updated_at: now };
    store.standing.push(so);
    return ok(clone(so));
  },
  async saveBox(customerId, input) {
    const store = getStore();
    const now = new Date().toISOString();
    const lines = input.lines.filter((l) => l.qty > 0).map((l) => ({ variant_id: l.variant_id, qty: l.qty, prep_option_id: l.prep_option_id ?? null }));
    const fields = { name: input.name.trim() || "Kotak mingguan", weekdays: [...new Set(input.weekdays)].sort(), slot_id: input.slot_id, payment_method: input.payment_method, lines, note: input.note ?? null, address_id: input.address_id, every_weeks: input.every_weeks, anchor_date: input.anchor_date, updated_at: now };
    if (input.id) {
      const ex = store.standing.find((s) => s.id === input.id && s.customer_id === customerId);
      if (!ex) return fail("Kotak mingguan tidak ditemukan.");
      Object.assign(ex, fields);
      return ok(clone(ex));
    }
    const so: StandingOrder = { id: newId("so"), account_id: null, customer_id: customerId, paused_reason: null, status: "active", skip_dates: [], created_at: now, ...fields };
    store.standing.push(so);
    return ok(clone(so));
  },
  async setStandingOrderStatus(id, status, reason) {
    const so = getStore().standing.find((s) => s.id === id);
    if (!so) return fail("Pesanan rutin tidak ditemukan.");
    so.status = status; so.paused_reason = status === "paused" ? reason ?? null : null; so.updated_at = new Date().toISOString();
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
    // a run that failed may be retried (after the problem is fixed), and so may one that stopped half-way more than
    // 10 minutes ago (the order itself is protected by its client_ref); one that placed an order may not
    const stale = prev && prev.order_id === null && prev.error === null && Date.parse(prev.created_at) < Date.now() - 600_000;
    if (prev && prev.order_id === null && (prev.error !== null || stale)) { prev.error = null; prev.created_at = new Date().toISOString(); return clone(prev); }
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
    const payable = (id: string) => payments.some((p) => p.order_id === id && p.status === "pending" && p.expires_at && Date.parse(p.expires_at) > now);
    const due = getStore().orders.filter((o) => o.pay_by && Date.parse(o.pay_by) < now && o.payment_status === "unpaid" && (o.status === "new" || o.status === "confirmed") && !payable(o.id));
    for (const o of due) await this.updateOrderStatus(o.id, "cancelled", "Dibatalkan otomatis: pembayaran belum diterima sampai batas waktu.");
    jobs.set("expire_unpaid", { job: "expire_unpaid", last_at: new Date().toISOString(), result: `${due.length} dibatalkan` });
    return due.length;
  },
  async setWeeklyContents(productId, text, textEn) {
    const p = getStore().products.find((x) => x.id === productId && x.curated);
    if (!p) return fail("Produk ini bukan kotak pilihan pedagang.");
    Object.assign(p, { weekly_contents: text, weekly_contents_en: textEn, weekly_contents_at: new Date().toISOString() });
    return ok(undefined);
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
  async listAccountGatewayPayments(accountId) {
    return clone(payments.filter((p) => p.account_id === accountId).sort((a, b) => b.created_at.localeCompare(a.created_at)));
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
    // a restaurant paying its open invoices from the statement: an account payment, matched oldest first (as in SQL)
    if (pay.account_id) {
      const store = getStore();
      const amt = Math.round(amount ?? pay.amount);
      Object.assign(pay, { status: "paid", paid_at: new Date().toISOString(), amount_paid: amt });
      store.accPayments.push({ id: newId("ap"), account_id: pay.account_id, amount: amt, paid_on: nowJakarta().date, method: pay.method, reference: pay.id, note: pay.method === "va" ? `Virtual account ${String(pay.va_bank ?? "").toUpperCase()} otomatis` : "QRIS otomatis", created_at: new Date().toISOString() });
      allocateCredit(store, pay.account_id);
      return "paid";
    }
    Object.assign(pay, { status: "paid", paid_at: new Date().toISOString(), amount_paid: amount });
    const o = getStore().orders.find((x) => x.id === pay.order_id)!;
    const tag = pay.method === "va" ? "[VA]" : "[QRIS]";
    const note = (s: string) => { o.internal_note = [o.internal_note, `${tag} ${s}`].filter(Boolean).join("\n"); };
    const paid = amount ?? 0;
    if (o.status === "cancelled") { o.payment_status = "refund_due"; note(`${rp(paid)} diterima (${id}) setelah pesanan dibatalkan. Kembalikan dana ke pelanggan.`); return "late"; }
    if (o.payment_status === "paid") { note(`Pembayaran ganda ${rp(paid)} (${id}). Kembalikan kelebihan dana.`); return "duplicate"; }
    if (o.total_final === null || paid !== o.total_final) {
      o.payment_status = "awaiting_confirmation"; o.pay_by = null;
      note(`Diterima ${rp(paid)}, tagihan ${o.total_final === null ? "belum final" : rp(o.total_final)}. Periksa selisih sebelum menandai lunas.`);
      return "mismatch";
    }
    o.payment_status = "paid"; o.pay_by = null;
    o.history.push({ status: "paid", at: new Date().toISOString(), note: pay.method === "va" ? "Virtual account otomatis" : "QRIS otomatis" });
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
    // a new code keeps the wrong-try count of the last 15 minutes (mirrors customer_request_code)
    codes.set(p, { hash: codeHash, expires: Date.now() + 600_000, attempts: cur && Date.now() - cur.created < 900_000 ? cur.attempts : 0, created: Date.now() });
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
  async getCustomer(id) {
    const c = customers.find((x) => x.id === id);
    return c ? clone(c) : null;
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
    const store = getStore(); // weekly boxes go with the account (as the database cascade does)
    const gone = new Set(store.standing.filter((s) => s.customer_id === id).map((s) => s.id));
    store.standing = store.standing.filter((s) => !gone.has(s.id));
    store.standingRuns = store.standingRuns.filter((r) => !gone.has(r.standing_order_id));
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
  async markDelivered(id, note, cod) {
    const o = getStore().orders.find((x) => x.id === id);
    if (!o) return fail("Pesanan tidak ditemukan.");
    if (o.status === "cancelled" || o.status === "completed") return fail("Pesanan ini sudah selesai atau dibatalkan.");
    if (o.has_catch_weight && o.total_final === null) return fail("Timbang pesanan ini terlebih dahulu.");
    if (cod !== null && (!Number.isFinite(cod) || cod < 0 || cod > 100_000_000)) return fail("Jumlah uang tunai tidak valid.");
    const n = note?.trim().slice(0, 200) || null;
    const at = new Date().toISOString();
    Object.assign(o, { status: "completed", delivered_at: at, delivery_note: n, pay_by: null });
    if (cod !== null) o.cod_collected = cod;
    o.history.push({ status: "completed", at, note: n ? `Diterima: ${n}` : "Diterima" });
    if (o.payment_method === "cod" && cod !== null && cod >= (o.total_final ?? o.total_est) && o.payment_status !== "paid") {
      o.payment_status = "paid";
      o.history.push({ status: "paid", at, note: "Tunai saat diantar" });
    }
    return ok(clone(o));
  },
  async createClaim(code, phone, c, windowHours) {
    const o = getStore().orders.find((x) => x.code === code.trim().toUpperCase() && x.phone === normalizePhone(phone));
    if (!o) return fail("Pesanan tidak ditemukan.");
    if (o.status !== "completed" || !o.delivered_at) return fail("Laporan dapat dikirim setelah pesanan diterima.");
    if (Date.now() > Date.parse(o.delivered_at) + windowHours * 3600_000) return fail("Batas waktu laporan sudah lewat. Hubungi kami melalui WhatsApp.");
    if (!c.items.length) return fail("Pilih produk yang bermasalah.");
    if (c.photos.length > 3 || JSON.stringify(c.photos).length > 2_400_000) return fail("Maksimal 3 foto.");
    if (c.items.some((it) => !o.items.some((i) => i.id === it.item_id))) return fail("Produk tidak ada di pesanan ini.");
    if (claims.filter((x) => x.order_id === o.id).length >= 3) return fail("Laporan untuk pesanan ini sudah kami terima. Hubungi kami melalui WhatsApp.");
    const row: Claim = { id: newId("cl"), order_id: o.id, items: c.items, reason: c.reason, note: c.note.slice(0, 500), photos: c.photos, status: "open", resolution_note: "", refund_amount: null, created_at: new Date().toISOString(), resolved_at: null };
    claims.push(row);
    return ok(row.id);
  },
  async resolveClaim(id, status, note, refund) {
    const c = claims.find((x) => x.id === id);
    if (!c) return fail("Laporan tidak ditemukan.");
    if (c.status !== "open") return fail("Laporan ini sudah diputuskan.");
    if (status === "refund" && (refund === null || !(refund > 0))) return fail("Isi jumlah pengembalian dana.");
    if (status === "declined" && !note.trim()) return fail("Tulis alasan penolakan untuk pelanggan.");
    Object.assign(c, { status, resolution_note: note.slice(0, 500), refund_amount: status === "refund" ? refund : null, resolved_at: new Date().toISOString() });
    const o = getStore().orders.find((x) => x.id === c.order_id);
    if (o) {
      const what = status === "replace" ? "Diganti pada pengiriman berikutnya" : status === "refund" ? `Dana dikembalikan Rp${Math.round(refund!).toLocaleString("id-ID")}` : "Ditolak";
      o.internal_note = [o.internal_note, `[Garansi] ${what}${note.trim() ? `: ${note.trim()}` : ""}`].filter(Boolean).join("\n");
    }
    return ok(c.order_id);
  },
  async listClaims(filter) {
    return clone(claims.filter((c) => (!filter?.status || c.status === filter.status) && (!filter?.orderId || c.order_id === filter.orderId)).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, filter?.limit ?? 100));
  },
  async addStockAlert(productId, phone) {
    const p = normalizePhone(phone);
    if (!alerts.some((a) => a.product_id === productId && a.phone === p && !a.notified)) alerts.push({ product_id: productId, phone: p, notified: false });
  },
  async takeStockAlerts(productId) {
    const waiting = alerts.filter((a) => a.product_id === productId && !a.notified);
    for (const a of waiting) a.notified = true;
    return waiting.map((a) => a.phone);
  },
  async stockAlertCounts() {
    const out: Record<string, number> = {};
    for (const a of alerts) if (!a.notified) out[a.product_id] = (out[a.product_id] ?? 0) + 1;
    return out;
  },
  async addPurchase(p) {
    if (!(p.qty > 0) || p.total_cost < 0) return fail("Jumlah harus lebih dari 0 dan harga tidak boleh negatif.");
    const row: Purchase = { ...p, id: newId("pu"), created_at: new Date().toISOString() };
    purchases.push(row);
    return ok(clone(row));
  },
  async deletePurchase(id) {
    const i = purchases.findIndex((x) => x.id === id);
    if (i >= 0) purchases.splice(i, 1);
  },
  async listPurchases(filter) {
    return clone(purchases.filter((x) => (!filter.date || x.delivery_date === filter.date) && (!filter.from || x.delivery_date >= filter.from) && (!filter.to || x.delivery_date <= filter.to)).sort((a, b) => a.created_at.localeCompare(b.created_at)));
  },
  async listOrdersAutoCancelled(hours) {
    const now = Date.now(), since = now - hours * 3600_000;
    return clone(getStore().orders.filter((o) => o.status === "cancelled" && o.pay_by && Date.parse(o.pay_by) < now && Date.parse(o.pay_by) > since).slice(0, 50));
  },
  async listOrdersPastPayBy() {
    const now = Date.now();
    return clone(getStore().orders.filter((o) => o.pay_by && Date.parse(o.pay_by) < now && o.payment_status === "unpaid" && (o.status === "new" || o.status === "confirmed")));
  },

  async listReceivables(filter) {
    const store = getStore();
    const orders = store.orders.filter((o) => o.payment_method === "terms" && o.status !== "cancelled" && o.account_id && (!filter?.accountId || o.account_id === filter.accountId));
    const payments = store.accPayments.filter((p) => !filter?.accountId || p.account_id === filter.accountId);
    const ids = new Set(payments.map((p) => p.id));
    return clone({ orders: orders.map((o) => ({ ...o, items: [] })), payments, allocations: store.allocations.filter((a) => ids.has(a.payment_id)) });
  },
  async recordAccountPayment(accountId, p) {
    const store = getStore();
    if (!store.accounts.some((a) => a.id === accountId)) return fail("Akun tidak ditemukan.");
    const today = nowJakarta().date;
    if (!Number.isFinite(p.amount) || p.amount <= 0 || p.amount > 1_000_000_000 || p.amount !== Math.round(p.amount)) return fail("Jumlah pembayaran tidak valid.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.paid_on) || p.paid_on > today || p.paid_on < addDays(today, -366)) return fail("Tanggal pembayaran tidak valid.");
    if (!["transfer", "cash", "qris", "giro", "va", "other"].includes(p.method)) return fail("Cara pembayaran tidak valid.");
    const id = newId("ap");
    store.accPayments.push({ id, account_id: accountId, amount: p.amount, paid_on: p.paid_on, method: p.method, reference: p.reference.trim().slice(0, 80), note: p.note.trim().slice(0, 200), created_at: new Date().toISOString() });
    allocateCredit(store, accountId);
    return ok(id);
  },
  async deleteAccountPayment(id) {
    const store = getStore();
    const p = store.accPayments.find((x) => x.id === id);
    if (!p) return fail("Pembayaran tidak ditemukan.");
    const others = (orderId: string) => store.allocations.filter((a) => a.order_id === orderId && a.payment_id !== id).reduce((s, a) => s + a.amount, 0);
    for (const orderId of new Set(store.allocations.filter((a) => a.payment_id === id).map((a) => a.order_id))) {
      const o = store.orders.find((x) => x.id === orderId);
      if (o && o.payment_status === "paid" && amountOf(o) > others(orderId)) {
        o.payment_status = "unpaid";
        o.history.push({ status: "unpaid", at: new Date().toISOString(), note: "Pembayaran tempo dihapus" });
      }
    }
    store.allocations = store.allocations.filter((a) => a.payment_id !== id);
    store.accPayments = store.accPayments.filter((x) => x.id !== id);
    allocateCredit(store, p.account_id);
    return ok(undefined);
  },
  async listContractPrices(accountId) {
    return clone(getStore().contracts.filter((c) => !accountId || c.account_id === accountId)).sort((a, b) => a.variant_id.localeCompare(b.variant_id) || b.starts_on.localeCompare(a.starts_on));
  },
  async addContractPrice(c) {
    const store = getStore();
    if (store.contracts.some((x) => x.account_id === c.account_id && x.variant_id === c.variant_id && x.starts_on === c.starts_on)) return fail("Sudah ada harga kontrak untuk produk ini yang mulai pada tanggal itu.");
    const row: ContractPrice = { ...c, id: newId("cp"), created_at: new Date().toISOString() };
    store.contracts.push(row);
    return ok(clone(row));
  },
  async deleteContractPrice(id) {
    const store = getStore();
    store.contracts = store.contracts.filter((c) => c.id !== id);
  },

  async recordRefund(orderId, r) {
    const store = getStore();
    const o = store.orders.find((x) => x.id === orderId);
    if (!o) return fail("Pesanan tidak ditemukan.");
    const today = nowJakarta().date;
    if (!Number.isFinite(r.amount) || r.amount <= 0 || r.amount !== Math.round(r.amount)) return fail("Jumlah pengembalian tidak valid.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.refunded_on) || r.refunded_on > today || r.refunded_on < addDays(today, -366)) return fail("Tanggal pengembalian tidak valid.");
    if (!["transfer", "cash", "qris", "va", "other"].includes(r.method)) return fail("Cara pengembalian tidak valid.");
    if (r.proof && (r.proof.length > 800_000 || !/^data:image\/(jpeg|png|webp);base64,/.test(r.proof))) return fail("Bukti pengembalian harus berupa foto.");
    if (r.claim_id && !claims.some((c) => c.id === r.claim_id && c.order_id === orderId)) return fail("Laporan garansi tidak cocok dengan pesanan ini.");
    // never more than was received for the order (as in SQL record_refund)
    let received = payments.filter((p) => p.order_id === orderId && p.status === "paid").reduce((t, p) => t + (p.amount_paid ?? 0), 0);
    if (o.payment_status === "paid" || o.payment_status === "refund_due" || o.cod_collected != null) received = Math.max(received, o.total_final ?? o.total_est, o.cod_collected ?? 0);
    const done = store.refunds.filter((x) => x.order_id === orderId).reduce((t, x) => t + x.amount, 0);
    if (done + r.amount > received) return fail(`Pengembalian melebihi dana yang diterima untuk pesanan ini (sisa Rp${Math.max(0, received - done).toLocaleString("id-ID")}).`);
    const id = newId("rf");
    store.refunds.push({ id, order_id: orderId, claim_id: r.claim_id ?? null, amount: r.amount, refunded_on: r.refunded_on, method: r.method, reference: r.reference.trim().slice(0, 80), proof: r.proof ?? null, note: r.note.trim().slice(0, 300), created_at: new Date().toISOString() });
    if (o.payment_status === "refund_due") {
      o.payment_status = "void";
      o.history.push({ status: "refunded", at: new Date().toISOString(), note: `Dana dikembalikan Rp${r.amount.toLocaleString("id-ID")}` });
    }
    return ok(id);
  },
  async listRefunds(filter = {}) {
    const store = getStore();
    return clone(store.refunds
      .filter((r) => (!filter.orderId || r.order_id === filter.orderId) && (!filter.from || r.refunded_on >= filter.from) && (!filter.to || r.refunded_on <= filter.to))
      .map((r) => { const o = store.orders.find((x) => x.id === r.order_id); return { ...r, order_code: o?.code, customer_name: o?.customer_name }; })
      .sort((a, b) => b.refunded_on.localeCompare(a.refunded_on) || b.created_at.localeCompare(a.created_at)));
  },

  async listQuotes() {
    return clone([...getStore().quotes].sort((a, b) => b.created_at.localeCompare(a.created_at)));
  },
  async getQuote(id) {
    const q = getStore().quotes.find((x) => x.id === id);
    return q ? clone(q) : null;
  },
  async saveQuote(q) {
    const store = getStore();
    const today = nowJakarta().date;
    const ex = q.id ? store.quotes.find((x) => x.id === q.id) : undefined;
    if (q.id && !ex) return fail("Penawaran tidak ditemukan.");
    if (ex && ex.status === "accepted") return fail("Penawaran yang sudah diterima tidak dapat diubah.");
    if (q.account_id && !store.accounts.some((a) => a.id === q.account_id)) return fail("Akun tidak ditemukan.");
    const err = quoteError(q, store.products.filter((p) => p.is_active), today);
    if (err) return fail(err);
    const clean = { ...q, phone: q.phone ? normalizePhone(q.phone) : "", npwp: cleanNpwp(q.npwp), lines: q.lines.map((l) => ({ variant_id: l.variant_id, price: l.price, note: String(l.note ?? "").trim() })) };
    if (ex) { Object.assign(ex, clean, { id: ex.id }); return ok(clone(ex)); }
    let code = quoteCode(today);
    while (store.quotes.some((x) => x.code === code)) code = quoteCode(today);
    const row: Quotation = { ...clean, id: newId("qt"), code, status: "draft", accepted_at: null, accepted_name: null, created_at: new Date().toISOString() };
    store.quotes.push(row);
    return ok(clone(row));
  },
  async setQuoteStatus(id, status) {
    const q = getStore().quotes.find((x) => x.id === id);
    if (!q) return fail("Penawaran tidak ditemukan.");
    if (q.status === "accepted") return fail("Penawaran yang sudah diterima tidak dapat diubah.");
    if (status === "sent" && q.valid_until < nowJakarta().date) return fail("Batas penerimaan sudah lewat. Ubah tanggalnya dulu.");
    q.status = status;
    return ok(clone(q));
  },
  async acceptQuote(id, name) {
    const store = getStore();
    const q = store.quotes.find((x) => x.id === id);
    const today = nowJakarta().date;
    if (!q) return fail("Penawaran tidak ditemukan.");
    if (q.status === "accepted") return fail("Penawaran ini sudah diterima.");
    if (q.status !== "sent") return fail("Penawaran ini tidak berlaku lagi. Hubungi kami untuk penawaran baru.");
    if (today > q.valid_until) return fail("Masa berlaku penawaran ini sudah lewat. Hubungi kami untuk penawaran baru.");
    if (String(name ?? "").trim().length < 2 || String(name).length > 80) return fail("Tulis nama Anda (2–80 karakter).");
    if (!q.lines.length) return fail("Penawaran ini belum berisi produk.");
    if (q.lines.some((l) => !store.products.some((p) => p.variants.some((v) => v.id === l.variant_id)) || !(l.price > 0))) return fail("Salah satu produk pada penawaran sudah tidak tersedia. Hubungi kami.");
    let acc = q.account_id ? store.accounts.find((a) => a.id === q.account_id) : undefined;
    if (!acc) {
      const phone = normalizePhone(q.phone);
      if (!/^62\d{8,13}$/.test(phone)) return fail("Nomor WhatsApp pada penawaran tidak valid. Hubungi kami.");
      acc = store.accounts.find((a) => a.phone === phone);
      if (!acc) {
        acc = { id: newId("ba"), business_name: q.business_name, contact_name: q.contact_name.trim() || name.trim(), phone, address: q.address, area_id: null, business_type: q.business_type, discount_pct: 0, credit_limit: null, payment_terms: "prepaid", allow_cod: false, status: "pending", access_code: null, preferred_slot_id: null, notes: `Dari penawaran ${q.code}, diterima oleh ${name.trim()}`, applied_at: new Date().toISOString(), approved_at: null, npwp: q.npwp, tax_name: q.tax_name, tax_address: q.tax_address };
        store.accounts.push(acc);
      }
    }
    acc.npwp ??= q.npwp; acc.tax_name ??= q.tax_name; acc.tax_address ??= q.tax_address;
    const from = q.price_from > today ? q.price_from : today;
    for (const l of q.lines) {
      const ex = store.contracts.find((c) => c.account_id === acc!.id && c.variant_id === l.variant_id && c.starts_on === from);
      if (ex) Object.assign(ex, { price: Math.round(l.price), ends_on: q.price_to, note: `Penawaran ${q.code}` });
      else store.contracts.push({ id: newId("cp"), account_id: acc.id, variant_id: l.variant_id, price: Math.round(l.price), starts_on: from, ends_on: q.price_to, note: `Penawaran ${q.code}`, created_at: new Date().toISOString() });
    }
    Object.assign(q, { status: "accepted", accepted_at: new Date().toISOString(), accepted_name: name.trim(), account_id: acc.id });
    return ok(acc.id);
  },

  async createRating(code, phone, r, windowDays) {
    const o = getStore().orders.find((x) => x.code.toUpperCase() === code.trim().toUpperCase() && x.phone === normalizePhone(phone));
    if (!o) return fail("Pesanan tidak ditemukan.");
    if (o.status !== "completed") return fail("Penilaian dapat diberikan setelah pesanan diterima.");
    const delivered = o.delivered_at ? Date.parse(o.delivered_at) : Date.parse(`${o.delivery_date}T12:00:00+07:00`);
    if (Date.now() > delivered + windowDays * 86400_000) return fail("Batas waktu penilaian untuk pesanan ini sudah lewat.");
    if (!Number.isInteger(r.stars) || r.stars < 1 || r.stars > 5) return fail("Pilih 1 sampai 5 bintang.");
    if (ratings.some((x) => x.order_id === o.id)) return fail("Pesanan ini sudah Anda nilai. Terima kasih.");
    const perProduct = new Map<string, number[]>();
    for (const it of r.items) {
      const line = o.items.find((i) => i.id === it.item_id);
      if (!line || !Number.isInteger(it.stars) || it.stars < 1 || it.stars > 5) return fail("Penilaian produk tidak valid.");
      perProduct.set(line.product_id, [...(perProduct.get(line.product_id) ?? []), it.stars]);
    }
    const id = newId("rt");
    ratings.push({ id, order_id: o.id, stars: r.stars, comment: r.comment.trim().slice(0, 500), created_at: new Date().toISOString(),
      items: [...perProduct.entries()].map(([product_id, xs]) => ({ product_id, stars: Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) })) });
    return ok(id);
  },
  async getRatingForOrder(orderId) {
    const r = ratings.find((x) => x.order_id === orderId);
    return r ? clone(r) : null;
  },
  async listRatings(filter) {
    const rows = ratings.filter((r) => !filter?.since || r.created_at.slice(0, 10) >= filter.since).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, filter?.limit ?? 200);
    return clone(rows).map((r) => { const o = getStore().orders.find((x) => x.id === r.order_id); return { ...r, order_code: o?.code, customer_name: o?.customer_name, phone: o?.phone }; });
  },
  async productRatings() {
    const sums = new Map<string, { total: number; count: number }>();
    for (const r of ratings) for (const it of r.items) { const s = sums.get(it.product_id) ?? { total: 0, count: 0 }; s.total += it.stars; s.count++; sums.set(it.product_id, s); }
    return Object.fromEntries([...sums.entries()].map(([id, s]) => [id, { average: Math.round((s.total / s.count) * 100) / 100, count: s.count }]));
  },
  async listOrderFacts(since) {
    return getStore().orders.filter((o) => o.status !== "cancelled" && o.delivery_date >= since)
      .map((o) => ({ code: o.code, segment: o.segment, account_id: o.account_id, phone: o.phone, customer_name: o.gift_message != null ? (o.gift_from || `+${o.phone}`) : o.customer_name, delivery_date: o.delivery_date, total: o.total_final ?? o.total_est }));
  },

  async trackEvent(event, productId = "") {
    const day = nowJakarta().date;
    const row = funnel.find((r) => r.day === day && r.event === event && r.product_id === productId);
    if (row) row.n++; else funnel.push({ day, event, product_id: productId, n: 1 });
  },
  async funnelReport(from, to) {
    return clone(funnel.filter((r) => r.day >= from && r.day <= to));
  },
};
