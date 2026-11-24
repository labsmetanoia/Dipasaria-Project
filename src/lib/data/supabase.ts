// Production adapter: talks to Supabase with the service-role key from the Next.js server only.
// Money-related rules run inside the SQL functions (supabase/schema.sql); this file is plumbing.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Quotation,
  Refund,
  Campaign,
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
  BusinessAccount,
  BuyingLine,
  DailySummary,
  DeliveryArea,
  DeliverySlot,
  Order,
  OrderItem,
  Product,
  Promo,
  Settings,
  StandingOrder,
  StandingOrderRun,
  Variant,
} from "../types";
import type { Repo, Result, SalesRow } from "./repo";
import { addDays, normalizePhone, nowJakarta } from "../format";
import { newId } from "../ids";
import { campaignError } from "../campaigns";
import { cleanNpwp, quoteCode, quoteError } from "../sales";

let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

const ok = <T,>(data: T): Result<T> => ({ ok: true, data });
const fail = <T,>(error: string): Result<T> => ({ ok: false, error });
const msg = (e: unknown): string => {
  const m = (e as { message?: string })?.message ?? String(e);
  // PostgREST wraps raised exceptions; keep the human message only.
  return m.replace(/^.*?:\s*/, "").trim() || "Terjadi kesalahan.";
};

