// Real margin and shrinkage for one delivery day, from the orders and the dawn buying log. Shared by the buying list
// (Belanja subuh) and the owner's morning brief, so both always show the same figures.
import type { DailySummary, Order, Purchase } from "./types";

export interface ShrinkRow { pid: string; name: string; unit: string | undefined; bought: number; sold: number; left: number; lossPct: number; lossValue: number }
export interface DayCost {
  /** product sales after discounts (delivery fees pay for delivery, not for fish) */
  net: number;
  /** paid at the auction or to suppliers, from the buying log */
  paid: number;
  /** what was paid for logged products, the listed cost for everything else */
  actualCost: number;
  margin: number;
  /** null when there were no sales */
  marginPct: number | null;
  shrink: ShrinkRow[];
  /** value of what was bought but neither sold nor kept, at the price paid; share of `paid` for logged products */
  lossValue: number;
  lossPct: number | null;
}

export function dayCost(orders: Order[], purchases: Purchase[], summary: Pick<DailySummary, "est_cost">, nameOf: (productId: string) => string): DayCost {
  const live = orders.filter((o) => o.status !== "cancelled");
  const bought = purchases.filter((p) => p.kind === "purchase");
  const loggedIds = new Set(bought.map((p) => p.product_id));
  const items = live.flatMap((o) => o.items);
  const estLogged = items.filter((i) => loggedIds.has(i.product_id)).reduce((s, i) => s + i.unit_cost * (i.qty_final ?? i.qty_ordered), 0);
  const paid = bought.reduce((s, p) => s + p.total_cost, 0);
  const actualCost = summary.est_cost - estLogged + paid;
  const net = live.reduce((s, o) => s + (o.subtotal_final ?? o.subtotal_est) - o.discount, 0);
  const shrink: ShrinkRow[] = [...loggedIds].map((pid) => {
    const mine = bought.filter((p) => p.product_id === pid);
    const qty = mine.reduce((s, p) => s + p.qty, 0);
    const cost = mine.reduce((s, p) => s + p.total_cost, 0);
    const unit = purchases.find((p) => p.product_id === pid)?.unit;
    const sold = items.filter((i) => i.product_id === pid && i.unit === unit).reduce((s, i) => s + (i.qty_final ?? i.qty_ordered), 0);
    const left = purchases.filter((p) => p.product_id === pid && p.kind === "leftover").reduce((s, p) => s + p.qty, 0);
    const lossQty = Math.max(0, qty - sold - left);
    return { pid, name: nameOf(pid), unit, bought: qty, sold, left, lossPct: qty > 0 ? (lossQty / qty) * 100 : 0, lossValue: qty > 0 ? (lossQty / qty) * cost : 0 };
  });
  const lossValue = shrink.reduce((s, r) => s + r.lossValue, 0);
  return { net, paid, actualCost, margin: net - actualCost, marginPct: net ? ((net - actualCost) / net) * 100 : null, shrink, lossValue, lossPct: paid > 0 ? (lossValue / paid) * 100 : null };
}
