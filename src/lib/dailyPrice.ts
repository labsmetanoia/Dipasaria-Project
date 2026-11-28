// Daily prices from auction cost. The buying log (Belanja subuh) records what each product cost this morning; this
// file turns that into a cost per size, suggests prices that keep the target margins, and finds restaurant contract
// prices that the market has overtaken. Nothing here changes a price: the owner confirms on Harga hari ini.
import type { BusinessAccount, ContractPrice, Product, Purchase, Settings, Variant } from "./types";
import { addDays } from "./format";

/** Days of purchases behind the "recent" cost used for contracts and quotations. */
export const RECENT_DAYS = 7;
/** Suggested prices are rounded up to this many rupiah. */
export const PRICE_STEP = 1000;

export interface DayCost { date: string; perUnit: number; qty: number }
/** Per product and unit: the latest day's cost per unit, and the quantity-weighted average over the recent window. */
export interface ProductCost { latest: DayCost; recent: { perUnit: number; qty: number; days: number } }

const key = (productId: string, unit: string) => `${productId}|${unit}`;

/** Purchase costs from the buying log, per product and unit ("purchase" entries only, with a quantity and a cost). */
export function purchaseCosts(purchases: Purchase[], today: string, days = RECENT_DAYS): Map<string, ProductCost> {
  const from = addDays(today, -(days - 1));
  const byKeyDay = new Map<string, Map<string, { qty: number; cost: number }>>();
  for (const p of purchases) {
    if (p.kind !== "purchase" || !(p.qty > 0) || !(p.total_cost > 0) || p.delivery_date < from || p.delivery_date > today) continue;
    const k = key(p.product_id, p.unit);
    const days_ = byKeyDay.get(k) ?? new Map();
    const d = days_.get(p.delivery_date) ?? { qty: 0, cost: 0 };
    d.qty += p.qty; d.cost += p.total_cost;
    days_.set(p.delivery_date, d);
    byKeyDay.set(k, days_);
  }
  const out = new Map<string, ProductCost>();
  for (const [k, days_] of byKeyDay) {
    const dates = [...days_.keys()].sort();
    const last = dates[dates.length - 1];
    const l = days_.get(last)!;
    let qty = 0, cost = 0;
    for (const d of days_.values()) { qty += d.qty; cost += d.cost; }
    out.set(k, { latest: { date: last, perUnit: l.cost / l.qty, qty: l.qty }, recent: { perUnit: cost / qty, qty, days: dates.length } });
  }
  return out;
}

export type CostSource = "today" | "latest" | "stored";
export interface SizeCost { cost: number; source: CostSource; date: string | null; recent: number }

/**
 * Cost of one size. Purchases are logged per product, not per size, so for a product with several sizes in the same
 * unit the morning's average is spread across them in the proportion of their stored costs (a larger fish usually
 * costs more per kg). A product with one size gets the morning's cost exactly. Without purchases: the stored cost.
 */
export function sizeCost(product: Product, variant: Variant, costs: Map<string, ProductCost>, today: string): SizeCost {
  const pc = costs.get(key(product.id, variant.unit));
  if (!pc) return { cost: variant.cost, source: "stored", date: null, recent: variant.cost };
  const peers = product.variants.filter((v) => v.unit === variant.unit && v.cost > 0);
  const mean = peers.length ? peers.reduce((s, v) => s + v.cost, 0) / peers.length : 0;
  const ratio = variant.cost > 0 && mean > 0 ? variant.cost / mean : 1;
  return {
    cost: Math.round(pc.latest.perUnit * ratio),
    source: pc.latest.date === today ? "today" : "latest",
    date: pc.latest.date,
    recent: Math.round(pc.recent.perUnit * ratio),
  };
}

/** Gross margin of a price at a cost, in percent (null without a price). */
export function marginPct(price: number, cost: number): number | null {
  return price > 0 ? ((price - cost) / price) * 100 : null;
}

/** The price that keeps `targetPct` margin at `cost`, rounded up to the next PRICE_STEP. */
export function suggestPrice(cost: number, targetPct: number): number {
  if (!(cost > 0)) return 0;
  const t = Math.min(Math.max(targetPct, 0), 80) / 100;
  return Math.ceil(cost / (1 - t) / PRICE_STEP) * PRICE_STEP;
}

export interface PriceRow {
  product_id: string; product_name: string; category_id: string; storage_class: Product["storage_class"]; is_catch_weight: boolean; available: boolean;
  variant_id: string; label: string; unit: Variant["unit"]; business_only: boolean;
  stored_cost: number; cost: SizeCost;
  price_retail: number; price_business: number;
  margin_retail: number | null; margin_business: number | null;
  suggest_retail: number; suggest_business: number;
  /** the current price is under the target margin at today's cost */
  low_retail: boolean; low_business: boolean;
}