/** Escape LIKE wildcards so user input matches literally (case-insensitive exact match with ilike). */
const likeExact = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
/** Strip characters that carry meaning inside a PostgREST or() filter string. */
const filterSafe = (s: string) => s.replace(/[,()*%_\\:."]/g, " ").trim();

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

type Row = Record<string, unknown>;

function mapVariant(r: Row): Variant {
  return {
    id: r.id as string,
    product_id: r.product_id as string,
    label: r.label as string,
    label_en: (r.label_en as string | null) ?? null,
    unit: r.unit as Variant["unit"],
    min_qty: num(r.min_qty),
    step_qty: num(r.step_qty),
    price_retail: num(r.price_retail),
    price_business: num(r.price_business),
    cost: num(r.cost),
    stock_qty: numOrNull(r.stock_qty),
    business_only: Boolean(r.business_only),
    is_active: Boolean(r.is_active),
    sort: num(r.sort),
  };
}

function mapCampaign(r: Row): Campaign {
  const d = (x: unknown) => String(x).slice(0, 10);
  return {
    id: String(r.id), slug: String(r.slug), name: String(r.name), name_en: (r.name_en as string | null) ?? null,
    intro: (r.intro as string) ?? "", intro_en: (r.intro_en as string | null) ?? null, image_url: (r.image_url as string | null) ?? null,
    opens_on: d(r.opens_on), order_by: d(r.order_by), deliver_from: d(r.deliver_from), deliver_to: d(r.deliver_to),
    is_active: Boolean(r.is_active), created_at: String(r.created_at),
  };
}

function mapProduct(r: Row): Product {
  const variants = ((r.variants as Row[]) ?? []).map(mapVariant).sort((a, b) => a.sort - b.sort);
  const preps = ((r.prep_options as Row[]) ?? []).map((p) => ({
    id: p.id as string,
    product_id: p.product_id as string,
    label: p.label as string,
    label_en: (p.label_en as string | null) ?? null,
    surcharge: num(p.surcharge),
    note: (p.note as string | null) ?? null,
    note_en: (p.note_en as string | null) ?? null,
    sort: num(p.sort),
  })).sort((a, b) => a.sort - b.sort);
  return {
    id: r.id as string,
    slug: r.slug as string,
    category_id: r.category_id as string,
    name: r.name as string,
    name_en: (r.name_en as string | null) ?? null,
    scientific_name: (r.scientific_name as string | null) ?? null,
    aliases: (r.aliases as string[]) ?? [],
    description: (r.description as string) ?? "",
    description_en: (r.description_en as string | null) ?? null,
    origin: (r.origin as string) ?? "",
    origin_en: (r.origin_en as string | null) ?? null,
    storage_class: r.storage_class as Product["storage_class"],
    storage_note: (r.storage_note as string) ?? "",
    storage_note_en: (r.storage_note_en as string | null) ?? null,
    is_catch_weight: Boolean(r.is_catch_weight),
    available_today: Boolean(r.available_today),
    is_active: Boolean(r.is_active),
    is_featured: Boolean(r.is_featured),
    curated: Boolean(r.curated),
    weekly_contents: (r.weekly_contents as string | null) ?? "",
    weekly_contents_en: (r.weekly_contents_en as string | null) ?? null,
    weekly_contents_at: (r.weekly_contents_at as string | null) ?? null,
    campaign_id: (r.campaign_id as string | null) ?? null,
    image_url: (r.image_url as string | null) ?? null,
    icon: (r.icon as string) ?? "fish",
    sort: num(r.sort),
    variants,
    prep_options: preps,
  };
}

function mapItem(r: Row): OrderItem {
  return {
    id: r.id as string,
    order_id: r.order_id as string,
    product_id: r.product_id as string,
    variant_id: r.variant_id as string,
    category_id: r.category_id as string,
    product_name: r.product_name as string,
    variant_label: r.variant_label as string,
    unit: r.unit as OrderItem["unit"],
    storage_class: r.storage_class as OrderItem["storage_class"],
    is_catch_weight: Boolean(r.is_catch_weight),
    qty_ordered: num(r.qty_ordered),
    qty_final: numOrNull(r.qty_final),
    unit_price: num(r.unit_price),
    prep_option_id: (r.prep_option_id as string | null) ?? null,
    prep_label: (r.prep_label as string | null) ?? null,
    prep_surcharge: num(r.prep_surcharge),
    unit_cost: num(r.unit_cost),
    line_total_est: num(r.line_total_est),
    line_total_final: numOrNull(r.line_total_final),
  };
}

function mapOrder(r: Row): Order {
  return {
    id: r.id as string,
    code: r.code as string,
    segment: r.segment as Order["segment"],
    account_id: (r.account_id as string | null) ?? null,
    customer_name: r.customer_name as string,
    phone: r.phone as string,
    address: r.address as string,
    area_id: (r.area_id as string | null) ?? null,
    area_name: (r.area_name as string) ?? "",
    maps_url: (r.maps_url as string | null) ?? null,
    delivery_date: String(r.delivery_date).slice(0, 10),
    slot_id: (r.slot_id as string) ?? "",
    slot_label: (r.slot_label as string) ?? "",
    payment_method: r.payment_method as Order["payment_method"],
    payment_status: r.payment_status as Order["payment_status"],
    status: r.status as Order["status"],
    subtotal_est: num(r.subtotal_est),
    discount: num(r.discount),
    delivery_fee: num(r.delivery_fee),
    total_est: num(r.total_est),
    subtotal_final: numOrNull(r.subtotal_final),
    total_final: numOrNull(r.total_final),
    has_catch_weight: Boolean(r.has_catch_weight),
    weighed_at: (r.weighed_at as string | null) ?? null,
    pay_by: (r.pay_by as string | null) ?? null,
    wa_opt_in: r.wa_opt_in !== false,
    substitution: (r.substitution as Order["substitution"]) ?? "contact",
    delivered_at: (r.delivered_at as string | null) ?? null,
    delivery_note: (r.delivery_note as string | null) ?? null,
    cod_collected: numOrNull(r.cod_collected),
    due_date: r.due_date ? String(r.due_date).slice(0, 10) : null,
    client_ref: (r.client_ref as string | null) ?? null,
    gift_message: (r.gift_message as string | null) ?? null,
    gift_from: (r.gift_from as string | null) ?? null,
    recipient_phone: (r.recipient_phone as string | null) ?? null,
    campaign_id: (r.campaign_id as string | null) ?? null,
    promo_code: (r.promo_code as string | null) ?? null,
    customer_note: (r.customer_note as string) ?? "",
    internal_note: (r.internal_note as string) ?? "",
    created_at: r.created_at as string,
    history: (r.history as Order["history"]) ?? [],
    items: ((r.order_items as Row[]) ?? []).map(mapItem),
  };
}

function mapAccount(r: Row): BusinessAccount {
  return {
    id: r.id as string,
    business_name: r.business_name as string,
    contact_name: r.contact_name as string,
    phone: r.phone as string,
    address: (r.address as string) ?? "",
    area_id: (r.area_id as string | null) ?? null,
    business_type: (r.business_type as string) ?? "",
    discount_pct: num(r.discount_pct),
    payment_terms: r.payment_terms as BusinessAccount["payment_terms"],
    allow_cod: Boolean(r.allow_cod),
    status: r.status as BusinessAccount["status"],
    access_code: (r.access_code as string | null) ?? null,
    preferred_slot_id: (r.preferred_slot_id as string | null) ?? null,
    notes: (r.notes as string) ?? "",
    applied_at: r.applied_at as string,
    approved_at: (r.approved_at as string | null) ?? null,
    credit_limit: numOrNull(r.credit_limit),
    npwp: (r.npwp as string | null) ?? null,
    tax_name: (r.tax_name as string | null) ?? null,
    tax_address: (r.tax_address as string | null) ?? null,
  };
}

function mapPromo(r: Row): Promo {
  return {
    id: r.id as string,
    code: r.code as string,
    type: r.type as Promo["type"],
    value: num(r.value),
    min_spend: num(r.min_spend),
    segment: r.segment as Promo["segment"],
    quota: r.quota === null ? null : num(r.quota),
    used_count: num(r.used_count),
    first_order_only: Boolean(r.first_order_only),
    starts_at: (r.starts_at as string | null) ?? null,
    ends_at: (r.ends_at as string | null) ?? null,
    is_active: Boolean(r.is_active),
    description: (r.description as string) ?? "",
  };
}

const ORDER_SELECT = "*, order_items(*)";

async function fetchOrder(id: string): Promise<Order | null> {
  const { data, error } = await sb().from("orders").select(ORDER_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapOrder(data as Row) : null;
}

function mapContract(r: Row): ContractPrice {
  return {
    id: String(r.id), account_id: String(r.account_id), variant_id: String(r.variant_id), price: num(r.price),
    starts_on: String(r.starts_on).slice(0, 10), ends_on: r.ends_on ? String(r.ends_on).slice(0, 10) : null, note: String(r.note ?? ""), created_at: String(r.created_at),
  };
}

/** Contract prices still in force or starting later (for pricing), for one account or all. */
async function currentContracts(accountId?: string): Promise<ContractPrice[]> {
  let q = sb().from("contract_prices").select("*").or(`ends_on.is.null,ends_on.gte.${nowJakarta().date}`);
  if (accountId) q = q.eq("account_id", accountId);
  const { data, error } = await q;
  if (error) throw error;
  return (data as Row[]).map(mapContract);
}

async function fetchAccount(id: string): Promise<BusinessAccount | null> {
  const { data, error } = await sb().from("business_accounts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? { ...mapAccount(data as Row), contract_prices: await currentContracts(id) } : null;
}

export const supabaseRepo: Repo = {
  mode: "supabase",

  async getSettings() {
    const { data, error } = await sb().from("settings").select("*").eq("id", 1).single();
    if (error) throw error;
    const r = data as Row;
    return {
      ...(r as unknown as Settings),
      min_order_retail: num(r.min_order_retail),
      min_order_business: num(r.min_order_business),
      free_delivery_retail: num(r.free_delivery_retail),
      free_delivery_business: num(r.free_delivery_business),
      catch_weight_buffer_pct: num(r.catch_weight_buffer_pct),
      max_days_ahead: num(r.max_days_ahead),
      payment_window_minutes: num(r.payment_window_minutes),
      terms_grace_days: r.terms_grace_days === undefined || r.terms_grace_days === null ? 3 : num(r.terms_grace_days),
      npwp: (r.npwp as string | null) ?? null,
      legal_name: (r.legal_name as string | null) ?? null,
    };
  },
  async getCategories() {
    const { data, error } = await sb().from("categories").select("*").order("sort");
    if (error) throw error;
    return (data as Row[]).map((r) => ({ ...(r as object), sort: num(r.sort), is_seafood: Boolean(r.is_seafood) })) as never;
  },
  async getProducts(opts) {
    let q = sb().from("products").select("*, variants(*), prep_options(*)").order("sort");
    if (!opts?.includeInactive) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Row[]).map(mapProduct).map((p) => ({ ...p, variants: p.variants.filter((v) => opts?.includeInactive || v.is_active).map((v) => (opts?.includeCost ? v : { ...v, cost: 0 })) }));
  },
  async getProductBySlug(slug) {
    const { data, error } = await sb().from("products").select("*, variants(*), prep_options(*)").eq("slug", slug).eq("is_active", true).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const p = mapProduct(data as Row);
    return { ...p, variants: p.variants.map((v) => ({ ...v, cost: 0 })) };
  },
  async getAreas(opts) {
    let q = sb().from("delivery_areas").select("*").order("sort");
    if (!opts?.includeInactive) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Row[]).map((r) => ({ id: r.id as string, name: r.name as string, fee: num(r.fee), is_active: Boolean(r.is_active), sort: num(r.sort) }));
  },
  async getCampaigns(opts) {
    let q = sb().from("campaigns").select("*").order("deliver_from", { ascending: false });
    if (!opts?.includeInactive) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Row[]).map(mapCampaign);
  },
  async saveCampaign(c) {
    const err = campaignError(c);
    if (err) return fail(err);
    const row = { slug: c.slug, name: c.name.trim(), name_en: c.name_en, intro: c.intro, intro_en: c.intro_en, image_url: c.image_url, opens_on: c.opens_on, order_by: c.order_by, deliver_from: c.deliver_from, deliver_to: c.deliver_to, is_active: c.is_active };
    const res = c.id
      ? await sb().from("campaigns").update(row).eq("id", c.id).select("*").maybeSingle()
      : await sb().from("campaigns").insert({ ...row, id: newId("cm") }).select("*").single();
    if (res.error) return fail(res.error.code === "23505" ? "Alamat halaman ini sudah dipakai pre-order lain." : msg(res.error));
    return res.data ? ok(mapCampaign(res.data as Row)) : fail("Pre-order tidak ditemukan.");
  },
  async getSlots(opts) {
    let q = sb().from("delivery_slots").select("*").order("sort");
    if (!opts?.includeInactive) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Row[]).map((r) => ({ ...(r as object), capacity: num(r.capacity), sort: num(r.sort) })) as DeliverySlot[];
  },
  async getPromoByCode(code) {
    const { data, error } = await sb().from("promos").select("*").ilike("code", likeExact(code.trim())).maybeSingle();
    if (error) throw error;
    return data ? mapPromo(data as Row) : null;
  },
  async getSlotUsage(dates) {
    if (!dates.length) return {};
    const { data, error } = await sb().from("orders").select("delivery_date, slot_id").in("delivery_date", dates).neq("status", "cancelled");
    if (error) throw error;
    const out: Record<string, number> = {};
    for (const r of data as Row[]) {
      const k = `${String(r.delivery_date).slice(0, 10)}|${r.slot_id}`;
      out[k] = (out[k] ?? 0) + 1;
    }
    return out;
  },

  async hasOrderedBefore(phone) {
    const { count, error } = await sb().from("orders").select("id", { count: "exact", head: true }).eq("phone", normalizePhone(phone)).neq("status", "cancelled");
    if (error) throw error;
    return (count ?? 0) > 0;
  },
  async placeOrder(input, account) {
    // the SQL function reads flat fields: is_gift, recipient_phone, gift_message, gift_from
    const { gift, ...rest } = input;
    const p = gift ? { ...rest, is_gift: "true", recipient_phone: gift.recipient_phone, gift_message: gift.message, gift_from: gift.from } : rest;
    const { data, error } = await sb().rpc("place_order", { p, p_account_id: account?.id ?? null });
    if (error) return fail(msg(error));
    const order = await fetchOrder(data as string);
    return order ? ok(order) : fail("Pesanan tidak ditemukan setelah dibuat.");
  },
  async lookupOrder(code, phone) {
    // Exact match: the code is half of the "code + phone" check, so it must never act as a pattern.
    const { data, error } = await sb().from("orders").select(ORDER_SELECT).eq("code", code.trim().toUpperCase()).eq("phone", normalizePhone(phone)).maybeSingle();
    if (error) throw error;
    return data ? mapOrder(data as Row) : null;
  },
  async customerConfirmPayment(code, phone) {
    const { data, error } = await sb().rpc("customer_confirm_payment", { p_code: code, p_phone: phone });
    if (error) return fail(msg(error));
    const o = await fetchOrder(data as string);
    return o ? ok(o) : fail("Pesanan tidak ditemukan.");
  },
  async getOrdersForAccount(accountId, limit = 20) {
    const { data, error } = await sb().from("orders").select(ORDER_SELECT).eq("account_id", accountId).order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return (data as Row[]).map(mapOrder);
  },

  async applyAccount(input) {
    const { data, error } = await sb().rpc("apply_account", { p: input });
    if (error) return fail(msg(error));
    const a = await fetchAccount(data as string);
    return a ? ok(a) : fail("Akun tidak ditemukan.");
  },
  async businessLogin(phone, code) {
    const { data, error } = await sb().rpc("business_login", { p_phone: phone, p_code: code });
    if (error && /Terlalu banyak/.test(error.message)) throw new Error(msg(error)); // lockout: tell the user, don't look like a wrong code
    if (error || !data) return null;
    const account = await this.getAccountBySession(data as string);
    return account ? { token: data as string, account } : null;
  },
  async getAccountBySession(token) {
    const { data, error } = await sb().from("business_sessions").select("account_id, expires_at").eq("token", token).maybeSingle();
    if (error || !data) return null;
    if (new Date(data.expires_at as string) < new Date()) return null;
    const a = await fetchAccount(data.account_id as string);
    return a && a.status === "approved" ? a : null;
  },
  async endSession(token) {
    await sb().from("business_sessions").delete().eq("token", token);
  },

  async listOrders(filter) {
    let q = sb().from("orders").select(ORDER_SELECT).order("delivery_date").order("slot_label").order("created_at").limit(filter.limit ?? 200);
    if (filter.date) q = q.eq("delivery_date", filter.date);
    if (filter.status === "open") q = q.not("status", "in", "(completed,cancelled)");
    else if (filter.status) q = q.eq("status", filter.status);
    if (filter.segment) q = q.eq("segment", filter.segment);
    if (filter.campaignId) q = q.eq("campaign_id", filter.campaignId);
    if (filter.q) {
      const s = filterSafe(filter.q);
      q = q.or(`code.ilike.%${s}%,customer_name.ilike.%${s}%,phone.ilike.%${s}%`);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data as Row[]).map(mapOrder);
  },
  async getOrder(id) { return fetchOrder(id); },
  async updateOrderStatus(id, status, note) {
    const { error } = await sb().rpc("set_order_status", { p_order_id: id, p_status: status, p_note: note ?? null });
    if (error) return fail(msg(error));
    return ok((await fetchOrder(id))!);
  },
  async weighOrder(id, items) {
    const { error } = await sb().rpc("weigh_order", { p_order_id: id, p_items: items });
    if (error) return fail(msg(error));
    return ok((await fetchOrder(id))!);
  },
  async setPaymentStatus(id, status) {
    const { error } = await sb().rpc("set_payment_status", { p_order_id: id, p_status: status });
    if (error) return fail(msg(error));
    return ok((await fetchOrder(id))!);
  },
  async updateOrderInternalNote(id, note) {
    const { error } = await sb().from("orders").update({ internal_note: note }).eq("id", id);
    if (error) return fail(msg(error));
    return ok((await fetchOrder(id))!);
  },
  async dailySummary(date) {
    const { data, error } = await sb().rpc("daily_summary", { p_date: date });
    if (error) throw error;
    const d = data as Row;
    return {
      date,
      orders_total: num(d.orders_total),
      orders_retail: num(d.orders_retail),
      orders_business: num(d.orders_business),
      sales: num(d.sales),
      est_cost: num(d.est_cost),
      est_gross_profit: num(d.est_gross_profit),
      margin_pct: num(d.margin_pct),
      non_seafood_share_pct: num(d.non_seafood_share_pct),
      unpaid_amount: num(d.unpaid_amount),
      to_weigh: num(d.to_weigh),
      by_status: (d.by_status as DailySummary["by_status"]) ?? { new: 0, confirmed: 0, packing: 0, delivering: 0, completed: 0, cancelled: 0 },
    };
  },
  async buyingList(date) {
    const { data, error } = await sb().rpc("buying_list", { p_date: date });
    if (error) throw error;
    return (data as Row[]).map((r) => ({
      ...(r as unknown as BuyingLine),
      qty: num(r.qty),
      qty_with_buffer: num(r.qty_with_buffer),
      order_count: num(r.order_count),
      prep_notes: (r.prep_notes as string[]) ?? [],
    }));
  },
  async salesReport(from, to) {
    const { data, error } = await sb().rpc("sales_report", { p_from: from, p_to: to });
    if (error) throw error;
    return (data as Row[]).map((r) => ({
      date: String(r.date).slice(0, 10),
      orders: num(r.orders),
      sales: num(r.sales),
      gross_profit: num(r.gross_profit),
      non_seafood_sales: num(r.non_seafood_sales),
    })) as SalesRow[];
  },

  async listAccounts() {
    const { data, error } = await sb().from("business_accounts").select("*").order("applied_at", { ascending: false });
    if (error) throw error;
    const contracts = await currentContracts();
    return (data as Row[]).map((r) => { const a = mapAccount(r); return { ...a, contract_prices: contracts.filter((c) => c.account_id === a.id) }; }).sort((a, b) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1));
  },
  async getAccount(id) { return fetchAccount(id); },
  async approveAccount(id, patch) {
    const { error } = await sb().rpc("approve_account", { p_id: id, p_discount: patch.discount_pct, p_terms: patch.payment_terms, p_cod: patch.allow_cod, p_slot: patch.preferred_slot_id ?? null });
    if (error) return fail(msg(error));
    return ok((await fetchAccount(id))!);
  },
  async updateAccount(id, patch) {
    const { id: _id, contract_prices: _cp, ...rest } = patch;
    void _id; void _cp;
    const { error } = await sb().from("business_accounts").update(rest).eq("id", id);
    if (error) return fail(msg(error));
    return ok((await fetchAccount(id))!);
  },
  async regenerateAccessCode(id) {
    const { error } = await sb().rpc("regenerate_access_code", { p_id: id });
    if (error) return fail(msg(error));
    return ok((await fetchAccount(id))!);
  },

  async upsertProduct(p) {
    const { error } = await sb().from("products").upsert({ ...p, id: p.id || newId("p") });
    if (error) return fail(msg(error));
    // read back by slug including inactive products (saving a product that is switched off is valid)
    const prod = (await this.getProducts({ includeInactive: true, includeCost: true })).find((x) => x.slug === p.slug);
    return prod ? ok(prod) : fail("Produk tidak ditemukan.");
  },
  async updateVariant(id, patch) {
    const { id: _id, product_id: _pid, ...rest } = patch;
    void _id; void _pid;
    const { data, error } = await sb().from("variants").update(rest).eq("id", id).select("*").single();
    if (error) return fail(msg(error));
    return ok(mapVariant(data as Row));
  },
  async createVariant(v) {
    const { data, error } = await sb().from("variants").insert({ ...v, id: newId("v") }).select("*").single();
    if (error) return fail(msg(error));
    return ok(mapVariant(data as Row));
  },
  async setProductAvailability(productId, available) {
    const { error } = await sb().from("products").update({ available_today: available }).eq("id", productId);
    if (error) return fail(msg(error));
    return ok(undefined);
  },
  async upsertPrepOption(p) {
    const { error } = await sb().from("prep_options").upsert({ ...p, id: p.id || newId("pp") });
    if (error) return fail(msg(error));
    return ok(undefined);
  },
  async deletePrepOption(id) {
    const { error } = await sb().from("prep_options").delete().eq("id", id);
    if (error) return fail(msg(error));
    return ok(undefined);
  },

  async listPromos() {
    const { data, error } = await sb().from("promos").select("*").order("code");
    if (error) throw error;
    return (data as Row[]).map(mapPromo);
  },
  async upsertPromo(p) {
    const { data, error } = await sb().from("promos").upsert({ ...p, id: p.id || newId("pr"), code: p.code.toUpperCase() }).select("*").single();
    if (error) return fail(msg(error));
    return ok(mapPromo(data as Row));
  },
  async deletePromo(id) {
    const { error } = await sb().from("promos").delete().eq("id", id);
    if (error) return fail(msg(error));
    return ok(undefined);
  },

  async updateSettings(patch) {
    const { error } = await sb().from("settings").update(patch).eq("id", 1);
    if (error) return fail(msg(error));
    return ok(await this.getSettings());
  },
  async upsertArea(a) {
    const { data, error } = await sb().from("delivery_areas").upsert({ ...a, id: a.id || newId("a") }).select("*").single();
    if (error) return fail(msg(error));
    const r = data as Row;
    return ok({ id: r.id as string, name: r.name as string, fee: num(r.fee), is_active: Boolean(r.is_active), sort: num(r.sort) } as DeliveryArea);
  },
  async upsertSlot(s) {
    const { data, error } = await sb().from("delivery_slots").upsert({ ...s, id: s.id || newId("s") }).select("*").single();
    if (error) return fail(msg(error));
    return ok({ ...(data as object), capacity: num((data as Row).capacity), sort: num((data as Row).sort) } as DeliverySlot);
  },

  async listStandingOrders(filter) {
    let q = sb().from("standing_orders").select("*").order("created_at");
    if (filter?.accountId) q = q.eq("account_id", filter.accountId);
    if (filter?.customerId) q = q.eq("customer_id", filter.customerId);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Row[]).map(mapStanding);
  },
  async saveBox(customerId, input) {
    const row = {
      customer_id: customerId,
      name: input.name.trim() || "Kotak mingguan",
      weekdays: [...new Set(input.weekdays)].sort(),
      slot_id: input.slot_id,
      payment_method: input.payment_method,
      lines: input.lines.filter((l) => l.qty > 0).map((l) => ({ variant_id: l.variant_id, qty: l.qty, prep_option_id: l.prep_option_id ?? null })),
      note: input.note ?? null,
      address_id: input.address_id,
      every_weeks: input.every_weeks,
      anchor_date: input.anchor_date,
      updated_at: new Date().toISOString(),
    };
    const res = input.id
      ? await sb().from("standing_orders").update(row).eq("id", input.id).eq("customer_id", customerId).select("*").single()
      : await sb().from("standing_orders").insert({ ...row, id: newId("so") }).select("*").single();
    if (res.error) return fail(msg(res.error));
    return ok(mapStanding(res.data as Row));
  },
  async saveStandingOrder(accountId, input) {
    const row = {
      account_id: accountId,
      name: input.name.trim() || "Pesanan rutin",
      weekdays: [...new Set(input.weekdays)].sort(),
      slot_id: input.slot_id,
      payment_method: input.payment_method,
      lines: input.lines.filter((l) => l.qty > 0).map((l) => ({ variant_id: l.variant_id, qty: l.qty, prep_option_id: l.prep_option_id ?? null })),
      note: input.note ?? null,
      updated_at: new Date().toISOString(),
    };
    const res = input.id
      ? await sb().from("standing_orders").update(row).eq("id", input.id).eq("account_id", accountId).select("*").single()
      : await sb().from("standing_orders").insert({ ...row, id: newId("so") }).select("*").single();
    if (res.error) return fail(msg(res.error));
    return ok(mapStanding(res.data as Row));
  },
  async setStandingOrderStatus(id, status, reason) {
    const { data, error } = await sb().from("standing_orders").update({ status, paused_reason: status === "paused" ? reason ?? null : null, updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
    if (error) return fail(msg(error));
    return ok(mapStanding(data as Row));
  },
  async setStandingSkip(id, date, skip) {
    const { data: cur, error: e1 } = await sb().from("standing_orders").select("skip_dates").eq("id", id).single();
    if (e1) return fail(msg(e1));
    const set = new Set(((cur as Row).skip_dates as string[] | null ?? []).map((d) => String(d).slice(0, 10)));
    if (skip) set.add(date); else set.delete(date);
    const { data, error } = await sb().from("standing_orders").update({ skip_dates: [...set].sort(), updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
    if (error) return fail(msg(error));
    return ok(mapStanding(data as Row));
  },
  async deleteStandingOrder(id) {
    const { error } = await sb().from("standing_orders").delete().eq("id", id);
    return error ? fail(msg(error)) : ok(undefined);
  },
  async listStandingRuns(filter) {
    let q = sb().from("standing_order_runs").select("*").order("created_at", { ascending: false }).limit(filter?.limit ?? 100);
    if (filter?.date) q = q.eq("delivery_date", filter.date);
    if (filter?.standingOrderId) q = q.eq("standing_order_id", filter.standingOrderId);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Row[]).map(mapRun);
  },
  async claimStandingRun(standingOrderId, date) {
    // The unique (standing_order_id, delivery_date) key makes this the lock: a second claim fails with 23505.
    const { data, error } = await sb().from("standing_order_runs").insert({ id: newId("sr"), standing_order_id: standingOrderId, delivery_date: date }).select("*").single();
    if (error) {
      if ((error as { code?: string }).code !== "23505") throw error;
      // Already claimed: take it over only if that attempt failed (no order, an error recorded), so failures can be retried.
      const { data: retry, error: e2 } = await sb().from("standing_order_runs").update({ error: null, created_at: new Date().toISOString() })
        .eq("standing_order_id", standingOrderId).eq("delivery_date", date).is("order_id", null)
        // failed runs, or runs that stopped half-way more than 10 minutes ago (the order is protected by its client_ref)
        .or(`error.not.is.null,created_at.lt.${new Date(Date.now() - 600_000).toISOString()}`).select("*").maybeSingle();
      if (e2) throw e2;
      return retry ? mapRun(retry as Row) : null;
    }
    return mapRun(data as Row);
  },
  async finishStandingRun(runId, patch) {
    const { error } = await sb().from("standing_order_runs").update({ order_id: patch.order_id ?? null, order_code: patch.order_code ?? null, error: patch.error ?? null, note: patch.note ?? null }).eq("id", runId);
    if (error) throw error;
  },

  async hitRateLimit(key, windowSeconds, max) {
    const { data, error } = await sb().rpc("hit_rate_limit", { p_key: key, p_window_seconds: windowSeconds, p_max: max });
    if (error) throw error;
    return Boolean(data);
  },
  async expireUnpaidOrders() {
    const { data, error } = await sb().rpc("expire_unpaid_orders");
    if (error) throw error;
    return num(data);
  },
  async setWeeklyContents(productId, text, textEn) {
    const { error } = await sb().from("products").update({ weekly_contents: text, weekly_contents_en: textEn, weekly_contents_at: new Date().toISOString() }).eq("id", productId).eq("curated", true);
    return error ? fail(msg(error)) : ok(undefined);
  },
  async setOrderPayBy(id, payBy) {
    const { error } = await sb().from("orders").update({ pay_by: payBy }).eq("id", id);
    if (error) return fail(msg(error));
    const o = await fetchOrder(id);
    return o ? ok(o) : fail("Pesanan tidak ditemukan.");
  },
  async logError(e) {
    const { data, error } = await sb().rpc("log_error", { p_source: e.source, p_message: e.message, p_path: e.path ?? "", p_digest: e.digest ?? null, p_detail: e.detail ?? null });
    if (error) throw error;
    return num(data);
  },
  async listErrors(opts) {
    let q = sb().from("error_events").select("*").order("last_at", { ascending: false }).limit(opts?.limit ?? 100);
    if (!opts?.includeResolved) q = q.eq("resolved", false);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Row[]).map((r) => ({ ...(r as unknown as AppError), count: num(r.count) }));
  },
  async resolveErrors(fingerprints) {
    let q = sb().from("error_events").update({ resolved: true });
    q = fingerprints === "all" ? q.eq("resolved", false) : q.in("fingerprint", fingerprints);
    const { error } = await q;
    if (error) throw error;
  },
  async recordJob(job, result) {
    const { error } = await sb().from("job_runs").upsert({ job, last_at: new Date().toISOString(), result });
    if (error) throw error;
  },
  async listJobs() {
    const { data, error } = await sb().from("job_runs").select("*");
    if (error) throw error;
    return (data as Row[]).map((r) => ({ job: String(r.job), last_at: String(r.last_at), result: String(r.result ?? "") }));
  },
  async ping() {
    const { error } = await sb().from("settings").select("id").eq("id", 1).single();
    return !error;
  },

  async createPayment(p) {
    const { data, error } = await sb().from("payments").insert({ ...p }).select("*").single();
    if (error) throw error;
    return mapPayment(data as Row);
  },
  async listPayments(orderId) {
    const { data, error } = await sb().from("payments").select("*").eq("order_id", orderId).order("created_at", { ascending: false });
    if (error) throw error;
    return (data as Row[]).map(mapPayment);
  },
  async listAccountGatewayPayments(accountId) {
    const { data, error } = await sb().from("payments").select("*").eq("account_id", accountId).order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return (data as Row[]).map(mapPayment);
  },
  async getPayment(id) {
    const { data, error } = await sb().from("payments").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapPayment(data as Row) : null;
  },
  async recordGatewayPayment(id, status, amount, raw) {
    const { data, error } = await sb().rpc("record_gateway_payment", { p_payment_id: id, p_status: status, p_amount: amount, p_raw: raw ?? null });
    if (error) throw new Error(msg(error));
    return data as GatewayOutcome;
  },

  async enqueueWa(m) {
    const { data, error } = await sb().from("wa_messages").insert({ ...m }).select("*").maybeSingle();
    if (error) {
      if ((error as { code?: string }).code === "23505") return null; // already queued or sent
      throw error;
    }
    return data ? mapWa(data as Row) : null;
  },
  async claimWa(id, attempts) {
    const stuck = new Date(Date.now() - 300_000).toISOString();
    const { data, error } = await sb().from("wa_messages").update({ status: "sending", attempts: attempts + 1, sent_at: new Date().toISOString() })
      .eq("id", id).eq("attempts", attempts).or(`status.in.(queued,failed),and(status.eq.sending,sent_at.lt.${stuck})`).select("id");
    if (error) throw error;
    return (data ?? []).length === 1;
  },
  async updateWa(id, patch) {
    const { error } = await sb().from("wa_messages").update(patch).eq("id", id);
    if (error) throw error;
  },
  async listWa(orderId) {
    const { data, error } = await sb().from("wa_messages").select("*").eq("order_id", orderId).order("created_at");
    if (error) throw error;
    return (data as Row[]).map(mapWa);
  },
  async listWaRecent(limit, statuses) {
    let q = sb().from("wa_messages").select("*").order("created_at", { ascending: false }).limit(limit);
    if (statuses?.length) q = q.in("status", statuses);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Row[]).map(mapWa);
  },
  async getWa(id) {
    const { data, error } = await sb().from("wa_messages").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapWa(data as Row) : null;
  },
  async listWaPending(limit) {
    const since = new Date(Date.now() - 86400_000).toISOString();
    const stuck = new Date(Date.now() - 300_000).toISOString();
    const { data, error } = await sb().from("wa_messages").select("*").or(`status.eq.queued,and(status.eq.failed,attempts.lt.3),and(status.eq.sending,sent_at.lt.${stuck})`).gt("created_at", since).order("created_at").limit(limit);
    if (error) throw error;
    return (data as Row[]).map(mapWa);
  },
  async listOrdersPayBySoon(minutes) {
    const now = new Date();
    const { data, error } = await sb().from("orders").select(ORDER_SELECT).eq("payment_status", "unpaid").in("status", ["new", "confirmed"])
      .gt("pay_by", now.toISOString()).lte("pay_by", new Date(now.getTime() + minutes * 60_000).toISOString()).limit(200);
    if (error) throw error;
    return (data as Row[]).map(mapOrder);
  },
  async customerRequestCode(phone, codeHash) {
    const { data, error } = await sb().rpc("customer_request_code", { p_phone: phone, p_code_hash: codeHash });
    return error ? fail(msg(error)) : ok(String(data));
  },
  async customerLogin(phone, codeHash, tokenHash) {
    const { data, error } = await sb().rpc("customer_login", { p_phone: phone, p_code_hash: codeHash, p_token_hash: tokenHash });
    if (error) throw new Error(msg(error));
    const s = String(data);
    return s.startsWith("ok:") ? { status: "ok", customerId: s.slice(3) } : { status: s as "wrong" | "expired" | "locked" };
  },
  async getCustomerBySession(tokenHash) {
    const { data, error } = await sb().from("customer_sessions").select("expires_at, customers(*)").eq("token_hash", tokenHash).maybeSingle();
    if (error) throw error;
    if (!data || Date.parse(String((data as Row).expires_at)) < Date.now()) return null;
    const c = (data as Row).customers as Row | null;
    return c ? mapCustomer(c) : null;
  },
  async getCustomer(id) {
    const { data, error } = await sb().from("customers").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapCustomer(data as Row) : null;
  },
  async endCustomerSession(tokenHash) {
    await sb().from("customer_sessions").delete().eq("token_hash", tokenHash);
  },
  async updateCustomer(id, patch) {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.marketing_opt_in !== undefined) {
      // the consent date records when it was given: only change it when the answer changes
      const { data: cur } = await sb().from("customers").select("marketing_opt_in").eq("id", id).maybeSingle();
      if (!cur || Boolean((cur as Row).marketing_opt_in) !== patch.marketing_opt_in) { row.marketing_opt_in = patch.marketing_opt_in; row.marketing_opt_in_at = patch.marketing_opt_in ? new Date().toISOString() : null; }
    }
    if (!Object.keys(row).length) { const { data } = await sb().from("customers").select("*").eq("id", id).maybeSingle(); return data ? mapCustomer(data as Row) : null; }
    const { data, error } = await sb().from("customers").update(row).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    return data ? mapCustomer(data as Row) : null;
  },
  async deleteCustomer(id) {
    const { error } = await sb().from("customers").delete().eq("id", id); // addresses and sessions cascade
    if (error) throw error;
  },
  async listCustomers(limit) {
    const { data, error } = await sb().from("customers").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return (data as Row[]).map(mapCustomer);
  },
  async listAddresses(customerId) {
    const { data, error } = await sb().from("customer_addresses").select("*").eq("customer_id", customerId).order("is_default", { ascending: false }).order("created_at");
    if (error) throw error;
    return (data as Row[]).map(mapAddress);
  },
  async saveAddress(customerId, a) {
    const mine = await this.listAddresses(customerId);
    if (a.id && !mine.some((x) => x.id === a.id)) return fail("Alamat tidak ditemukan.");
    if (!a.id && mine.length >= 10) return fail("Maksimal 10 alamat tersimpan.");
    const isDefault = a.is_default || mine.length === 0;
    if (isDefault) await sb().from("customer_addresses").update({ is_default: false }).eq("customer_id", customerId);
    const row = { customer_id: customerId, label: a.label, recipient: a.recipient, address: a.address, area_id: a.area_id, maps_url: a.maps_url, is_default: isDefault };
    const res = a.id
      ? await sb().from("customer_addresses").update(row).eq("id", a.id).eq("customer_id", customerId).select("*").single()
      : await sb().from("customer_addresses").insert({ ...row, id: newId("ca") }).select("*").single();
    return res.error ? fail(msg(res.error)) : ok(mapAddress(res.data as Row));
  },
  async deleteAddress(customerId, id) {
    const { data } = await sb().from("customer_addresses").delete().eq("id", id).eq("customer_id", customerId).select("is_default").maybeSingle();
    if ((data as Row | null)?.is_default) {
      const rest = await this.listAddresses(customerId);
      if (rest[0]) await sb().from("customer_addresses").update({ is_default: true }).eq("id", rest[0].id);
    }
  },
  async getOrdersByPhone(phone, limit) {
    const { data, error } = await sb().from("orders").select(ORDER_SELECT).eq("phone", normalizePhone(phone)).eq("segment", "retail").order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return (data as Row[]).map(mapOrder);
  },
  async markDelivered(id, note, cod) {
    const { error } = await sb().rpc("mark_delivered", { p_order_id: id, p_note: note, p_cod: cod });
    if (error) return fail(msg(error));
    const o = await fetchOrder(id);
    return o ? ok(o) : fail("Pesanan tidak ditemukan.");
  },
  async createClaim(code, phone, c, windowHours) {
    const { data, error } = await sb().rpc("create_claim", { p_code: code, p_phone: phone, p_items: c.items, p_reason: c.reason, p_note: c.note, p_photos: c.photos, p_window_hours: windowHours });
    return error ? fail(msg(error)) : ok(String(data));
  },
  async resolveClaim(id, status, note, refund) {
    const { data, error } = await sb().rpc("resolve_claim", { p_id: id, p_status: status, p_note: note, p_refund: refund });
    return error ? fail(msg(error)) : ok(String(data));
  },
  async listClaims(filter) {
    let q = sb().from("claims").select("*").order("created_at", { ascending: false }).limit(filter?.limit ?? 100);
    if (filter?.status) q = q.eq("status", filter.status);
    if (filter?.orderId) q = q.eq("order_id", filter.orderId);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Row[]).map((r) => ({
      id: String(r.id), order_id: String(r.order_id), items: (r.items as Claim["items"]) ?? [], reason: r.reason as Claim["reason"], note: String(r.note ?? ""),
      photos: ((r.photos as string[]) ?? []).map(String), status: r.status as Claim["status"], resolution_note: String(r.resolution_note ?? ""),
      refund_amount: numOrNull(r.refund_amount), created_at: String(r.created_at), resolved_at: (r.resolved_at as string | null) ?? null,
    }));
  },
  async addStockAlert(productId, phone) {
    const { error } = await sb().from("stock_alerts").upsert({ id: newId("sa"), product_id: productId, phone: normalizePhone(phone), notified_at: null }, { onConflict: "product_id,phone" });
    if (error) throw error;
  },
  async takeStockAlerts(productId) {
    // mark first, then read what this call marked: two admins saving at once cannot notify anyone twice
    const stamp = new Date().toISOString();
    const { data, error } = await sb().from("stock_alerts").update({ notified_at: stamp }).eq("product_id", productId).is("notified_at", null).select("phone");
    if (error) throw error;
    return ((data as Row[]) ?? []).map((r) => String(r.phone));
  },
  async stockAlertCounts() {
    const { data, error } = await sb().from("stock_alerts").select("product_id").is("notified_at", null).limit(5000);
    if (error) throw error;
    const out: Record<string, number> = {};
    for (const r of (data as Row[]) ?? []) out[String(r.product_id)] = (out[String(r.product_id)] ?? 0) + 1;
    return out;
  },
  async addPurchase(p) {
    const { data, error } = await sb().from("purchases").insert({ ...p, id: newId("pu") }).select("*").single();
    return error ? fail(msg(error)) : ok(mapPurchase(data as Row));
  },
  async deletePurchase(id) {
    const { error } = await sb().from("purchases").delete().eq("id", id);
    if (error) throw error;
  },
  async listPurchases(filter) {
    let q = sb().from("purchases").select("*").order("created_at");
    if (filter.date) q = q.eq("delivery_date", filter.date);
    if (filter.from) q = q.gte("delivery_date", filter.from);
    if (filter.to) q = q.lte("delivery_date", filter.to);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Row[]).map(mapPurchase);
  },

  async listReceivables(filter) {
    // Two years of tempo history is plenty for statements and stays small (a few hundred rows per restaurant).
    const since = addDays(nowJakarta().date, -730);
    let oq = sb().from("orders").select("*").eq("payment_method", "terms").neq("status", "cancelled").not("account_id", "is", null).gte("delivery_date", since).limit(5000);
    let pq = sb().from("account_payments").select("*").gte("paid_on", since).limit(5000);
    let aq = sb().from("payment_allocations").select("*, account_payments!inner(account_id, paid_on)").gte("account_payments.paid_on", since).limit(10000);
    if (filter?.accountId) {
      oq = oq.eq("account_id", filter.accountId);
      pq = pq.eq("account_id", filter.accountId);
      aq = aq.eq("account_payments.account_id", filter.accountId);
    }
    const [o, p, a] = await Promise.all([oq, pq, aq]);
    if (o.error) throw o.error;
    if (p.error) throw p.error;
    if (a.error) throw a.error;
    return {
      orders: (o.data as Row[]).map(mapOrder),
      payments: (p.data as Row[]).map((r) => ({
        id: String(r.id), account_id: String(r.account_id), amount: num(r.amount), paid_on: String(r.paid_on).slice(0, 10), method: r.method as AccountPayment["method"],
        reference: String(r.reference ?? ""), note: String(r.note ?? ""), created_at: String(r.created_at),
      })),
      allocations: (a.data as Row[]).map((r): PaymentAllocation => ({ id: String(r.id), payment_id: String(r.payment_id), order_id: String(r.order_id), amount: num(r.amount), created_at: String(r.created_at) })),
    };
  },
  async recordAccountPayment(accountId, p) {
    const { data, error } = await sb().rpc("record_account_payment", { p_account_id: accountId, p_amount: p.amount, p_paid_on: p.paid_on, p_method: p.method, p_reference: p.reference, p_note: p.note });
    return error ? fail(msg(error)) : ok(String(data));
  },
  async deleteAccountPayment(id) {
    const { error } = await sb().rpc("delete_account_payment", { p_id: id });
    return error ? fail(msg(error)) : ok(undefined);
  },
  async listContractPrices(accountId) {
    let q = sb().from("contract_prices").select("*").order("variant_id").order("starts_on", { ascending: false });
    if (accountId) q = q.eq("account_id", accountId);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Row[]).map(mapContract);
  },
  async addContractPrice(c) {
    const { data, error } = await sb().from("contract_prices").insert({ ...c, id: newId("cp") }).select("*").single();
    if (error) return fail((error as { code?: string }).code === "23505" ? "Sudah ada harga kontrak untuk produk ini yang mulai pada tanggal itu." : msg(error));
    return ok(mapContract(data as Row));
  },
  async deleteContractPrice(id) {
    const { error } = await sb().from("contract_prices").delete().eq("id", id);
    if (error) throw error;
  },

  async recordRefund(orderId, r) {
    const { data, error } = await sb().rpc("record_refund", { p_order_id: orderId, p_amount: r.amount, p_on: r.refunded_on, p_method: r.method, p_reference: r.reference, p_proof: r.proof, p_note: r.note, p_claim_id: r.claim_id ?? null });
    return error ? fail(msg(error)) : ok(String(data));
  },
  async listRefunds(filter = {}) {
    let q = sb().from("refunds").select("*, orders(code, customer_name)").order("refunded_on", { ascending: false }).order("created_at", { ascending: false }).limit(500);
    if (filter.orderId) q = q.eq("order_id", filter.orderId);
    if (filter.from) q = q.gte("refunded_on", filter.from);
    if (filter.to) q = q.lte("refunded_on", filter.to);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Row[]).map(mapRefund);
  },

  async listQuotes() {
    const { data, error } = await sb().from("quotes").select("*").order("created_at", { ascending: false }).limit(300);
    if (error) throw error;
    return (data as Row[]).map(mapQuotation);
  },
  async getQuote(id) {
    const { data, error } = await sb().from("quotes").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapQuotation(data as Row) : null;
  },
  async saveQuote(q) {
    const today = nowJakarta().date;
    const products = await this.getProducts();
    const err = quoteError(q, products, today);
    if (err) return fail(err);
    const row = {
      account_id: q.account_id, business_name: q.business_name.trim(), contact_name: q.contact_name.trim(), phone: q.phone ? normalizePhone(q.phone) : "",
      address: q.address.trim(), business_type: q.business_type, npwp: cleanNpwp(q.npwp), tax_name: q.tax_name?.trim() || null, tax_address: q.tax_address?.trim() || null,
      lines: q.lines.map((l) => ({ variant_id: l.variant_id, price: l.price, note: String(l.note ?? "").trim() })),
      valid_until: q.valid_until, price_from: q.price_from, price_to: q.price_to, note: q.note.trim(),
    };
    if (q.id) {
      const { data, error } = await sb().from("quotes").update(row).eq("id", q.id).neq("status", "accepted").select("*").maybeSingle();
      if (error) return fail(msg(error));
      return data ? ok(mapQuotation(data as Row)) : fail("Penawaran yang sudah diterima tidak dapat diubah.");
    }
    for (let i = 0; i < 5; i++) {
      const { data, error } = await sb().from("quotes").insert({ ...row, id: newId("qt"), code: quoteCode(today) }).select("*").single();
      if (!error) return ok(mapQuotation(data as Row));
      if ((error as { code?: string }).code !== "23505") return fail(msg(error));
    }
    return fail("Nomor penawaran tidak dapat dibuat. Coba lagi.");
  },
  async setQuoteStatus(id, status) {
    const cur = await this.getQuote(id);
    if (!cur) return fail("Penawaran tidak ditemukan.");
    if (cur.status === "accepted") return fail("Penawaran yang sudah diterima tidak dapat diubah.");
    if (status === "sent" && cur.valid_until < nowJakarta().date) return fail("Batas penerimaan sudah lewat. Ubah tanggalnya dulu.");
    const { data, error } = await sb().from("quotes").update({ status }).eq("id", id).neq("status", "accepted").select("*").maybeSingle();
    if (error) return fail(msg(error));
    return data ? ok(mapQuotation(data as Row)) : fail("Penawaran yang sudah diterima tidak dapat diubah.");
  },
  async acceptQuote(id, name) {
    const { data, error } = await sb().rpc("accept_quote", { p_id: id, p_name: name });
    return error ? fail(msg(error)) : ok(String(data));
  },

  async createRating(code, phone, r, windowDays) {
    const { data, error } = await sb().rpc("create_rating", { p_code: code, p_phone: phone, p_stars: r.stars, p_comment: r.comment, p_items: r.items.map((i) => ({ item_id: i.item_id, stars: String(i.stars) })), p_window_days: windowDays });
    return error ? fail(msg(error)) : ok(String(data));
  },
  async getRatingForOrder(orderId) {
    const { data, error } = await sb().from("ratings").select("*, rating_items(product_id, stars)").eq("order_id", orderId).maybeSingle();
    if (error) throw error;
    return data ? mapRating(data as Row) : null;
  },
  async listRatings(filter) {
    let q = sb().from("ratings").select("*, rating_items(product_id, stars), orders(code, customer_name, phone)").order("created_at", { ascending: false }).limit(filter?.limit ?? 200);
    if (filter?.since) q = q.gte("created_at", `${filter.since}T00:00:00+07:00`);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Row[]).map(mapRating);
  },
  async productRatings() {
    const { data, error } = await sb().rpc("product_rating_summary");
    if (error) throw error;
    return Object.fromEntries(((data as Row[]) ?? []).map((r) => [String(r.product_id), { average: num(r.average), count: num(r.n) }]));
  },
  async listOrderFacts(since) {
    const { data, error } = await sb().from("orders").select("code, segment, account_id, phone, customer_name, gift_message, gift_from, delivery_date, total_final, total_est").neq("status", "cancelled").gte("delivery_date", since).order("delivery_date").limit(20000);
    if (error) throw error;
    // a gift carries the recipient's name; the customer is the buyer (named by "from", when given)
    return (data as Row[]).map((r) => ({ code: String(r.code), segment: r.segment as Order["segment"], account_id: (r.account_id as string | null) ?? null, phone: String(r.phone), customer_name: String(r.gift_message !== null && r.gift_message !== undefined ? (r.gift_from || `+${r.phone}`) : r.customer_name), delivery_date: String(r.delivery_date).slice(0, 10), total: num(r.total_final ?? r.total_est) }));
  },

  async trackEvent(event, productId = "") {
    const { error } = await sb().rpc("track_event", { p_event: event, p_product: productId });
    if (error) throw error;
  },
  async funnelReport(from, to) {
    const { data, error } = await sb().from("funnel_daily").select("*").gte("day", from).lte("day", to).limit(20000);
    if (error) throw error;
    return (data as Row[]).map((r) => ({ day: String(r.day).slice(0, 10), event: r.event as FunnelRow["event"], product_id: String(r.product_id ?? ""), n: num(r.n) }));
  },
  async listOrdersAutoCancelled(hours) {
    const now = new Date();
    const { data, error } = await sb().from("orders").select(ORDER_SELECT).eq("status", "cancelled")
      .lt("pay_by", now.toISOString()).gt("pay_by", new Date(now.getTime() - hours * 3600_000).toISOString()).limit(50);
    if (error) throw error;
    return (data as Row[]).map(mapOrder);
  },
  async listOrdersPastPayBy() {
    const { data, error } = await sb().from("orders").select(ORDER_SELECT).eq("payment_status", "unpaid").in("status", ["new", "confirmed"]).lt("pay_by", new Date().toISOString()).limit(200);
    if (error) throw error;
    return (data as Row[]).map(mapOrder);
  },
};

