// Midtrans HTTP notification. Set this URL in the Midtrans dashboard (Settings → Configuration → Payment
// Notification URL): https://<your-domain>/api/payments/midtrans
// Trust model: the signature proves the call came from Midtrans; the order is then marked paid only from the
// result of Midtrans' own status API, never from the notification body.
import { NextResponse } from "next/server";
import { getRepo } from "@/lib/data";
import { midtrans, verifyMidtransSignature } from "@/lib/payments/midtrans";
import { applyGatewayResult } from "@/lib/payments/service";
import { reportError } from "@/lib/monitor";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!verifyMidtransSignature(body)) return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  try {
    const repo = await getRepo();
    const payment = await repo.getPayment(String(body.order_id));
    if (!payment) return NextResponse.json({ ok: true, ignored: "unknown order_id" }); // not one of ours: acknowledge, do nothing
    const st = await midtrans.getStatus(payment.id);
    if (!st) return NextResponse.json({ ok: true, ignored: "status unavailable" });
    const outcome = st.status === "pending" ? "noop" : await applyGatewayResult(payment, st.status, st.amount, st.raw);
    return NextResponse.json({ ok: true, outcome });
  } catch (e) {
    await reportError("action", e, { path: "/api/payments/midtrans" });
    return NextResponse.json({ error: "temporary failure" }, { status: 500 }); // Midtrans retries
  }
}
