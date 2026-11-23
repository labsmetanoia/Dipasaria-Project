import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { InvoiceDoc } from "@/components/finance/InvoiceDoc";
import { PrintButton } from "@/components/admin/PrintButton";

export const metadata = { title: "Faktur" };
export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const repo = await getRepo();
  const order = await repo.getOrder(id);
  if (!order) notFound();
  const [account, settings, data] = await Promise.all([
    order.account_id ? repo.getAccount(order.account_id) : Promise.resolve(null), repo.getSettings(),
    order.account_id ? repo.listReceivables({ accountId: order.account_id }) : Promise.resolve(null),
  ]);
  const settled = data ? data.allocations.filter((a) => a.order_id === order.id).reduce((s, a) => s + a.amount, 0) : 0;
  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href={`/admin/pesanan/${order.id}`} className="text-sm font-semibold text-ocean-900">← {order.code}</Link>
        <PrintButton />
      </div>
      <div className="border border-line"><InvoiceDoc order={order} account={account} settings={settings} settled={settled} /></div>
    </div>
  );
}
