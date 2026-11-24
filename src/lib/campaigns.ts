// Seasonal pre-orders. The same rules are enforced by place_order in supabase/schema.sql; this file gives the demo
// adapter, the checkout page and the campaign pages the same answers.
import type { Campaign, CartLine, Order, PaymentMethod, Product, Settings } from "./types";
import { addDays, formatDate, jam, parseTime } from "./format";

export type CampaignState = "upcoming" | "open" | "closed" | "over";
type Now = { date: string; minutesOfDay: number };

/** upcoming: not yet open · open: taking orders · closed: orders closed, deliveries still to come · over */
export function campaignState(c: Pick<Campaign, "opens_on" | "order_by" | "deliver_to">, now: Now, cutoff: string): CampaignState {
  if (now.date < c.opens_on) return "upcoming";
  if (now.date < c.order_by || (now.date === c.order_by && now.minutesOfDay < parseTime(cutoff))) return "open";
  if (now.date <= c.deliver_to) return "closed";
  return "over";
}

/** A campaign has a public page while it is switched on and not over (upcoming ones show their opening date). */
export function isListed(c: Campaign, now: Now, cutoff: string): boolean {
  return c.is_active && campaignState(c, now, cutoff) !== "over";
}

/** First delivery day a customer can pick now (the usual cut-off still applies). */
function firstDate(settings: Pick<Settings, "cutoff_time">, now: Now): string {
  return addDays(now.date, now.minutesOfDay < parseTime(settings.cutoff_time) ? 1 : 2);
}

