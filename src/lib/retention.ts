// Customer retention figures for the reports page: who comes back, how soon, how much they order, and who has gone
// quiet. Pure functions over the orders of the last months (src/lib/types.ts OrderFact), so they are easy to test.
// A household is identified by its WhatsApp number, a restaurant by its account.
import type { OrderFact, Segment } from "./types";
import { addDays } from "./format";

export interface CustomerStat {
  key: string;
  segment: Segment;
  account_id: string | null;
  name: string;
  phone: string;
  orders: number;
  total: number;
  /** distinct delivery dates, oldest first (two orders for the same day are one visit) */
  dates: string[];
  first: string;
  last: string;
  /** median days between consecutive delivery dates; null with fewer than two dates */
  usualGap: number | null;
}

export interface Cohort { month: string; customers: number; returned: number; returned30: number; revenue: number }

export interface QuietCustomer extends CustomerStat { daysSince: number; threshold: number }

export interface Retention {
  customers: number;
  bySegment: Record<Segment, { customers: number; orders: number; sales: number; aov: number; medianGap: number | null }>;
  /** customers with two or more delivery dates */
  repeatCustomers: number;
  /** of customers whose first order was at least 30 days ago: how many ordered again within 30 days of it */
  eligible30: number;
  returned30: number;
  cohorts: Cohort[];
  quiet: QuietCustomer[];
}

const days = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400_000);
const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };

/** A household is "quiet" after three weeks without an order, a restaurant after one; longer for customers who usually order less often. */
export const QUIET_AFTER: Record<Segment, number> = { retail: 21, business: 7 };

export function customerStats(facts: OrderFact[]): CustomerStat[] {
  const map = new Map<string, { segment: Segment; account_id: string | null; name: string; phone: string; orders: number; total: number; dates: Set<string>; latest: string }>();
  for (const f of facts) {
    const key = f.segment === "business" && f.account_id ? `b:${f.account_id}` : `r:${f.phone}`;
    const c = map.get(key) ?? { segment: f.segment, account_id: f.account_id, name: f.customer_name, phone: f.phone, orders: 0, total: 0, dates: new Set<string>(), latest: "" };
    c.orders++;
    c.total += f.total;
    c.dates.add(f.delivery_date);
    if (f.delivery_date >= c.latest) { c.latest = f.delivery_date; c.name = f.customer_name; c.phone = f.phone; } // the name used most recently
    map.set(key, c);
  }
  return [...map.entries()].map(([key, c]) => {
    const dates = [...c.dates].sort();
    const gaps = dates.slice(1).map((d, i) => days(dates[i], d));
    return { key, segment: c.segment, account_id: c.account_id, name: c.name, phone: c.phone, orders: c.orders, total: c.total, dates, first: dates[0], last: dates[dates.length - 1], usualGap: median(gaps) };
  });
}

export function buildRetention(facts: OrderFact[], today: string): Retention {
  const stats = customerStats(facts);
  const seg = (s: Segment) => {
    const cs = stats.filter((c) => c.segment === s);
    const orders = cs.reduce((n, c) => n + c.orders, 0);
    const sales = cs.reduce((n, c) => n + c.total, 0);
    return { customers: cs.length, orders, sales, aov: orders ? Math.round(sales / orders) : 0, medianGap: median(cs.flatMap((c) => c.dates.slice(1).map((d, i) => days(c.dates[i], d)))) };
  };
  const cutoff = addDays(today, -30);
  const eligible = stats.filter((c) => c.first <= cutoff);
  const back30 = (c: CustomerStat) => c.dates.length > 1 && days(c.first, c.dates[1]) <= 30;
  const cohorts = new Map<string, Cohort>();
  for (const c of stats) {
    const month = c.first.slice(0, 7);
    const co = cohorts.get(month) ?? { month, customers: 0, returned: 0, returned30: 0, revenue: 0 };
    co.customers++;
    if (c.dates.length > 1) co.returned++;
    if (back30(c)) co.returned30++;
    co.revenue += c.total;
    cohorts.set(month, co);
  }
  const quiet = stats
    .map((c) => ({ ...c, daysSince: days(c.last, today), threshold: Math.max(QUIET_AFTER[c.segment], (c.usualGap ?? 0) * 2) }))
    .filter((c) => c.daysSince > c.threshold)
    .sort((a, b) => b.total - a.total);
  return {
    customers: stats.length,
    bySegment: { retail: seg("retail"), business: seg("business") },
    repeatCustomers: stats.filter((c) => c.dates.length > 1).length,
    eligible30: eligible.length,
    returned30: eligible.filter(back30).length,
    cohorts: [...cohorts.values()].sort((a, b) => a.month.localeCompare(b.month)),
    quiet,
  };
}
