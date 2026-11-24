import { requireAdmin } from "@/lib/auth";
import { expireIfDue } from "@/lib/expiry";
import { getRepo } from "@/lib/data";
import { pickDate } from "@/lib/ops";
import { DateSelector } from "@/components/admin/DateSelector";
import { PrintButton } from "@/components/admin/PrintButton";
import { CheckRow } from "@/components/admin/Checklist";
import { Empty } from "@/components/ui";
import { formatDate, nowJakarta, rupiah } from "@/lib/format";
import { PurchaseLog } from "@/components/admin/PurchaseLog";
import { dayCost } from "@/lib/daycost";
import { WeeklyContentsEditor } from "@/components/admin/WeeklyContentsEditor";
import { STORAGE_LABEL, UNIT_LABEL } from "@/lib/config";
import type { StorageClass } from "@/lib/types";

const GROUPS: Array<{ key: StorageClass; title: string; hint: string }> = [
  { key: "chilled", title: "Lelang Muara Baru dan ikan segar", hint: "Beli sesuai daftar ditambah cadangan; periksa mata, insang, aroma, dan suhu inti ≤4 °C; foto per lot." },
  { key: "frozen", title: "Ambil dari freezer", hint: "FEFO: ambil kedaluwarsa terdekat; kantong terinsulasi terpisah." },
  { key: "ambient", title: "Rak suhu ruang", hint: "Telur dan bumbu dikemas dalam wadah terpisah." },
];

