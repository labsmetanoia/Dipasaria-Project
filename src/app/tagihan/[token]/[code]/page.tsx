// One invoice from the restaurant's statement link (only orders of the account the link was issued for).
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRepo } from "@/lib/data";
import { verifyStatementToken } from "@/lib/statementLink";
import { InvoiceDoc } from "@/components/finance/InvoiceDoc";
import { PrintButton } from "@/components/admin/PrintButton";

export const metadata: Metadata = { title: "Faktur", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string; code: string }> }) {
  const { token, code } = await params;
  const accountId = verifyStatementToken(token);
  if (!accountId) notFound();
  const repo = await getRepo();
  const data = await repo.listReceivables({ accountId });
  const hit = data.orders.find((o) => o.code.toUpperCase() === decodeURIComponent(code).toUpperCase());
  if (!hit) notFound();
  const [order, account, settings] = await Promise.all([repo.getOrder(hit.id), repo.getAccount(accountId), repo.getSettings()]);
  if (!order || order.account_id !== accountId) notFound();
  const settled = data.allocations.filter((a) => a.order_id === order.id).reduce((s, a) => s + a.amount, 0);
  return (
    <main className="min-h-screen bg-sand-50 px-4 py-6 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-3 flex max-w-3xl items-center justify-between"><Link href={`/tagihan/${token}`} className="text-sm font-semibold text-ocean-900">← Rekening koran</Link><PrintButton /></div>
      <InvoiceDoc order={order} account={account} settings={settings} settled={settled} />
    </main>
  );
}
