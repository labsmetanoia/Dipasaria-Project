import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { nowJakarta } from "@/lib/format";
import { buildLedger, buildStatement } from "@/lib/receivables";
import { StatementDoc } from "@/components/finance/StatementDoc";
import { PrintButton } from "@/components/admin/PrintButton";

export const metadata = { title: "Rekening koran" };
export const dynamic = "force-dynamic";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function StatementPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const repo = await getRepo();
  const account = await repo.getAccount(id);
  if (!account) notFound();
  const today = nowJakarta().date;
  const to = sp.to && ISO.test(sp.to) ? sp.to : today;
  const from = sp.from && ISO.test(sp.from) && sp.from <= to ? sp.from : `${to.slice(0, 8)}01`;
  const [data, settings] = await Promise.all([repo.listReceivables({ accountId: id }), repo.getSettings()]);
  const ledger = buildLedger(account, data.orders, data.payments, data.allocations, today);
  return (
    <div className="space-y-4">
      <form className="no-print flex flex-wrap items-end gap-3" method="get">
        <p className="w-full text-sm"><Link href={`/admin/piutang/${id}`} className="font-semibold text-ocean-900">← {account.business_name}</Link></p>
        <label className="text-xs font-semibold">Dari<input className="input mt-1" type="date" name="from" defaultValue={from} /></label>
        <label className="text-xs font-semibold">Sampai<input className="input mt-1" type="date" name="to" defaultValue={to} max={today} /></label>
        <button className="btn-secondary">Tampilkan</button>
        <PrintButton />
      </form>
      <div className="border border-line">
        <StatementDoc account={account} settings={settings} ledger={ledger} statement={buildStatement(ledger, from, to)} today={today} invoiceHref={(orderId) => `/admin/pesanan/${orderId}/faktur`} />
      </div>
    </div>
  );
}
