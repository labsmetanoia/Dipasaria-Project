// Restaurant receivables: what each account owes on tempo, how old it is, and its statement for a period.
// Pure functions over orders, payments and allocations, used by the back-office, the restaurant's own account page
// and the demo adapter. The database applies the same rules in SQL (account_exposure, allocate_account_credit,
// place_order), which is the authority in production.
import type { AccountPayment, AccountPaymentMethod, BusinessAccount, Order, PaymentAllocation, Settings } from "./types";
import { addDays, nowJakarta } from "./format";

export const TERMS_DAYS = { days3: 3, weekly: 7 } as const;

export const PAYMENT_METHOD_LABEL: Record<AccountPaymentMethod, string> = {
  transfer: "Transfer bank", cash: "Tunai", qris: "QRIS", giro: "Giro / cek", other: "Lainnya",
};

/** Due date of a tempo invoice: delivery date + 3 days (days3) or 7 days (weekly). */
export function dueDateFor(deliveryDate: string, terms: BusinessAccount["payment_terms"]): string | null {
  return terms === "prepaid" ? null : addDays(deliveryDate, TERMS_DAYS[terms]);
}

/** Whole days from a to b (YYYY-MM-DD). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400_000);
}

/** "15/11/2026", the format used in database messages. */
export const ddmmyyyy = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

const rp = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

export type Bucket = "current" | "d1_7" | "d8_14" | "d15_30" | "d30";
export const BUCKETS: Array<[Bucket, string]> = [
  ["current", "Belum jatuh tempo"], ["d1_7", "1–7 hari"], ["d8_14", "8–14 hari"], ["d15_30", "15–30 hari"], ["d30", "Lebih dari 30 hari"],
];
export function bucketOf(daysPastDue: number): Bucket {
  if (daysPastDue <= 0) return "current";
  if (daysPastDue <= 7) return "d1_7";
  if (daysPastDue <= 14) return "d8_14";
  if (daysPastDue <= 30) return "d15_30";
  return "d30";
}

export interface InvoiceRow {
  order: Order;
  /** final total, or the estimate while catch-weight items are not weighed yet */
  amount: number;
  estimate: boolean;
  allocated: number;
  remaining: number;
  due_date: string | null;
  /** > 0 when past due */
  days_past_due: number;
  /** delivered (delivery date today or earlier): an invoice; later dates are orders still to come */
  delivered: boolean;
  open: boolean;
}

export interface PaymentRow extends AccountPayment {
  allocated: number;
  unapplied: number;
  allocations: Array<{ order_id: string; code: string; amount: number }>;
}

export interface Ledger {
  account_id: string;
  /** every tempo order that is not cancelled, oldest due first */
  invoices: InvoiceRow[];
  open: InvoiceRow[];
  /** newest first */
  payments: PaymentRow[];
  /** all open invoices, including orders not yet delivered (what the credit limit counts) */
  outstanding: number;
  /** part of outstanding for orders not delivered yet */
  upcoming: number;
  /** payments not yet matched to an invoice */
  credit: number;
  /** outstanding minus credit */
  balance: number;
  overdue: number;
  aging: Record<Bucket, number>;
  oldest_open: InvoiceRow | null;
  /** room left under the credit limit; null when the account has no limit */
  available: number | null;
  received_30d: number;
}

export const amountOf = (o: Pick<Order, "total_final" | "total_est">) => o.total_final ?? o.total_est;

export function buildLedger(
  account: Pick<BusinessAccount, "id" | "credit_limit">,
  orders: Order[],
  payments: AccountPayment[],
  allocations: PaymentAllocation[],
  today: string = nowJakarta().date,
): Ledger {
  const mine = orders.filter((o) => o.account_id === account.id && o.payment_method === "terms" && o.status !== "cancelled");
  const allocByOrder = new Map<string, number>();
  const allocByPayment = new Map<string, number>();
  const myPayments = payments.filter((p) => p.account_id === account.id);
  const paymentIds = new Set(myPayments.map((p) => p.id));
  const myAllocs = allocations.filter((a) => paymentIds.has(a.payment_id));
  for (const a of myAllocs) {
    allocByOrder.set(a.order_id, (allocByOrder.get(a.order_id) ?? 0) + a.amount);
    allocByPayment.set(a.payment_id, (allocByPayment.get(a.payment_id) ?? 0) + a.amount);
  }
  const invoices: InvoiceRow[] = mine.map((o) => {
    const amount = amountOf(o);
    const allocated = allocByOrder.get(o.id) ?? 0;
    const open = (o.payment_status === "unpaid" || o.payment_status === "awaiting_confirmation") && amount - allocated > 0;
    const due = o.due_date ?? null;
    return {
      order: o, amount, estimate: o.total_final === null, allocated, remaining: open ? amount - allocated : 0, due_date: due,
      days_past_due: open && due ? Math.max(0, daysBetween(due, today)) : 0, delivered: o.delivery_date <= today, open,
    };
  }).sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || a.order.delivery_date.localeCompare(b.order.delivery_date) || a.order.code.localeCompare(b.order.code));
  const open = invoices.filter((i) => i.open);
  const codeOf = new Map(mine.map((o) => [o.id, o.code]));
  const rows: PaymentRow[] = myPayments
    .map((p) => {
      const allocated = allocByPayment.get(p.id) ?? 0;
      return { ...p, allocated, unapplied: p.amount - allocated, allocations: myAllocs.filter((a) => a.payment_id === p.id).map((a) => ({ order_id: a.order_id, code: codeOf.get(a.order_id) ?? "—", amount: a.amount })) };
    })
    .sort((a, b) => b.paid_on.localeCompare(a.paid_on) || b.created_at.localeCompare(a.created_at));
  const aging: Record<Bucket, number> = { current: 0, d1_7: 0, d8_14: 0, d15_30: 0, d30: 0 };
  for (const i of open) if (i.delivered) aging[bucketOf(i.days_past_due)] += i.remaining;
  const outstanding = open.reduce((s, i) => s + i.remaining, 0);
  const credit = rows.reduce((s, p) => s + Math.max(0, p.unapplied), 0);
  const balance = outstanding - credit;
  const withDue = open.filter((i) => i.due_date).sort((a, b) => a.due_date!.localeCompare(b.due_date!) || a.order.code.localeCompare(b.order.code));
  const since = addDays(today, -30);
  return {
    account_id: account.id,
    invoices,
    open,
    payments: rows,
    outstanding,
    upcoming: open.filter((i) => !i.delivered).reduce((s, i) => s + i.remaining, 0),
    credit,
    balance,
    overdue: open.filter((i) => i.days_past_due > 0).reduce((s, i) => s + i.remaining, 0),
    aging,
    oldest_open: withDue[0] ?? null,
    available: account.credit_limit === null || account.credit_limit === undefined ? null : Math.max(0, account.credit_limit - balance),
    received_30d: rows.filter((p) => p.paid_on > since).reduce((s, p) => s + p.amount, 0),
  };
}

