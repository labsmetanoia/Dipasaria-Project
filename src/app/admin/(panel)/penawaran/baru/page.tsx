import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { QuoteEditor } from "@/components/admin/QuoteEditor";
import { addDays, nowJakarta } from "@/lib/format";
import { everyday } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ akun?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const repo = await getRepo();
  const [accounts, products] = await Promise.all([repo.listAccounts(), repo.getProducts({ includeCost: true }).then(everyday)]);
  const today = nowJakarta().date;
  return (
    <div className="space-y-4">
      <div><p className="eyebrow">Penjualan</p><h1 className="text-2xl text-ocean-900">Penawaran baru</h1></div>
      <QuoteEditor quote={null} accounts={accounts.filter((a) => a.status !== "suspended")} products={products} defaults={{ valid_until: addDays(today, 14), price_from: today }} prefillAccount={sp.akun ?? null} />
    </div>
  );
}