function mapWa(r: Row): WaMessage {
  return {
    id: String(r.id), order_id: (r.order_id as string | null) ?? null, kind: r.kind as WaMessage["kind"], dedupe: String(r.dedupe ?? ""), phone: String(r.phone),
    template: String(r.template), params: ((r.params as unknown[]) ?? []).map(String), body: String(r.body), status: r.status as WaMessage["status"],
    provider_id: (r.provider_id as string | null) ?? null, error: (r.error as string | null) ?? null, attempts: num(r.attempts),
    created_at: String(r.created_at), sent_at: (r.sent_at as string | null) ?? null,
  };
}

function mapPayment(r: Row): Payment {
  return {
    id: String(r.id), order_id: (r.order_id as string | null) ?? null, account_id: (r.account_id as string | null) ?? null,
    provider: r.provider as Payment["provider"], method: r.method === "va" ? "va" : "qris",
    va_bank: (r.va_bank as string | null) ?? null, va_number: (r.va_number as string | null) ?? null,
    amount: num(r.amount), amount_paid: numOrNull(r.amount_paid), status: r.status as Payment["status"],
    qr_string: (r.qr_string as string | null) ?? null, qr_url: (r.qr_url as string | null) ?? null,
    expires_at: (r.expires_at as string | null) ?? null, created_at: String(r.created_at), paid_at: (r.paid_at as string | null) ?? null,
  };
}

