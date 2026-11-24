// Gateway payments with automatic confirmation: a QRIS code, or a virtual account (a bank account number for this one
// payment, paid by ordinary transfer), for an order's final amount or for a restaurant's open invoices. The order (or
// account) is marked paid when the gateway confirms. The webhook is only a trigger: the result is always read back
// from the gateway's status API.
import "server-only";
import type { BusinessAccount, GatewayOutcome, Order, Payment } from "../types";
import type { Result } from "../data/repo";
import { getRepo } from "../data";
import { getGateway, vaBanks, VA_BANK_LABEL } from "./gateway";
import { alert, reportError } from "../monitor";
import { rupiah } from "../format";
import { notify } from "../notify/service";

/** QR codes stay valid this long, but always end 5 minutes before the order's own payment deadline. */
export const QR_MINUTES = 30;
/** A virtual account stays open a day (a transfer is often made from the office), but never past the order's deadline. */
export const VA_HOURS = 24;
/** Smallest amount a restaurant can pay from its statement. */
export const MIN_ACCOUNT_VA = 10_000;

export interface PublicPayment {
  id: string;
  amount: number;
  qr_string: string | null;
  expires_at: string | null;
  status: Payment["status"];
  demo: boolean;
  method: Payment["method"];
  va_bank: string | null;
  va_number: string | null;
}

const view = (p: Payment): PublicPayment => ({
  id: p.id, amount: p.amount, qr_string: p.status === "pending" ? p.qr_string : null, expires_at: p.expires_at, status: p.status, demo: p.provider === "mock",
  method: p.method, va_bank: p.va_bank, va_number: p.status === "pending" ? p.va_number : null,
});

export function qrisAutoEnabled(): boolean {
  return getGateway() !== null;
}

/** QRIS orders whose final amount is known and not yet paid. */
export function eligibleForQris(o: Order): boolean {
  return o.payment_method === "qris" && o.total_final !== null && o.total_final > 0 && o.payment_status === "unpaid" && o.status !== "cancelled" && o.status !== "completed";
}