export default async function BuyingListPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireAdmin();
  await expireIfDue("wait"); // unpaid orders past their deadline must not reach the buying list or the route
  const { date: dp } = await searchParams;
  const date = pickDate(dp);
  const repo = await getRepo();
  const [lines, settings, purchases, orders, summary, products] = await Promise.all([repo.buyingList(date), repo.getSettings(), repo.listPurchases({ date }), repo.listOrders({ date }), repo.dailySummary(date), repo.getProducts()]);
  // trader's-pick boxes: the owner writes this week's contents here, after seeing the auction
  const curated = products.filter((p) => p.curated);
  const contents = new Map(curated.map((p) => [p.id, (p.weekly_contents ?? "").trim()]));
  // real margin and shrinkage (shared with the morning brief)
  const { net, paid, actualCost, shrink } = dayCost(orders, purchases, summary, (pid) => lines.find((l) => l.product_id === pid)?.product_name ?? pid);
  // one buying-log form per product (size variants of the same fish are bought together)
  const logShown = new Set<string>();
  const firstRowOf = (pid: string, unit: string) => (logShown.has(pid + unit) ? false : (logShown.add(pid + unit), true));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="eyebrow">Belanja subuh</p><h1 className="text-2xl text-ocean-900">Daftar belanja · {formatDate(date, "weekday")}</h1><p className="text-xs text-mute">Cadangan ikan segar {settings.catch_weight_buffer_pct}% untuk memilih ekor yang pas dan susut pembersihan.</p></div>
        <div className="flex gap-2"><DateSelector date={date} /><PrintButton /></div>
      </div>
      {curated.length > 0 && (
        <section className="card space-y-4 p-4 text-sm">
          <div><h2 className="text-ocean-900">Kotak pilihan pedagang</h2><p className="text-xs text-mute">Tulis isi minggu ini setelah melihat lelang. Pelanggan melihatnya di halaman produk dan di kotak mingguan mereka; pengemas melihatnya di lembar rute.</p></div>
          {curated.map((p) => {
            const ordered = lines.filter((l) => l.product_id === p.id).map((l) => `${l.qty} × ${l.variant_label.split(",")[0]}`).join(", ") || "belum ada pesanan untuk tanggal ini";
            return <WeeklyContentsEditor key={p.id} productId={p.id} name={p.name} ordered={ordered} text={p.weekly_contents ?? ""} textEn={p.weekly_contents_en ?? ""} updated={p.weekly_contents_at ? formatDate(nowJakarta(new Date(p.weekly_contents_at)).date, "weekday") : null} />;
          })}
        </section>
      )}
      {lines.length === 0 ? <Empty title="Belum ada pesanan untuk tanggal ini" /> : GROUPS.map((g) => {
        const rows = lines.filter((l) => l.storage_class === g.key);
        if (!rows.length) return null;
        return (
          <section key={g.key} className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line bg-sand-100 px-4 py-2.5"><h2 className="text-ocean-900">{g.title} <span className="ml-1 text-xs font-normal text-mute">{STORAGE_LABEL[g.key]}</span></h2><span className="text-xs text-mute">{rows.length} baris</span></div>
            <p className="px-4 pt-2 text-xs text-mute">{g.hint}</p>
            <div className="divide-y divide-line">
              {rows.map((l) => (
                <CheckRow key={`${l.product_id}-${l.variant_label}`} id={`${l.product_id}-${l.variant_label}`} extra={firstRowOf(l.product_id, l.unit) && <PurchaseLog date={date} productId={l.product_id} unit={l.unit} unitLabel={UNIT_LABEL[l.unit]} suggested={l.qty_with_buffer} entries={purchases.filter((p) => p.product_id === l.product_id && p.unit === l.unit)} />}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div><p className="font-semibold">{l.product_name} <span className="font-normal text-mute">{l.variant_label}</span></p>{l.scientific_name && <p className="text-xs italic text-mute">{l.scientific_name}</p>}</div>
                    <p className="font-display text-xl font-semibold text-ocean-900">{l.qty_with_buffer} <span className="text-sm font-normal text-mute">{UNIT_LABEL[l.unit]}</span>{l.qty_with_buffer !== l.qty && <span className="ml-2 text-xs font-normal text-mute">(dipesan {l.qty}, {l.order_count} pesanan)</span>}</p>
                  </div>
                  {contents.get(l.product_id) && <p className="mt-1 text-xs text-tide-700">Isi: {contents.get(l.product_id)}</p>}
                  {l.prep_notes.length > 0 && <ul className="mt-1 space-y-0.5 text-xs text-warn-600">{l.prep_notes.map((n, i) => <li key={i}>✂ {n}</li>)}</ul>}
                </CheckRow>
              ))}
            </div>
          </section>
                );
      })}
      {lines.length > 0 && (
        <section className="card p-4 text-sm">
          <h2 className="text-ocean-900">Modal dan susut hari ini</h2>
          <p className="text-xs text-mute">Catat pembelian di setiap baris di atas. Produk yang belum dicatat memakai harga modal di Produk dan stok.</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div><dt className="text-xs text-mute">Penjualan produk (setelah diskon)</dt><dd className="text-lg font-bold">{rupiah(net)}</dd></div>
            <div><dt className="text-xs text-mute">Dibayar di lelang/pemasok</dt><dd className="text-lg font-bold">{rupiah(paid)}</dd></div>
            <div><dt className="text-xs text-mute">Modal (aktual + perkiraan)</dt><dd className="text-lg font-bold">{rupiah(Math.round(actualCost))}</dd></div>
            <div><dt className="text-xs text-mute">Margin kotor</dt><dd className={`text-lg font-bold ${net && (net - actualCost) / net < 0.1 ? "text-gold-ink" : ""}`}>{rupiah(Math.round(net - actualCost))}{net ? ` · ${(((net - actualCost) / net) * 100).toFixed(1).replace(".", ",")}%` : ""}</dd></div>
          </dl>
          {shrink.length > 0 && (
            <table className="mt-3 w-full text-xs">
              <thead><tr className="text-left text-mute"><th className="py-1">Produk</th><th>Dibeli</th><th>Terjual</th><th>Sisa</th><th>Susut</th></tr></thead>
              <tbody className="divide-y divide-line">{shrink.map((r) => <tr key={r.pid}><td className="py-1">{r.name}</td><td>{String(r.bought).replace(".", ",")}</td><td>{String(Math.round(r.sold * 1000) / 1000).replace(".", ",")}</td><td>{String(r.left).replace(".", ",")}</td><td className={r.lossPct > settings.catch_weight_buffer_pct ? "font-bold text-gold-ink" : ""}>{r.lossPct.toFixed(1).replace(".", ",")}%</td></tr>)}</tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