/**
 * Why a new tempo order of `newTotal` would be refused, or null. Same rules and wording as SQL place_order:
 * the oldest open invoice is more than the grace days past due, or the order would pass the credit limit.
 */
export function termsBlock(ledger: Ledger, account: Pick<BusinessAccount, "credit_limit">, settings: Pick<Settings, "terms_grace_days">, newTotal: number, today: string = nowJakarta().date): string | null {
  const oldest = ledger.oldest_open;
  if (oldest?.due_date && oldest.due_date < addDays(today, -(settings.terms_grace_days ?? 3))) {
    return `Pembayaran tempo belum dapat dipakai: tagihan ${oldest.order.code} jatuh tempo ${ddmmyyyy(oldest.due_date)} belum lunas. Silakan lunasi tagihan tersebut atau pilih metode pembayaran lain.`;
  }
  if (account.credit_limit !== null && account.credit_limit !== undefined && ledger.balance + newTotal > account.credit_limit) {
    return `Pesanan ini melebihi batas kredit tempo akun Anda (sisa ${rp(Math.max(0, account.credit_limit - ledger.balance))}). Pilih metode pembayaran lain atau hubungi kami.`;
  }
  return null;
}

export interface StatementLine {
  date: string;
  kind: "invoice" | "payment" | "direct";
  ref: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  order_id?: string;
}

export interface Statement {
  from: string;
  to: string;
  opening: number;
  lines: StatementLine[];
  invoiced: number;
  received: number;
  closing: number;
}

/** Jakarta calendar date of an ISO timestamp. */
const jDate = (iso: string) => nowJakarta(new Date(iso)).date;

/**
 * Statement of account for [from, to]: opening balance, invoices by delivery date, payments by date, closing balance.
 * Invoices settled outside the payment register (marked paid by hand) appear as "paid directly" so the balance holds.
 */
export function buildStatement(ledger: Ledger, from: string, to: string): Statement {
  type E = Omit<StatementLine, "balance">;
  const entries: E[] = [];
  for (const i of ledger.invoices) {
    if (!i.delivered && i.order.delivery_date > to) continue;
    entries.push({ date: i.order.delivery_date, kind: "invoice", ref: i.order.code, order_id: i.order.id, description: `Pesanan ${i.order.code}${i.estimate ? " (perkiraan, belum ditimbang)" : ""}`, debit: i.amount, credit: 0 });
    const direct = i.order.payment_status === "paid" ? i.amount - i.allocated : 0;
    if (direct > 0) {
      const paidEvent = [...i.order.history].reverse().find((h) => h.status === "paid");
      entries.push({ date: paidEvent ? jDate(paidEvent.at) : i.order.delivery_date, kind: "direct", ref: i.order.code, order_id: i.order.id, description: `Dibayar langsung · ${i.order.code}`, debit: 0, credit: direct });
    }
  }
  for (const p of ledger.payments) {
    entries.push({ date: p.paid_on, kind: "payment", ref: p.reference, description: `Pembayaran · ${PAYMENT_METHOD_LABEL[p.method]}${p.reference ? ` (${p.reference})` : ""}`, debit: 0, credit: p.amount });
  }
  const order = { invoice: 0, direct: 1, payment: 2 } as const;
  entries.sort((a, b) => a.date.localeCompare(b.date) || order[a.kind] - order[b.kind] || a.ref.localeCompare(b.ref));
  let opening = 0;
  for (const e of entries) if (e.date < from) opening += e.debit - e.credit;
  let bal = opening;
  const lines: StatementLine[] = [];
  for (const e of entries) {
    if (e.date < from || e.date > to) continue;
    bal += e.debit - e.credit;
    lines.push({ ...e, balance: bal });
  }
  return {
    from, to, opening, lines,
    invoiced: lines.reduce((s, l) => s + l.debit, 0),
    received: lines.reduce((s, l) => s + l.credit, 0),
    closing: bal,
  };
}