/** Return the open QR for this order, or issue a new one (amount changed, expired, or none yet). */
export async function startQris(order: Order): Promise<Result<PublicPayment>> {
  const gw = getGateway();
  if (!gw) return { ok: false, error: "Pembayaran QRIS otomatis belum aktif." };
  if (!eligibleForQris(order)) return { ok: false, error: "Pesanan ini tidak sedang menunggu pembayaran QRIS." };
  const repo = await getRepo();
  const list = await repo.listPayments(order.id);
  const amount = Math.round(order.total_final!);
  const now = Date.now();
  const reuse = list.find((p) => p.status === "pending" && p.provider === gw.name && p.amount === amount && p.expires_at && Date.parse(p.expires_at) - now > 60_000);
  if (reuse) return { ok: true, data: view(reuse) };
  if (list.length >= 20) return { ok: false, error: "Terlalu banyak QR dibuat untuk pesanan ini. Hubungi kami melalui WhatsApp." };

  // Older open QR codes (other amount, or about to expire) are withdrawn so only one can be paid.
  for (const p of list.filter((x) => x.status === "pending")) {
    await gw.cancel(p.id).catch(() => undefined);
    await repo.recordGatewayPayment(p.id, "cancelled", null, { reason: "superseded" });
  }
  // A QR must expire before the order's own deadline; too close to it, a new QR would outlive the order.
  if (order.pay_by && Date.parse(order.pay_by) - now < 7 * 60_000) return { ok: false, error: "Batas waktu pembayaran pesanan ini hampir habis. Hubungi kami melalui WhatsApp agar pesanan tetap diproses." };
  let expires = now + QR_MINUTES * 60_000;
  if (order.pay_by) expires = Math.min(expires, Date.parse(order.pay_by) - 5 * 60_000);
  expires = Math.max(expires, now + 2 * 60_000);
  // Unique even if two tabs ask at once or an earlier attempt reached the gateway but not our database.
  const id = `${order.code}-Q${list.length + 1}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  try {
    const charge = await gw.createQris({ id, amount, expiresAt: new Date(expires), order });
    const p = await repo.createPayment({ id, order_id: order.id, account_id: null, provider: gw.name, method: "qris", amount, qr_string: charge.qr_string, qr_url: charge.qr_url, va_bank: null, va_number: null, expires_at: charge.expires_at });
    return { ok: true, data: view(p) };
  } catch (e) {
    await reportError("action", e, { path: "/pesanan/:code (QRIS)" });
    return { ok: false, error: "QRIS belum dapat dibuat saat ini. Silakan transfer ke rekening di bawah, atau coba lagi beberapa menit lagi." };
  }
}

/** Virtual-account orders: transfer orders whose final amount is known and not yet paid. */
export function eligibleForVa(o: Order): boolean {
  return o.payment_method === "transfer" && o.total_final !== null && o.total_final > 0 && o.payment_status === "unpaid" && o.status !== "cancelled" && o.status !== "completed";
}

/** Banks a virtual account can be opened at right now (none without a gateway). */
export function availableVaBanks(): Array<{ id: string; label: string }> {
  return getGateway() ? vaBanks().map((id) => ({ id, label: VA_BANK_LABEL[id] })) : [];
}

const unique = () => Math.random().toString(36).slice(2, 5).toUpperCase();

/** Return the open virtual account for this order at this bank, or open a new one (the amount changed, it expired, or another bank). */
export async function startVa(order: Order, bank: string): Promise<Result<PublicPayment>> {
  const gw = getGateway();
  if (!gw) return { ok: false, error: "Virtual account otomatis belum aktif." };
  if (!vaBanks().includes(bank)) return { ok: false, error: "Bank ini tidak tersedia untuk virtual account." };
  if (!eligibleForVa(order)) return { ok: false, error: "Pesanan ini tidak sedang menunggu pembayaran transfer." };
  const repo = await getRepo();
  const list = await repo.listPayments(order.id);
  const amount = Math.round(order.total_final!);
  const now = Date.now();
  const reuse = list.find((p) => p.status === "pending" && p.provider === gw.name && p.method === "va" && p.va_bank === bank && p.amount === amount && p.expires_at && Date.parse(p.expires_at) - now > 5 * 60_000);
  if (reuse) return { ok: true, data: view(reuse) };
  if (list.length >= 20) return { ok: false, error: "Terlalu banyak pembayaran dibuat untuk pesanan ini. Hubungi kami melalui WhatsApp." };
  // only one way to pay is open at a time, so the order cannot be paid twice
  for (const p of list.filter((x) => x.status === "pending")) {
    await gw.cancel(p.id).catch(() => undefined);
    await repo.recordGatewayPayment(p.id, "cancelled", null, { reason: "superseded" });
  }
  if (order.pay_by && Date.parse(order.pay_by) - now < 12 * 60_000) return { ok: false, error: "Batas waktu pembayaran pesanan ini hampir habis. Hubungi kami melalui WhatsApp agar pesanan tetap diproses." };
  let expires = now + VA_HOURS * 3600_000;
  if (order.pay_by) expires = Math.min(expires, Date.parse(order.pay_by) - 5 * 60_000);
  expires = Math.max(expires, now + 5 * 60_000);
  const id = `${order.code}-V${list.length + 1}${unique()}`;
  try {
    const charge = await gw.createVa({ id, amount, expiresAt: new Date(expires), bank, name: order.customer_name, phone: order.phone });
    const p = await repo.createPayment({ id, order_id: order.id, account_id: null, provider: gw.name, method: "va", amount, qr_string: null, qr_url: null, va_bank: charge.bank, va_number: charge.va_number, expires_at: charge.expires_at });
    return { ok: true, data: view(p) };
  } catch (e) {
    await reportError("action", e, { path: "/pesanan/:code (VA)" });
    return { ok: false, error: "Virtual account belum dapat dibuat saat ini. Silakan transfer ke rekening di bawah, atau coba lagi beberapa menit lagi." };
  }
}

/**
 * A restaurant pays its open invoices from the statement link: a virtual account for `amount` (at least Rp10.000, at
 * most what it owes). When paid, the money is recorded as an account payment and matched to invoices oldest first.
 */
export async function startAccountVa(account: BusinessAccount, owed: number, amount: number, bank: string): Promise<Result<PublicPayment>> {
  const gw = getGateway();
  if (!gw) return { ok: false, error: "Virtual account otomatis belum aktif." };
  if (!vaBanks().includes(bank)) return { ok: false, error: "Bank ini tidak tersedia untuk virtual account." };
  if (!Number.isFinite(amount) || amount !== Math.round(amount) || amount < MIN_ACCOUNT_VA || amount > owed) {
    return { ok: false, error: owed < MIN_ACCOUNT_VA ? "Tidak ada tagihan yang perlu dibayar." : `Jumlah pembayaran antara ${rupiah(MIN_ACCOUNT_VA)} dan ${rupiah(owed)}.` };
  }
  const repo = await getRepo();
  const list = await repo.listAccountGatewayPayments(account.id);
  const now = Date.now();
  const reuse = list.find((p) => p.status === "pending" && p.provider === gw.name && p.va_bank === bank && p.amount === amount && p.expires_at && Date.parse(p.expires_at) - now > 5 * 60_000);
  if (reuse) return { ok: true, data: view(reuse) };
  if (list.filter((p) => now - Date.parse(p.created_at) < 86400_000).length >= 10) return { ok: false, error: "Terlalu banyak virtual account dibuat hari ini. Hubungi kami melalui WhatsApp." };
  for (const p of list.filter((x) => x.status === "pending")) {
    await gw.cancel(p.id).catch(() => undefined);
    await repo.recordGatewayPayment(p.id, "cancelled", null, { reason: "superseded" });
  }
  const id = `TG-${account.id.replace(/[^A-Za-z0-9]/g, "").slice(-10)}-${Date.now().toString(36).toUpperCase()}${unique()}`;
  try {
    const charge = await gw.createVa({ id, amount, expiresAt: new Date(now + VA_HOURS * 3600_000), bank, name: account.business_name, phone: account.phone });
    const p = await repo.createPayment({ id, order_id: null, account_id: account.id, provider: gw.name, method: "va", amount, qr_string: null, qr_url: null, va_bank: charge.bank, va_number: charge.va_number, expires_at: charge.expires_at });
    return { ok: true, data: view(p) };
  } catch (e) {
    await reportError("action", e, { path: "/tagihan/:token (VA)" });
    return { ok: false, error: "Virtual account belum dapat dibuat saat ini. Silakan transfer ke rekening yang tertera, atau coba lagi beberapa menit lagi." };
  }
}

/** Tell the owner about payments that need a human: paid after cancellation, paid twice, or a different amount. */
async function followUp(outcome: GatewayOutcome, payment: Payment, amount: number | null) {
  const label = payment.method === "va" ? `Virtual account ${VA_BANK_LABEL[payment.va_bank ?? ""] ?? ""}`.trim() : "QRIS";
  if (outcome === "late" || outcome === "duplicate" || outcome === "mismatch") {
    const what = outcome === "late" ? "dibayar setelah pesanan dibatalkan: kembalikan dana" : outcome === "duplicate" ? "pembayaran ganda: kembalikan kelebihan" : "nominal berbeda dari tagihan: periksa sebelum menandai lunas";
    await alert(`${label} ${payment.id} ${amount !== null ? rupiah(amount) : ""} ${what}.`);
  } else if (outcome === "paid" && payment.account_id) {
    await alert(`${label} ${payment.id}: pembayaran tagihan ${rupiah(amount ?? payment.amount)} diterima dan dicocokkan ke faktur terlama.`);
  }
}

/** Apply a verified gateway result to our records. */
export async function applyGatewayResult(payment: Payment, status: Payment["status"], amount: number | null, raw: unknown): Promise<GatewayOutcome> {
  const repo = await getRepo();
  const outcome = await repo.recordGatewayPayment(payment.id, status, amount, raw);
  await followUp(outcome, payment, amount);
  if (outcome === "paid" && payment.order_id) await notify(payment.order_id, "paid");
  return outcome;
}

const lastSync = new Map<string, number>();

/** Ask the gateway about a pending payment (catches a missed webhook). Throttled to once per 10 s per payment. */
export async function syncPayment(p: Payment, force = false): Promise<void> {
  if (p.status !== "pending") return;
  const gw = getGateway();
  if (!gw || gw.name !== p.provider) return;
  if (!force && Date.now() - (lastSync.get(p.id) ?? 0) < 10_000) return;
  lastSync.set(p.id, Date.now());
  try {
    const st = await gw.getStatus(p.id);
    if (st && st.status !== "pending") await applyGatewayResult(p, st.status, st.amount, st.raw);
    else if (p.expires_at && Date.parse(p.expires_at) < Date.now() - 60_000 && (!st || st.status === "pending")) await applyGatewayResult(p, "expired", null, { reason: "past expiry" });
  } catch (e) {
    await reportError("action", e, { path: "payments/sync" });
  }
}

/** Customer polling: the order's payment state plus the open QR (if any). */
export async function paymentState(order: Order): Promise<{ payment_status: Order["payment_status"]; order_status: Order["status"]; payment: PublicPayment | null }> {
  const repo = await getRepo();
  let list = await repo.listPayments(order.id);
  const open = list.find((p) => p.status === "pending");
  if (open && Date.now() - Date.parse(open.created_at) > 15_000) {
    await syncPayment(open);
    list = await repo.listPayments(order.id);
  }
  const fresh = (await repo.getOrder(order.id)) ?? order;
  const latest = list[0] ?? null;
  return { payment_status: fresh.payment_status, order_status: fresh.status, payment: latest ? view(latest) : null };
}

/** Withdraw open QR codes at the gateway (after re-weighing or cancelling); our own rows are closed by the database. */
export async function cancelOpenAtGateway(payments: Payment[]): Promise<void> {
  const gw = getGateway();
  if (!gw) return;
  for (const p of payments.filter((x) => x.status === "pending" && x.provider === gw.name)) await gw.cancel(p.id).catch(() => undefined);
}

/** Statement polling: one of the account's payments, synced with the gateway when it is pending. */
export async function accountPaymentState(accountId: string, paymentId: string): Promise<PublicPayment | null> {
  const repo = await getRepo();
  const p = await repo.getPayment(paymentId);
  if (!p || p.account_id !== accountId) return null;
  if (p.status === "pending" && Date.now() - Date.parse(p.created_at) > 15_000) await syncPayment(p);
  const fresh = await repo.getPayment(paymentId);
  return fresh ? view(fresh) : null;
}
