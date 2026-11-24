import { requireAdmin } from "@/lib/auth";
import { expireIfDue } from "@/lib/expiry";
import { notFound } from "next/navigation";
import { getRepo } from "@/lib/data";
import { OrderAdmin } from "@/components/admin/OrderAdmin";
import { TERMS_LABEL } from "@/lib/config";
import { syncPayment } from "@/lib/payments/service";
import { waApiEnabled } from "@/lib/notify/service";
import { RefundPanel } from "@/components/admin/RefundPanel";

export default async function OrderAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  await expireIfDue("wait"); // unpaid orders past their deadline must not reach the buying list or the route
  const { id } = await params;
  const repo = await getRepo();
  const [order, settings] = await Promise.all([repo.getOrder(id), repo.getSettings()]);
  if (!order) notFound();
  // an open QR is checked with the gateway on every visit, in case a notification was missed
  for (const p of await repo.listPayments(id)) await syncPayment(p);
  const [fresh, payments, wa, claims] = await Promise.all([repo.getOrder(id), repo.listPayments(id), repo.listWa(id), repo.listClaims({ orderId: id, status: "open" })]);
  const account = order.account_id ? await repo.getAccount(order.account_id) : null;
  const terms = account ? `${TERMS_LABEL[account.payment_terms]}${account.allow_cod ? " · COD" : ""}${account.discount_pct ? ` · diskon ${account.discount_pct}%` : ""}` : undefined;
  const [rating, refunds, allClaims] = await Promise.all([repo.getRatingForOrder(order.id), repo.listRefunds({ orderId: id }), repo.listClaims({ orderId: id })]);
  // refunds: shown once money was received (or given back); the suggestion is what is left to give back
  const o = fresh ?? order;
  const received = Math.max(payments.filter((p) => p.status === "paid").reduce((t, p) => t + (p.amount_paid ?? 0), 0), o.payment_status === "paid" || o.payment_status === "refund_due" ? o.total_final ?? o.total_est : 0, o.cod_collected ?? 0);
  const refunded = refunds.reduce((t, r) => t + r.amount, 0);
  const refundClaims = allClaims.filter((c) => c.status === "refund").map((c) => ({ id: c.id, amount: c.refund_amount }));
  const suggested = o.payment_status === "refund_due" ? received - refunded : refundClaims.reduce((t, c) => t + (c.amount ?? 0), 0) - refunded;
  const refundPanel = received > 0 || refunds.length > 0
    ? <div className="mt-5"><RefundPanel orderId={o.id} refunds={refunds} due={o.payment_status === "refund_due"} suggested={Math.max(0, suggested)} claims={refundClaims} /></div>
    : null;
  return <><OrderAdmin order={o} settings={settings} accountTerms={terms} payments={payments} wa={wa} waApi={waApiEnabled()} claimsOpen={claims.length} rating={rating ? { stars: rating.stars, comment: rating.comment } : null} />{refundPanel}</>;
}
