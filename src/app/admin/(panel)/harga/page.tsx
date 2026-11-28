// Harga hari ini: after the auction, set the day's prices from what the fish actually cost, and see which restaurant
// contract prices the market has overtaken. Then make the price card for WhatsApp Status and restaurant groups.
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { addDays, formatDate, nowJakarta, rupiah } from "@/lib/format";
import { RECENT_DAYS, contractAlerts, priceRows } from "@/lib/dailyPrice";
import { DailyPrices } from "@/components/admin/DailyPrices";
import { PriceCardPanel } from "@/components/admin/PriceCardPanel";
import { UNIT_LABEL } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function DailyPricePage() {
  await requireAdmin();
  const repo = await getRepo();
  const today = nowJakarta().date;
  const [products, categories, settings, purchases, contracts, accounts] = await Promise.all([
    repo.getProducts({ includeCost: true }), repo.getCategories(), repo.getSettings(),
    repo.listPurchases({ from: addDays(today, -(RECENT_DAYS - 1)), to: today }), repo.listContractPrices(), repo.listAccounts(),
  ]);
  const rows = priceRows(products, purchases, settings, today);
  const alerts = contractAlerts(contracts, accounts, products, purchases, settings, today);
  // pre-order sizes are sold on their campaign page, not on the day's card
  const preorder = new Set(products.filter((p) => p.campaign_id).map((p) => p.id));
  const cardItems = rows.filter((r) => r.available && !preorder.has(r.product_id)).map((r) => ({ variant_id: r.variant_id, name: r.product_name, label: r.label, category_id: r.category_id, storage: r.storage_class, business_only: r.business_only, bought: r.cost.source === "today" }));
  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Penjualan</p>
        <h1 className="text-2xl text-ocean-900">Harga hari ini</h1>
        <p className="max-w-3xl text-sm text-mute">Setelah lelang: modal pagi ini dari Belanja subuh, harga yang sedang berlaku dan marginnya, serta harga yang menjaga target margin. Tidak ada harga yang berubah sebelum Anda menyimpan. Lalu buat kartu harga untuk Status WhatsApp dan grup restoran.</p>
      </div>
      <DailyPrices rows={rows} categories={categories.map((c) => ({ id: c.id, name: c.name }))} targetRetail={settings.target_margin_retail} targetBusiness={settings.target_margin_business} today={today} />

      <div className="card p-5" data-contract-alerts>
        <h2 className="text-lg text-ocean-900">Harga kontrak di bawah target</h2>
        <p className="text-xs text-mute">Harga kontrak restoran yang berlaku hari ini, dibandingkan dengan modal rata-rata {RECENT_DAYS} hari terakhir. Target margin grosir {settings.target_margin_business}%.</p>
        {alerts.length === 0 ? <p className="mt-3 text-sm text-mute">Semua harga kontrak masih di atas target.</p> : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead><tr className="border-b border-line text-left text-xs text-mute"><th className="py-2 pr-2">Restoran</th><th className="py-2 pr-2">Produk</th><th className="py-2 pr-2 text-right">Harga kontrak</th><th className="py-2 pr-2 text-right">Modal 7 hari</th><th className="py-2 pr-2 text-right">Margin</th><th className="py-2">Berlaku sampai</th></tr></thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.contract_id} className="border-b border-line/60">
                    <td className="py-2 pr-2"><Link href={`/admin/piutang/${a.account_id}`} className="font-semibold text-gold-ink">{a.account_name}</Link></td>
                    <td className="py-2 pr-2">{a.product_name} <span className="text-mute">{a.label}</span></td>
                    <td className="py-2 pr-2 text-right">{rupiah(a.price)}/{UNIT_LABEL[a.unit] ?? a.unit}</td>
                    <td className="py-2 pr-2 text-right">{rupiah(a.cost)}</td>
                    <td className={`py-2 pr-2 text-right font-bold ${a.margin < 0 ? "text-gold-ink" : ""}`}>{a.margin.toFixed(1).replace(".", ",")}%</td>
                    <td className="py-2">{a.ends_on ? formatDate(a.ends_on, "short") : "sampai diubah"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-mute">Ubah atau akhiri harga kontrak di halaman restoran (Piutang → Harga kontrak), atau kirim penawaran baru dari menu Penawaran harga.</p>
          </div>
        )}
      </div>

      <PriceCardPanel items={cardItems} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