function mapRefund(r: Row): Refund {
  const o = r.orders as Row | null | undefined;
  return {
    id: String(r.id), order_id: String(r.order_id), claim_id: (r.claim_id as string | null) ?? null, amount: num(r.amount),
    refunded_on: String(r.refunded_on).slice(0, 10), method: r.method as Refund["method"], reference: String(r.reference ?? ""),
    proof: (r.proof as string | null) ?? null, note: String(r.note ?? ""), created_at: String(r.created_at),
    ...(o ? { order_code: String(o.code), customer_name: String(o.customer_name) } : {}),
  };
}

function mapQuotation(r: Row): Quotation {
  const d = (x: unknown) => (x ? String(x).slice(0, 10) : null);
  return {
    id: String(r.id), code: String(r.code), account_id: (r.account_id as string | null) ?? null, business_name: String(r.business_name),
    contact_name: String(r.contact_name ?? ""), phone: String(r.phone ?? ""), address: String(r.address ?? ""), business_type: String(r.business_type ?? ""),
    npwp: (r.npwp as string | null) ?? null, tax_name: (r.tax_name as string | null) ?? null, tax_address: (r.tax_address as string | null) ?? null,
    lines: ((r.lines as Row[] | null) ?? []).map((l) => ({ variant_id: String(l.variant_id), price: num(l.price), note: String(l.note ?? "") })),
    valid_until: d(r.valid_until)!, price_from: d(r.price_from)!, price_to: d(r.price_to), note: String(r.note ?? ""),
    status: r.status as Quotation["status"], accepted_at: (r.accepted_at as string | null) ?? null, accepted_name: (r.accepted_name as string | null) ?? null,
    created_at: String(r.created_at),
  };
}

