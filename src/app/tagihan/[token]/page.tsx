// The restaurant's statement, opened from the signed link in the WhatsApp summary (no sign-in needed).
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRepo } from "@/lib/data";
import { addDays, nowJakarta } from "@/lib/format";
import { buildLedger, buildStatement } from "@/lib/receivables";
import { verifyStatementToken } from "@/lib/statementLink";
import { StatementDoc } from "@/components/finance/StatementDoc";
import { PrintButton } from "@/components/admin/PrintButton";

export const metadata: Metadata = { title: "Tagihan", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PublicStatementPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const accountId = verifyStatementToken(token);
  if (!accountId) return <Expired />;
  const repo = await getRepo();
  const account = await repo.getAccount(accountId);
  if (!account) notFound();
  const today = nowJakarta().date;
  const [data, settings] = await Promise.all([repo.listReceivables({ accountId }), repo.getSettings()]);
  const ledger = buildLedger(account, data.orders, data.payments, data.allocations, today);
  return (
    <main className="min-h-screen bg-sand-50 px-4 py-6 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-3 flex max-w-3xl justify-end"><PrintButton /></div>
      <StatementDoc account={account} settings={settings} ledger={ledger} statement={buildStatement(ledger, addDays(today, -60), today)} today={today} invoiceHref={(_, code) => `/tagihan/${token}/${code}`} />
    </main>
  );
}

function Expired() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-sand-50 px-4">
      <div className="max-w-md bg-white p-6 text-center text-sm"><h1 className="text-2xl">Tautan tidak berlaku</h1><p className="mt-2 text-mute">Tautan tagihan ini sudah kedaluwarsa atau tidak lengkap. Minta ringkasan tagihan terbaru melalui WhatsApp, atau masuk ke akun bisnis Anda di halaman Akun.</p></div>
    </main>
  );
}
