"use server";
// Customer side of QRIS with automatic confirmation. Orders are identified by code + phone, like tracking.
import { getRepo } from "@/lib/data";
import { allow, clientIp, TOO_MANY } from "@/lib/guard";
import { getGateway } from "@/lib/payments/gateway";
import { accountPaymentState, applyGatewayResult, paymentState, startAccountVa, startQris, startVa, type PublicPayment } from "@/lib/payments/service";
import { verifyStatementToken } from "@/lib/statementLink";
import { buildLedger } from "@/lib/receivables";
import { nowJakarta } from "@/lib/format";
import type { Order } from "@/lib/types";

type R<T> = { ok: true; data: T } | { ok: false; error: string };

async function findOrder(code: unknown, phone: unknown): Promise<Order | null> {
  if (typeof code !== "string" || typeof phone !== "string" || !code.trim() || !phone.trim()) return null;
  return (await getRepo()).lookupOrder(code, phone);
}

export async function startQrisAction(code: string, phone: string): Promise<R<PublicPayment>> {
  if (!(await allow("lookup", await clientIp()))) return { ok: false, error: TOO_MANY };
  const order = await findOrder(code, phone);
  if (!order) return { ok: false, error: "Pesanan tidak ditemukan." };
  return startQris(order);
}

/** A virtual account at the chosen bank for a transfer order's final amount. */
export async function startVaAction(code: string, phone: string, bank: string): Promise<R<PublicPayment>> {
  if (!(await allow("lookup", await clientIp()))) return { ok: false, error: TOO_MANY };
  const order = await findOrder(code, phone);
  if (!order) return { ok: false, error: "Pesanan tidak ditemukan." };
  return startVa(order, String(bank ?? ""));
}

export async function qrisStatusAction(code: string, phone: string): Promise<R<Awaited<ReturnType<typeof paymentState>>>> {
  if (!(await allow("paymentPoll", await clientIp()))) return { ok: false, error: TOO_MANY };
  const order = await findOrder(code, phone);
  // Only orders that already have a QR can be polled, so this generous limit cannot be used to guess order codes.
  if (!order || !(await (await getRepo()).listPayments(order.id)).length) return { ok: false, error: "Pesanan tidak ditemukan." };
  return { ok: true, data: await paymentState(order) };
}

/** Demo mode only: pretend the customer paid the open QR, through the same path a real confirmation takes. */
export async function simulateDemoPaymentAction(code: string, phone: string): Promise<R<string>> {
  if (getGateway()?.name !== "mock") return { ok: false, error: "Hanya tersedia di mode demo." };
  const order = await findOrder(code, phone);
  if (!order) return { ok: false, error: "Pesanan tidak ditemukan." };
  const open = (await (await getRepo()).listPayments(order.id)).find((p) => p.status === "pending");
  if (!open) return { ok: false, error: "Tidak ada pembayaran yang menunggu." };
  return { ok: true, data: await applyGatewayResult(open, "paid", open.amount, { demo: true }) };
}

// ---------- a restaurant paying its open invoices from the signed statement link ----------
async function statementAccount(token: unknown) {
  const id = typeof token === "string" ? verifyStatementToken(token) : null;
  if (!id) return null;
  const repo = await getRepo();
  const account = await repo.getAccount(id);
  if (!account) return null;
  const r = await repo.listReceivables({ accountId: id });
  return { account, owed: Math.max(0, Math.round(buildLedger(account, r.orders, r.payments, r.allocations, nowJakarta().date).balance)) };
}

export async function startStatementVaAction(token: string, bank: string, amount: number): Promise<R<PublicPayment>> {
  if (!(await allow("lookup", await clientIp()))) return { ok: false, error: TOO_MANY };
  const s = await statementAccount(token);
  if (!s) return { ok: false, error: "Tautan tagihan tidak berlaku." };
  return startAccountVa(s.account, s.owed, Math.round(Number(amount)), String(bank ?? ""));
}

export async function statementPaymentAction(token: string, paymentId: string): Promise<R<PublicPayment>> {
  if (!(await allow("paymentPoll", await clientIp()))) return { ok: false, error: TOO_MANY };
  const id = typeof token === "string" ? verifyStatementToken(token) : null;
  const p = id && typeof paymentId === "string" ? await accountPaymentState(id, paymentId) : null;
  return p ? { ok: true, data: p } : { ok: false, error: "Pembayaran tidak ditemukan." };
}

/** Demo mode only: pretend the restaurant transferred to its virtual account. */
export async function simulateStatementPaymentAction(token: string, paymentId: string): Promise<R<string>> {
  if (getGateway()?.name !== "mock") return { ok: false, error: "Hanya tersedia di mode demo." };
  const id = typeof token === "string" ? verifyStatementToken(token) : null;
  const p = id ? await (await getRepo()).getPayment(String(paymentId)) : null;
  if (!p || p.account_id !== id || p.status !== "pending") return { ok: false, error: "Tidak ada pembayaran yang menunggu." };
  return { ok: true, data: await applyGatewayResult(p, "paid", p.amount, { demo: true }) };
}
