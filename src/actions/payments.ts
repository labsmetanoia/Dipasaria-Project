"use server";
// Customer side of QRIS with automatic confirmation. Orders are identified by code + phone, like tracking.
import { getRepo } from "@/lib/data";
import { allow, clientIp, TOO_MANY } from "@/lib/guard";
import { getGateway } from "@/lib/payments/gateway";
import { applyGatewayResult, paymentState, startQris, type PublicPayment } from "@/lib/payments/service";
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

export async function qrisStatusAction(code: string, phone: string): Promise<R<Awaited<ReturnType<typeof paymentState>>>> {
  if (!(await allow("paymentPoll", await clientIp()))) return { ok: false, error: TOO_MANY };
  const order = await findOrder(code, phone);
  if (!order) return { ok: false, error: "Pesanan tidak ditemukan." };
  return { ok: true, data: await paymentState(order) };
}

/** Demo mode only: pretend the customer paid the open QR, through the same path a real confirmation takes. */
export async function simulateDemoPaymentAction(code: string, phone: string): Promise<R<string>> {
  if (getGateway()?.name !== "mock") return { ok: false, error: "Hanya tersedia di mode demo." };
  const order = await findOrder(code, phone);
  if (!order) return { ok: false, error: "Pesanan tidak ditemukan." };
  const open = (await (await getRepo()).listPayments(order.id)).find((p) => p.status === "pending");
  if (!open) return { ok: false, error: "Tidak ada QR yang menunggu pembayaran." };
  return { ok: true, data: await applyGatewayResult(open, "paid", open.amount, { demo: true }) };
}
