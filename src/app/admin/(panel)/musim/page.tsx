// Seasonal pre-orders in the back-office: create a campaign, see what it has sold per size and delivery day (paid
// apart from not yet paid) to buy ahead, and edit its dates. Products join a campaign from their own product page.
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { Badge } from "@/components/ui";
import { CampaignEditor } from "@/components/admin/CampaignEditor";
import { addDays, formatDate, jam, nowJakarta, qtyUnit, rupiah } from "@/lib/format";
import { campaignState, campaignSummary, dayRange, isListed } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

const STATE = { upcoming: ["Belum dibuka", "tide"], open: ["Menerima pesanan", "success"], closed: ["Pesanan ditutup", "warn"], over: ["Selesai", "neutral"] } as const;

export default async function CampaignsPage() {
  await requireAdmin();
  const repo = await getRepo();
  const [campaigns, products, settings] = await Promise.all([repo.getCampaigns({ includeInactive: true }), repo.getProducts({ includeInactive: true }), repo.getSettings()]);
  const now = nowJakarta();
  const orders = await Promise.all(campaigns.map((c) => repo.listOrders({ campaignId: c.id, limit: 5000 })));
  const defaults = { opens_on: now.date, order_by: addDays(now.date, 14), deliver_from: addDays(now.date, 16), deliver_to: addDays(now.date, 17) };
  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Penjualan</p>
        <h1 className="text-2xl text-ocean-900">Pre-order musiman</h1>
        <p className="max-w-3xl text-sm text-mute">Satu halaman per momen (Malam Tahun Baru, Imlek, Lebaran) dengan produknya sendiri. Pelanggan memesan dan membayar di muka berminggu-minggu sebelumnya, sehingga jumlah yang perlu dibeli di lelang sudah diketahui. Pemesanan ditutup pada pukul {jam(settings.cutoff_time)} WIB di tanggal batas pesan; pesanan yang belum dibayar dibatalkan otomatis sesuai batas waktu pembayaran.</p>
      </div>

      <details className="card p-5" open={campaigns.length === 0}>
        <summary className="cursor-pointer font-semibold text-ocean-900">+ Pre-order baru</summary>
        <div className="mt-4"><CampaignEditor campaign={null} defaults={defaults} /></div>
      </details>

      {campaigns.map((c, ci) => {
        const state = campaignState(c, now, settings.cutoff_time);
        const [label, tone] = STATE[state];
        const own = products.filter((p) => p.campaign_id === c.id);
        const sum = campaignSummary(orders[ci], new Set(own.map((p) => p.id)));
        const days: string[] = [];
        for (let d = c.deliver_from; d <= c.deliver_to; d = addDays(d, 1)) days.push(d);
        return (
          <section key={c.id} className="card space-y-4 p-5" data-campaign={c.slug}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl text-ocean-900">{c.name}</h2>
                <p className="text-sm text-mute">Dibuka {formatDate(c.opens_on, "short")} · pesan paling lambat {formatDate(c.order_by, "short")} pukul {jam(settings.cutoff_time)} · kirim {dayRange(c.deliver_from, c.deliver_to)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {c.is_active ? <Badge tone={tone}>{label}</Badge> : <Badge>Nonaktif</Badge>}
                {isListed(c, now, settings.cutoff_time) && <Link href={`/belanja/musim/${c.slug}`} target="_blank" className="text-sm font-semibold text-gold-ink underline">Lihat halaman</Link>}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="bg-sand-50 p-3"><dt className="text-xs text-mute">Pesanan</dt><dd className="text-lg font-bold" data-campaign-orders>{sum.orders}</dd></div>
              <div className="bg-sand-50 p-3"><dt className="text-xs text-mute">Lunas atau tempo</dt><dd className="text-lg font-bold">{sum.paidOrders}{sum.unpaidOrders ? <span className="text-sm font-normal text-mute"> · {sum.unpaidOrders} belum dibayar</span> : null}</dd></div>
              <div className="bg-sand-50 p-3"><dt className="text-xs text-mute">Penjualan pasti</dt><dd className="text-lg font-bold">{rupiah(sum.paidSales)}</dd></div>
              <div className="bg-sand-50 p-3"><dt className="text-xs text-mute">Per hari kirim</dt><dd className="font-semibold">{days.map((d) => `${formatDate(d, "short")}: ${sum.byDate[d] ?? 0}`).join(" · ")}</dd></div>
            </dl>

            <div>
              <h3 className="font-semibold text-ocean-900">Rencana pembelian</h3>
              <p className="text-xs text-mute">Jumlah yang sudah dibayar (atau tempo) per ukuran dan hari kirim; angka “belum dibayar” bisa batal otomatis. Pada hari kirim, jumlah ini juga muncul di Belanja subuh.</p>
              {sum.plan.length ? (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm" data-plan>
                    <thead><tr className="border-b border-line text-left text-xs text-mute"><th className="py-2 pr-3">Produk</th>{days.map((d) => <th key={d} className="py-2 pr-3 text-right">{formatDate(d, "weekday")}</th>)}<th className="py-2 pr-3 text-right">Total</th><th className="py-2 text-right">Sisa stok</th></tr></thead>
                    <tbody>
                      {sum.plan.map((r) => {
                        const v = own.flatMap((p) => p.variants).find((x) => x.id === r.variant_id);
                        return (
                          <tr key={r.variant_id} className="border-b border-line/60">
                            <td className="py-2 pr-3"><b>{r.product_name}</b> <span className="text-mute">{r.variant_label}</span></td>
                            {days.map((d) => { const cell = r.byDate[d]; return <td key={d} className="py-2 pr-3 text-right">{cell ? <><b>{qtyUnit(cell.paid, r.unit)}</b>{cell.unpaid ? <span className="block text-xs text-mute">+{qtyUnit(cell.unpaid, r.unit)} belum dibayar</span> : null}</> : "—"}</td>; })}
                            <td className="py-2 pr-3 text-right"><b>{qtyUnit(r.paid, r.unit)}</b>{r.unpaid ? <span className="block text-xs text-mute">+{qtyUnit(r.unpaid, r.unit)}</span> : null}</td>
                            <td className="py-2 text-right">{v?.stock_qty === null || v?.stock_qty === undefined ? "tidak dibatasi" : qtyUnit(v.stock_qty, r.unit)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <p className="mt-2 text-sm text-mute">Belum ada pesanan.</p>}
            </div>

            <div>
              <h3 className="font-semibold text-ocean-900">Produk</h3>
              {own.length ? (
                <ul className="mt-1 flex flex-wrap gap-2 text-sm">{own.map((p) => <li key={p.id}><Link href={`/admin/produk/${p.id}`} className="inline-block border border-line px-2.5 py-1 hover:border-ocean-900">{p.name}{p.is_active ? "" : " (nonaktif)"} · {p.variants.map((v) => `${v.label}: ${v.stock_qty === null ? "∞" : v.stock_qty}`).join(", ")}</Link></li>)}</ul>
              ) : <p className="text-sm text-mute">Belum ada produk.</p>}
              <p className="mt-1 text-xs text-mute">Untuk menambah produk: buat atau buka produk di <Link href="/admin/produk" className="underline">Produk dan stok</Link>, lalu pilih pre-order ini. Produk pre-order harus berharga tetap; isi stok untuk membatasi jumlahnya.</p>
            </div>

            <details>
              <summary className="cursor-pointer text-sm font-semibold text-gold-ink">Ubah pre-order</summary>
              <div className="mt-3"><CampaignEditor campaign={c} defaults={defaults} /></div>
            </details>
          </section>
        );
      })}
    </div>
  );
}
