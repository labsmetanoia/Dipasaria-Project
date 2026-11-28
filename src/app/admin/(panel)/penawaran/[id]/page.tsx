import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { QuoteEditor } from "@/components/admin/QuoteEditor";
import { QuoteActions } from "@/components/admin/QuoteActions";
import { QuoteDoc } from "@/components/finance/QuoteDoc";
import { Badge } from "@/components/ui";
import { addDays, nowJakarta } from "@/lib/format";
import { QUOTE_STATE_LABEL, quoteState } from "@/lib/sales";
import { quoteUrl } from "@/lib/quoteLink";
import { everyday } from "@/lib/campaigns";
import { RECENT_DAYS, recentCosts } from "@/lib/dailyPrice";

export const dynamic = "force-dynamic";

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const repo = await getRepo();
  const [quote, accounts, products, settings] = await Promise.all([repo.getQuote(id), repo.listAccounts(), repo.getProducts({ includeCost: true }).then(everyday), repo.getSettings()]);
  if (!quote) notFound();
  const today = nowJakarta().date;
  const costs = recentCosts(products, await repo.listPurchases({ from: addDays(today, -(RECENT_DAYS - 1)), to: today }), today);
  const st = quoteState(quote, today);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="eyebrow"><Link href="/admin/penawaran">Penawaran harga</Link></p><h1 className="text-2xl text-ocean-900">{quote.code} · {quote.business_name}</h1></div>
        <Badge tone={st === "accepted" ? "success" : st === "sent" ? "tide" : st === "expired" ? "warn" : "neutral"}>{QUOTE_STATE_LABEL[st]}</Badge>
      </div>
      <QuoteActions quote={quote} link={quoteUrl(quote.id)} storeName={settings.store_name} />
      {quote.status === "draft" && <QuoteEditor costs={costs} quote={quote} accounts={accounts.filter((a) => a.status !== "suspended")} products={products} defaults={{ valid_until: addDays(today, 14), price_from: today }} />}
      <div className="border border-line"><QuoteDoc quote={quote} products={products} settings={settings} /></div>
    </div>
  );
}