function mapRating(r: Row): Rating {
  const o = r.orders as Row | null | undefined;
  return {
    id: String(r.id), order_id: String(r.order_id), stars: num(r.stars), comment: String(r.comment ?? ""), created_at: String(r.created_at),
    items: ((r.rating_items as Row[] | null) ?? []).map((i) => ({ product_id: String(i.product_id), stars: num(i.stars) })),
    ...(o ? { order_code: String(o.code), customer_name: String(o.customer_name), phone: String(o.phone) } : {}),
  };
}

function mapStanding(r: Row): StandingOrder {
  return {
    id: String(r.id), account_id: (r.account_id as string | null) ?? null, customer_id: (r.customer_id as string | null) ?? null, address_id: (r.address_id as string | null) ?? null,
    every_weeks: Number(r.every_weeks ?? 1), anchor_date: r.anchor_date ? String(r.anchor_date).slice(0, 10) : null, paused_reason: (r.paused_reason as string | null) ?? null,
    name: String(r.name), weekdays: (r.weekdays as number[]).map(Number),
    slot_id: String(r.slot_id), payment_method: r.payment_method as StandingOrder["payment_method"],
    lines: (r.lines as StandingOrder["lines"]).map((l) => ({ variant_id: l.variant_id, qty: Number(l.qty), prep_option_id: l.prep_option_id ?? null })),
    status: r.status as StandingOrder["status"], skip_dates: ((r.skip_dates as string[] | null) ?? []).map((d) => String(d).slice(0, 10)),
    note: (r.note as string | null) ?? null, created_at: String(r.created_at), updated_at: String(r.updated_at),
  };
}

