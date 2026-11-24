import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { ReportView } from "@/components/admin/ReportView";
import { FunnelReport } from "@/components/admin/FunnelReport";
import { RatingsReport, RetentionReport } from "@/components/admin/CustomerReports";
import { buildRetention } from "@/lib/retention";
import { SITE_URL } from "@/lib/config";
import { addDays, formatDate, nowJakarta, rupiah } from "@/lib/format";

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const today = nowJakarta().date;
  const from = sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : addDays(today, -13);
  const to = sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : addDays(today, 1);
  const repo = await getRepo();
  const [rows, purchases, claims, funnel, products] = await Promise.all([repo.salesReport(from, to), repo.listPurchases({ from, to }), repo.listClaims({ limit: 500 }), repo.funnelReport(from, to), repo.getProducts({ includeInactive: true })]);
  // customers: ratings in the period; retention over a fixed 180 days (it needs a longer view than one report period)
  const RETENTION_DAYS = 180;
  const [ratings, ratingSummary, facts, customers, settings] = await Promise.all([repo.listRatings({ since: from, limit: 500 }), repo.productRatings(), repo.listOrderFacts(addDays(today, -RETENTION_DAYS)), repo.listCustomers(5000), repo.getSettings()]);
  const ratingsInRange = ratings.filter((r) => nowJakarta(new Date(r.created_at)).date <= to);
  const retention = buildRetention(facts, today);
  const paidByDate = new Map<string, number>();
  for (const p of purchases) if (p.kind === "purchase") paidByDate.set(p.delivery_date, (paidByDate.get(p.delivery_date) ?? 0) + p.total_cost);
  const inRange = claims.filter((c) => c.created_at.slice(0, 10) >= from && c.created_at.slice(0, 10) <= to);
  const refunds = inRange.reduce((s, c) => s + (c.refund_amount ?? 0), 0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="eyebrow">Laporan</p><h1 className="text-2xl text-ocean-900">Penjualan dan margin</h1><p className="text-sm text-mute">Tiga angka penentu bisnis ini: margin kotor di atas 12%, susut di bawah 4%, kas tertagih dalam 7 hari.</p></div>
        <form className="flex items-end gap-2 text-sm">
          <label><span className="label">Dari</span><input type="date" name="from" defaultValue={from} className="input py-1.5" /></label>
          <label><span className="label">Sampai</span><input type="date" name="to" defaultValue={to} className="input py-1.5" /></label>
          <button className="btn-secondary py-1.5">Tampilkan</button>
        </form>
      </div>
      <ReportView rows={rows} from={from} to={to} />
      <FunnelReport rows={funnel} products={products} />
      <RatingsReport ratings={ratingsInRange} products={products} summary={ratingSummary} />
      <RetentionReport data={retention} days={RETENTION_DAYS} storeName={settings.store_name} siteUrl={SITE_URL} mayPromote={customers.filter((c) => c.marketing_opt_in).map((c) => c.phone)} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5 text-sm">
          <h2 className="text-ocean-900">Modal belanja subuh tercatat</h2>
          <p className="text-xs text-mute">Dari catatan di Belanja subuh. Rasio di atas 88% berarti margin kotor di bawah 12%.</p>
          {paidByDate.size === 0 ? <p className="mt-3 text-mute">Belum ada pembelian tercatat pada rentang ini.</p> : (
            <table className="mt-3 w-full">
              <thead className="text-left text-xs text-mute"><tr><th className="py-1">Tanggal</th><th className="text-right">Dibayar</th><th className="text-right">Penjualan</th><th className="text-right">Rasio</th></tr></thead>
              <tbody className="divide-y divide-line">{[...paidByDate].sort().map(([d, paid]) => { const s = rows.find((r) => r.date === d)?.sales ?? 0; return <tr key={d}><td className="py-1.5">{formatDate(d, "short")}</td><td className="text-right">{rupiah(paid)}</td><td className="text-right">{rupiah(s)}</td><td className={`text-right ${s && paid / s > 0.88 ? "font-bold text-gold-ink" : ""}`}>{s ? `${((paid / s) * 100).toFixed(0)}%` : "—"}</td></tr>; })}</tbody>
            </table>
          )}
        </div>
        <div className="card p-5 text-sm">
          <h2 className="text-ocean-900">Garansi kesegaran</h2>
          <p className="mt-2">{inRange.length} laporan · {inRange.filter((c) => c.status === "open").length} menunggu · dana dikembalikan {rupiah(refunds)}</p>
          <p className="text-xs text-mute">Rincian dan keputusan di menu Garansi.</p>
        </div>
      </div>
    </div>
  );
}
