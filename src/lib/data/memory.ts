// In-memory adapter used when Supabase is not configured (local review, previews).
// It applies the same business rules as the SQL functions, via src/lib/pricing.ts.

import type {
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
  Variant,
} from "../types";
import type { OrderFilter, Repo, Result, SalesRow } from "./repo";
import { seedAccounts, seedAreas, seedCategories, seedProducts, seedPromos, seedSettings, seedSlots } from "./seed";
import { availableDates, quote, segmentOf, slotsForSegment } from "../pricing";
import { addDays, isValidPhone, jam, jamRange, normalizePhone, nowJakarta } from "../format";
import { newId, orderCode, randomCode, sessionToken } from "../ids";

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
  };
  seedDemoOrders(store);
  return store;
}

function itemFrom(store: Store, variantId: string, qty: number, prepId: string | null, segment: "retail" | "business", account: BusinessAccount | null): OrderItem {
  const product = store.products.find((p) => p.variants.some((v) => v.id === variantId))!;
  const variant = product.variants.find((v) => v.id === variantId)!;
  const prep = prepId ? product.prep_options.find((p) => p.id === prepId) ?? null : null;
  const base = segment === "business" ? Math.round(variant.price_business * (1 - (account?.discount_pct ?? 0) / 100)) : variant.price_retail;
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
    line_total_est: Math.round(unit_price * qty),
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

const ok = <T,>(data: T): Result<T> => ({ ok: true, data });
const fail = <T,>(error: string): Result<T> => ({ ok: false, error });

function recomputeTotals(o: Order, settings: Settings, areaFee: number) {
  const weighed = o.items.every((i) => !i.is_catch_weight || i.qty_final !== null);
  if (!weighed) return;
  const subtotal = o.items.reduce((s, i) => s + (i.line_total_final ?? i.line_total_est), 0);
  const threshold = o.segment === "business" ? settings.free_delivery_business : settings.free_delivery_retail;
  let fee = subtotal >= threshold ? 0 : areaFee;
  let discount = o.discount;
  if (o.promo_code) {
    const promo = getStore().promos.find((p) => p.code === o.promo_code);
    if (promo?.type === "percent") discount = Math.round((subtotal * promo.value) / 100);
    else if (promo?.type === "fixed") discount = Math.min(promo.value, subtotal);
    else if (promo?.type === "free_delivery") fee = 0;
  }
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
    return clone(ps).sort((a, b) => a.sort - b.sort).map((p) => ({ ...p, variants: p.variants.filter((v) => opts?.includeInactive || v.is_active).sort((a, b) => a.sort - b.sort) }));
  },
  async getProductBySlug(slug) {
    const p = getStore().products.find((x) => x.slug === slug && x.is_active);
    return p ? clone(p) : null;
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
    if (!input.customer_name?.trim()) return fail("Nama penerima wajib diisi.");
    if (!isValidPhone(input.phone)) return fail("Nomor WhatsApp tidak valid.");
    if (!input.address?.trim()) return fail("Alamat pengiriman wajib diisi.");
    if (!input.lines?.length) return fail("Keranjang Anda masih kosong.");
    const phone = normalizePhone(input.phone);
    const isFirst = !(await this.hasOrderedBefore(phone));
    const q = quote(
      { settings: store.settings, products: store.products, areas: store.areas, promos: store.promos, account, now, isFirstOrder: isFirst },
      { lines: input.lines, area_id: input.area_id, promo_code: input.promo_code },
    );
    if (q.errors.length) return fail(q.errors[0]);
    if (!q.min_order_met) return fail(`Minimal pesanan Rp${q.min_order.toLocaleString("id-ID")}.`);
    if (input.promo_code && q.promo_error) return fail(q.promo_error);
    const area = store.areas.find((a) => a.id === input.area_id && a.is_active);
    if (!area) return fail("Wilayah pengiriman tidak valid.");
    if (!availableDates(store.settings, now).includes(input.delivery_date)) return fail(`Tanggal pengiriman tidak tersedia. Batas pemesanan untuk pengiriman besok pukul ${jam(store.settings.cutoff_time)} WIB.`);
    const slot = slotsForSegment(store.slots, segment).find((s) => s.id === input.slot_id);
    if (!slot) return fail("Jam pengiriman tidak tersedia untuk akun ini.");
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
      maps_url: input.maps_url?.trim() || null,
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
      customer_note: input.customer_note?.trim() ?? "",
      internal_note: "",
      created_at: created,
      history: [{ status: "new", at: created }],
      items,
    };
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
    if (o.payment_status === "unpaid") {
      o.payment_status = "awaiting_confirmation";
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
    const acc = store.accounts.find((a) => a.phone === p && a.status === "approved" && a.access_code && a.access_code.toUpperCase() === code.trim().toUpperCase());
    if (!acc) return null;
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
    if (o.status === "cancelled") return fail("Pesanan ini sudah dibatalkan.");
    if (status === "cancelled") {
      for (const i of o.items) {
        const v = store.products.find((p) => p.id === i.product_id)?.variants.find((x) => x.id === i.variant_id);
        if (v && v.stock_qty !== null) v.stock_qty += i.qty_ordered;
      }
      if (o.payment_status !== "paid") o.payment_status = "void";
    }
    o.status = status;
    o.history.push({ status, at: new Date().toISOString(), note });
    return ok(clone(o));
  },
  async weighOrder(id, items) {
    const store = getStore();
    const o = store.orders.find((x) => x.id === id);
    if (!o) return fail("Pesanan tidak ditemukan.");
    for (const w of items) {
      const it = o.items.find((i) => i.id === w.item_id);
      if (!it) return fail("Baris pesanan tidak ditemukan.");
      if (!(w.qty_final >= 0)) return fail("Berat harus berupa angka positif.");
      it.qty_final = w.qty_final;
      it.line_total_final = Math.round(it.unit_price * w.qty_final);
    }
    for (const it of o.items) if (!it.is_catch_weight && it.qty_final === null) { it.qty_final = it.qty_ordered; it.line_total_final = it.line_total_est; }
    const area = store.areas.find((a) => a.id === o.area_id);
    recomputeTotals(o, store.settings, area?.fee ?? 0);
    o.weighed_at = new Date().toISOString();
    o.history.push({ status: "weighed", at: o.weighed_at });
    return ok(clone(o));
  },
  async setPaymentStatus(id, status) {
    const o = getStore().orders.find((x) => x.id === id);
    if (!o) return fail("Pesanan tidak ditemukan.");
    o.payment_status = status;
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
      if (o.payment_status !== "paid") unpaid += total;
      if (o.has_catch_weight && !o.weighed_at) toWeigh++;
    }
    const productSales = os.reduce((s, o) => s + (o.subtotal_final ?? o.subtotal_est), 0);
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
        line.order_count++;
        if (i.prep_label) line.prep_notes.push(`${o.customer_name}: ${i.prep_label} ${i.qty_ordered} ${i.unit}`);
        map.set(k, line);
      }
    }
    const buf = store.settings.catch_weight_buffer_pct / 100;
    const out = [...map.values()].map((l) => ({ ...l, qty_with_buffer: l.storage_class === "chilled" ? Math.ceil(l.qty * (1 + buf) * 2) / 2 : l.qty }));
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
};