/** One row per active size: cost now, current prices and their margin, and the prices that keep the targets. */
export function priceRows(products: Product[], purchases: Purchase[], settings: Pick<Settings, "target_margin_retail" | "target_margin_business">, today: string): PriceRow[] {
  const costs = purchaseCosts(purchases, today);
  const tr = settings.target_margin_retail, tb = settings.target_margin_business;
  return products.filter((p) => p.is_active).flatMap((p) => p.variants.filter((v) => v.is_active).map((v) => {
    const c = sizeCost(p, v, costs, today);
    const mr = v.business_only ? null : marginPct(v.price_retail, c.cost);
    const mb = marginPct(v.price_business, c.cost);
    return {
      product_id: p.id, product_name: p.name, category_id: p.category_id, storage_class: p.storage_class, is_catch_weight: p.is_catch_weight, available: p.available_today,
      variant_id: v.id, label: v.label, unit: v.unit, business_only: v.business_only,
      stored_cost: v.cost, cost: c,
      price_retail: v.price_retail, price_business: v.price_business,
      margin_retail: mr, margin_business: mb,
      suggest_retail: v.business_only ? 0 : suggestPrice(c.cost, tr), suggest_business: suggestPrice(c.cost, tb),
      low_retail: mr !== null && c.cost > 0 && mr < tr, low_business: mb !== null && c.cost > 0 && mb < tb,
    };
  }));
}

export interface ContractAlert { contract_id: string; account_id: string; account_name: string; variant_id: string; product_name: string; label: string; unit: Variant["unit"]; price: number; cost: number; margin: number; ends_on: string | null }

/**
 * Restaurant contract prices in force today whose margin, at the recent purchase cost (last RECENT_DAYS days, or the
 * stored cost without purchases), is under the wholesale target. Lowest margin first.
 */
export function contractAlerts(contracts: ContractPrice[], accounts: BusinessAccount[], products: Product[], purchases: Purchase[], settings: Pick<Settings, "target_margin_business">, today: string): ContractAlert[] {
  const costs = purchaseCosts(purchases, today);
  const out: ContractAlert[] = [];
  // the price in force per account and size: the latest start on or before today (as place_order picks it)
  const current = new Map<string, ContractPrice>();
  for (const c of contracts) {
    if (c.starts_on > today || (c.ends_on !== null && c.ends_on < today)) continue;
    const k = `${c.account_id}|${c.variant_id}`;
    const prev = current.get(k);
    if (!prev || c.starts_on > prev.starts_on) current.set(k, c);
  }
  for (const c of current.values()) {
    const acc = accounts.find((a) => a.id === c.account_id);
    if (!acc || acc.status === "suspended") continue;
    const p = products.find((x) => x.variants.some((v) => v.id === c.variant_id));
    const v = p?.variants.find((x) => x.id === c.variant_id);
    if (!p || !v) continue;
    const cost = sizeCost(p, v, costs, today).recent;
    const m = marginPct(c.price, cost);
    if (m !== null && cost > 0 && m < settings.target_margin_business) {
      out.push({ contract_id: c.id, account_id: acc.id, account_name: acc.business_name, variant_id: v.id, product_name: p.name, label: v.label, unit: v.unit, price: c.price, cost, margin: m, ends_on: c.ends_on });
    }
  }
  return out.sort((a, b) => a.margin - b.margin);
}

/** Recent cost per size (for quotations): the recent purchase cost where there is one, else the stored cost. */
export function recentCosts(products: Product[], purchases: Purchase[], today: string): Record<string, number> {
  const costs = purchaseCosts(purchases, today);
  const out: Record<string, number> = {};
  for (const p of products) for (const v of p.variants) out[v.id] = sizeCost(p, v, costs, today).recent;
  return out;
}

export interface PriceChange { variant_id: string; cost: number; price_retail: number; price_business: number }

/** Validation of a change from Harga hari ini (whole rupiah; a household price of 0 only for restaurant-only sizes). */
export function priceChangeError(c: PriceChange, v: Pick<Variant, "business_only"> & { name: string }): string | null {
  const ok = (n: number) => Number.isFinite(n) && n >= 0 && n === Math.round(n) && n <= 100_000_000;
  if (!ok(c.cost) || !ok(c.price_retail) || !ok(c.price_business)) return `${v.name}: angka harga tidak valid.`;
  if (c.price_business <= 0 || (!v.business_only && c.price_retail <= 0)) return `${v.name}: harga tidak boleh nol.`;
  return null;
}
