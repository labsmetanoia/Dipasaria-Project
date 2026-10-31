// Production adapter: talks to Supabase with the service-role key from the Next.js server only.
// Money-related rules run inside the SQL functions (supabase/schema.sql); this file is plumbing.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
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
  Variant,
} from "../types";
import type { OrderFilter, Repo, Result, SalesRow } from "./repo";
import { normalizePhone } from "../format";
import { newId } from "../ids";

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

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

type Row = Record<string, unknown>;

function mapVariant(r: Row): Variant {
  return {
    id: r.id as string,
    product_id: r.product_id as string,
    label: r.label as string,
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

function mapProduct(r: Row): Product {
  const variants = ((r.variants as Row[]) ?? []).map(mapVariant).sort((a, b) => a.sort - b.sort);
  const preps = ((r.prep_options as Row[]) ?? []).map((p) => ({
    id: p.id as string,
    product_id: p.product_id as string,
    label: p.label as string,
    surcharge: num(p.surcharge),
    note: (p.note as string | null) ?? null,
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
    origin: (r.origin as string) ?? "",
    storage_class: r.storage_class as Product["storage_class"],
    storage_note: (r.storage_note as string) ?? "",
    is_catch_weight: Boolean(r.is_catch_weight),
    available_today: Boolean(r.available_today),
    is_active: Boolean(r.is_active),
    is_featured: Boolean(r.is_featured),
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

async function fetchAccount(id: string): Promise<BusinessAccount | null> {
  const { data, error } = await sb().from("business_accounts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapAccount(data as Row) : null;
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
    return (data as Row[]).map(mapProduct).map((p) => ({ ...p, variants: p.variants.filter((v) => opts?.includeInactive || v.is_active) }));
  },
  async getProductBySlug(slug) {
    const { data, error } = await sb().from("products").select("*, variants(*), prep_options(*)").eq("slug", slug).eq("is_active", true).maybeSingle();
    if (error) throw error;
    return data ? mapProduct(data as Row) : null;
  },
  async getAreas(opts) {
    let q = sb().from("delivery_areas").select("*").order("sort");
    if (!opts?.includeInactive) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Row[]).map((r) => ({ id: r.id as string, name: r.name as string, fee: num(r.fee), is_active: Boolean(r.is_active), sort: num(r.sort) }));
  },
  async getSlots(opts) {
    let q = sb().from("delivery_slots").select("*").order("sort");
    if (!opts?.includeInactive) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (error) throw error;
    return (data as Row[]).map((r) => ({ ...(r as object), capacity: num(r.capacity), sort: num(r.sort) })) as DeliverySlot[];
  },
  async getPromoByCode(code) {
    const { data, error } = await sb().from("promos").select("*").ilike("code", code.trim()).maybeSingle();
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
    const { data, error } = await sb().rpc("place_order", { p: input, p_account_id: account?.id ?? null });
    if (error) return fail(msg(error));
    const order = await fetchOrder(data as string);
    return order ? ok(order) : fail("Pesanan tidak ditemukan setelah dibuat.");
  },
  async lookupOrder(code, phone) {
    const { data, error } = await sb().from("orders").select(ORDER_SELECT).ilike("code", code.trim()).eq("phone", normalizePhone(phone)).maybeSingle();
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
    if (filter.q) {
      const s = filter.q.replace(/[%,()]/g, "");
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
    return (data as Row[]).map(mapAccount).sort((a, b) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1));
  },
  async getAccount(id) { return fetchAccount(id); },
  async approveAccount(id, patch) {
    const { error } = await sb().rpc("approve_account", { p_id: id, p_discount: patch.discount_pct, p_terms: patch.payment_terms, p_cod: patch.allow_cod, p_slot: patch.preferred_slot_id ?? null });
    if (error) return fail(msg(error));
    return ok((await fetchAccount(id))!);
  },
  async updateAccount(id, patch) {
    const { id: _id, ...rest } = patch;
    void _id;
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
    const prod = await this.getProductBySlug(p.slug);
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
};
