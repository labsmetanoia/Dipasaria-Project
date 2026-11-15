import { requireAdmin } from "@/lib/auth";
import { expireIfDue } from "@/lib/expiry";
import { notFound } from "next/navigation";
import { getRepo } from "@/lib/data";
import { OrderAdmin } from "@/components/admin/OrderAdmin";
import { TERMS_LABEL } from "@/lib/config";
import { syncPayment } from "@/lib/payments/service";
import { waApiEnabled } from "@/lib/notify/service";

export default async function OrderAdminPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  await expireIfDue(); // unpaid orders past their deadline must not reach the buying list or the route
  const { id } = await params;
  const repo = await getRepo();
  const [order, settings] = await Promise.all([repo.getOrder(id), repo.getSettings()]);
  if (!order) notFound();
  // an open QR is checked with the gateway on every visit, in case a notification was missed
  for (const p of await repo.listPayments(id)) await syncPayment(p);
  const [fresh, payments, wa] = await Promise.all([repo.getOrder(id), repo.listPayments(id), repo.listWa(id)]);
  const account = order.account_id ? await repo.getAccount(order.account_id) : null;
  const terms = account ? `${TERMS_LABEL[account.payment_terms]}${account.allow_cod ? " · COD" : ""}${account.discount_pct ? ` · diskon ${account.discount_pct}%` : ""}` : undefined;
  return <OrderAdmin order={fresh ?? order} settings={settings} accountTerms={terms} payments={payments} wa={wa} waApi={waApiEnabled()} />;
}