function mapRun(r: Row): StandingOrderRun {
  return {
    id: String(r.id), standing_order_id: String(r.standing_order_id), delivery_date: String(r.delivery_date).slice(0, 10),
    order_id: (r.order_id as string | null) ?? null, order_code: (r.order_code as string | null) ?? null, error: (r.error as string | null) ?? null, note: (r.note as string | null) ?? null, created_at: String(r.created_at),
  };
}

function mapCustomer(r: Row): Customer {
  return {
    id: String(r.id), phone: String(r.phone), name: String(r.name ?? ""), marketing_opt_in: Boolean(r.marketing_opt_in),
    marketing_opt_in_at: (r.marketing_opt_in_at as string | null) ?? null, created_at: String(r.created_at), last_login_at: (r.last_login_at as string | null) ?? null,
  };
}

function mapAddress(r: Row): CustomerAddress {
  return {
    id: String(r.id), customer_id: String(r.customer_id), label: String(r.label ?? ""), recipient: String(r.recipient ?? ""), address: String(r.address),
    area_id: (r.area_id as string | null) ?? null, maps_url: (r.maps_url as string | null) ?? null, is_default: Boolean(r.is_default), created_at: String(r.created_at),
  };
}

function mapPurchase(r: Row): Purchase {
  return {
    id: String(r.id), delivery_date: String(r.delivery_date).slice(0, 10), product_id: String(r.product_id), kind: r.kind as Purchase["kind"],
    qty: num(r.qty), unit: String(r.unit), total_cost: num(r.total_cost), supplier: String(r.supplier ?? ""), note: String(r.note ?? ""), created_at: String(r.created_at),
  };
}