/** Delivery days a pre-order can be placed for right now. */
export function campaignDates(c: Campaign, settings: Pick<Settings, "cutoff_time">, now: Now): string[] {
  const first = firstDate(settings, now);
  const out: string[] = [];
  for (let d = c.deliver_from > first ? c.deliver_from : first; d <= c.deliver_to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** "30–31 Des", "30 Des–2 Jan", or one day. */
export function dayRange(from: string, to: string, locale: "id" | "en" = "id"): string {
  if (from === to) return formatDate(from, "short", locale);
  if (from.slice(0, 7) === to.slice(0, 7)) return `${Number(from.slice(8, 10))}–${formatDate(to, "short", locale)}`;
  return `${formatDate(from, "short", locale)}–${formatDate(to, "short", locale)}`;
}

/** 31/12/2026, as in the database's messages. */
export const dmy = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

/** Products for everyday shelves (categories, all products, featured): pre-order products sell only on their campaign page. */
export function everyday<T extends Pick<Product, "campaign_id">>(products: T[]): T[] {
  return products.filter((p) => !p.campaign_id);
}

/** The campaign of a cart, if any; an error when the cart mixes two campaigns. */
export function cartCampaign(lines: Pick<CartLine, "variant_id">[], products: Product[], campaigns: Campaign[]): { campaign: Campaign | null; error: string | null } {
  const ids = new Set<string>();
  for (const l of lines) {
    const p = products.find((x) => x.variants.some((v) => v.id === l.variant_id));
    if (p?.campaign_id) ids.add(p.campaign_id);
  }
  if (ids.size > 1) return { campaign: null, error: "Satu pesanan hanya dapat berisi produk dari satu pre-order musiman." };
  if (!ids.size) return { campaign: null, error: null };
  const id = [...ids][0];
  const c = campaigns.find((x) => x.id === id);
  // a product linked to a campaign that is missing behaves as a closed pre-order
  return { campaign: c ?? { id, slug: "", name: "ini", name_en: null, intro: "", intro_en: null, image_url: null, opens_on: "9999-12-31", order_by: "9999-12-31", deliver_from: "9999-12-31", deliver_to: "9999-12-31", is_active: false, created_at: "" }, error: null };
}

/** Why this pre-order cannot be placed for `date` now (same order of checks and wording as place_order). */
export function preorderDateError(c: Campaign, settings: Pick<Settings, "cutoff_time">, now: Now, date: string): string | null {
  const state = campaignState(c, now, settings.cutoff_time);
  if (!c.is_active || state === "upcoming") return `Pre-order ${c.name} belum dibuka.`;
  if (state !== "open") return `Pre-order ${c.name} sudah ditutup.`;
  const first = firstDate(settings, now);
  const from = c.deliver_from > first ? c.deliver_from : first;
  if (date < from || date > c.deliver_to) return `Pre-order ${c.name} dikirim tanggal ${dmy(from)} sampai ${dmy(c.deliver_to)}. Pilih salah satu tanggal tersebut.`;
  return null;
}

export const PREORDER_COD_ERROR = "Pre-order dibayar di muka: bayar di tempat (COD) tidak tersedia.";
export const PREORDER_WEIGHED_ERROR = "Pre-order dibayar di muka, sehingga tidak dapat digabung dengan produk yang ditimbang. Pesan produk tersebut secara terpisah.";

/** Payment rules of a pre-order: never cash at the door, and a total known now unless the restaurant pays on tempo. */
export function preorderPaymentError(pm: PaymentMethod, hasCatchWeight: boolean): string | null {
  if (pm === "cod") return PREORDER_COD_ERROR;
  if (hasCatchWeight && pm !== "terms") return PREORDER_WEIGHED_ERROR;
  return null;
}

/** Back-office validation of a campaign (the table's constraints, in words). */
export function campaignError(c: Pick<Campaign, "slug" | "name" | "opens_on" | "order_by" | "deliver_from" | "deliver_to">): string | null {
  if (!/^[a-z0-9][a-z0-9-]{1,59}$/.test(c.slug)) return "Alamat halaman: 2–60 huruf kecil, angka, atau tanda hubung.";
  if (c.name.trim().length < 2 || c.name.length > 80) return "Nama pre-order: 2–80 karakter.";
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (![c.opens_on, c.order_by, c.deliver_from, c.deliver_to].every((d) => iso.test(d))) return "Lengkapi semua tanggal.";
  if (c.opens_on > c.order_by) return "Tanggal dibuka harus sebelum batas pemesanan.";
  if (c.order_by >= c.deliver_from) return "Batas pemesanan harus sebelum hari pengiriman pertama, agar pembelian dapat disiapkan.";
  if (c.deliver_from > c.deliver_to) return "Hari pengiriman terakhir tidak boleh sebelum hari pertama.";
  if (addDays(c.deliver_from, 13) < c.deliver_to) return "Rentang pengiriman paling lama 14 hari.";
  return null;
}

/** Short customer-facing line for a campaign product: what it is now and when it arrives. */
export function preorderBadge(c: Campaign, state: CampaignState, en: boolean): { text: string; open: boolean } {
  const d = (x: string) => formatDate(x, "short", en ? "en" : "id");
  const days = dayRange(c.deliver_from, c.deliver_to, en ? "en" : "id");
  if (state === "open") return { text: en ? `Pre-order · delivered ${days}` : `Pre-order · kirim ${days}`, open: true };
  if (state === "upcoming") return { text: en ? `Pre-order opens ${d(c.opens_on)}` : `Pre-order dibuka ${d(c.opens_on)}`, open: false };
  return { text: en ? "Pre-order closed" : "Pre-order ditutup", open: false };
}

/** The three facts every campaign page and product page repeats. */
export function preorderFacts(c: Campaign, cutoff: string, en: boolean): Array<[string, string]> {
  const d = (x: string) => formatDate(x, "short", en ? "en" : "id");
  const days = dayRange(c.deliver_from, c.deliver_to, en ? "en" : "id");
  return en
    ? [["Order by", `${d(c.order_by)}, ${jam(cutoff)}`], ["Delivered", days], ["Payment", "In advance · limited quantities"]]
    : [["Pesan paling lambat", `${d(c.order_by)}, ${jam(cutoff)} WIB`], ["Dikirim", days], ["Pembayaran", "Di muka · jumlah terbatas"]];
}

export interface PlanRow { variant_id: string; product_name: string; variant_label: string; unit: string; byDate: Record<string, { paid: number; unpaid: number }>; paid: number; unpaid: number }
export interface CampaignSummary { orders: number; paidOrders: number; unpaidOrders: number; sales: number; paidSales: number; byDate: Record<string, number>; plan: PlanRow[] }

/**
 * What a pre-order has sold so far, for buying ahead: per size and delivery day, paid separately from not yet paid
 * (unpaid orders are cancelled at their payment deadline, so only paid quantities are certain). Cancelled orders are left out.
 */
export function campaignSummary(orders: Order[], campaignProductIds: Set<string>): CampaignSummary {
  const live = orders.filter((o) => o.status !== "cancelled");
  const isPaid = (o: Order) => o.payment_status === "paid" || o.payment_method === "terms";
  const total = (o: Order) => o.total_final ?? o.total_est;
  const byDate: Record<string, number> = {};
  const plan = new Map<string, PlanRow>();
  for (const o of live) {
    byDate[o.delivery_date] = (byDate[o.delivery_date] ?? 0) + 1;
    for (const i of o.items) {
      if (!campaignProductIds.has(i.product_id)) continue;
      const r = plan.get(i.variant_id) ?? { variant_id: i.variant_id, product_name: i.product_name, variant_label: i.variant_label, unit: i.unit, byDate: {}, paid: 0, unpaid: 0 };
      const cell = (r.byDate[o.delivery_date] ??= { paid: 0, unpaid: 0 });
      const k = isPaid(o) ? "paid" : "unpaid";
      cell[k] += i.qty_ordered;
      r[k] += i.qty_ordered;
      plan.set(i.variant_id, r);
    }
  }
  return {
    orders: live.length,
    paidOrders: live.filter(isPaid).length,
    unpaidOrders: live.filter((o) => !isPaid(o)).length,
    sales: live.reduce((s, o) => s + total(o), 0),
    paidSales: live.filter(isPaid).reduce((s, o) => s + total(o), 0),
    byDate,
    plan: [...plan.values()].sort((a, b) => a.product_name.localeCompare(b.product_name) || a.variant_label.localeCompare(b.variant_label)),
  };
}
