import { notFound } from "next/navigation";
import { getRepo } from "@/lib/data";
import { OrderAdmin } from "@/components/admin/OrderAdmin";
import { TERMS_LABEL } from "@/lib/config";

export default async function OrderAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepo();
  const [order, settings] = await Promise.all([repo.getOrder(id), repo.getSettings()]);
  if (!order) notFound();
  const account = order.account_id ? await repo.getAccount(order.account_id) : null;
  const terms = account ? `${TERMS_LABEL[account.payment_terms]}${account.allow_cod ? " · COD" : ""}${account.discount_pct ? ` · diskon ${account.discount_pct}%` : ""}` : undefined;
  return <OrderAdmin order={order} settings={settings} accountTerms={terms} />;
}
