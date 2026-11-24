// Two sections of the reports page about customers rather than orders: what they thought (ratings after delivery)
// and whether they come back (retention), with the list of customers who have gone quiet.
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import type { Product, Rating } from "@/lib/types";
import type { Retention } from "@/lib/retention";
import { formatDate, formatDateTime, rupiah, waLink } from "@/lib/format";
import { Stars } from "@/components/shop/RatingForm";

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");
const one = (n: number) => n.toFixed(1).replace(".", ",");

export function RatingsReport({ ratings, products, summary }: { ratings: Rating[]; products: Product[]; summary: Record<string, { average: number; count: number }> }) {
  const n = ratings.length;
  const avg = n ? ratings.reduce((s, r) => s + r.stars, 0) / n : 0;
  const dist = [5, 4, 3, 2, 1].map((k) => [k, ratings.filter((r) => r.stars === k).length] as const);
  const low = ratings.filter((r) => r.stars <= 3).slice(0, 8);
  const comments = ratings.filter((r) => r.stars >= 4 && r.comment).slice(0, 4);
  const weakest = Object.entries(summary).filter(([, s]) => s.count >= 3).sort((a, b) => a[1].average - b[1].average).slice(0, 5)
    .map(([id, s]) => ({ name: products.find((p) => p.id === id)?.name ?? id, ...s }));
  return (
    <section className="card p-5 text-sm" aria-labelledby="penilaian" id="penilaian-pelanggan">
      <h2 id="penilaian" className="text-ocean-900">Penilaian pelanggan</h2>
      <p className="mt-1 text-xs text-mute">Diberikan pelanggan dari pesan “pesanan sudah diterima”, satu kali per pesanan, dalam 14 hari. Hanya pembeli pesanan itu yang dapat menilai.</p>
      {n === 0 ? <p className="mt-3 text-mute">Belum ada penilaian pada periode ini.</p> : (
        <div className="mt-4 grid gap-5 md:grid-cols-[14rem_1fr]">
          <div>
            <p className="flex items-center gap-2"><span className="text-3xl font-bold">{one(avg)}</span><Stars value={avg} size="h-5 w-5" /></p>
            <p className="text-xs text-mute">{n} penilaian pada periode ini</p>
            <ul className="mt-3 space-y-1">
              {dist.map(([k, c]) => <li key={k} className="grid grid-cols-[1.5rem_1fr_2rem] items-center gap-2 text-xs"><span>{k}★</span><span className="h-2 bg-sand-100" aria-hidden><span className={`block h-2 ${k <= 2 ? "bg-coral-500" : "bg-ocean-950"}`} style={{ width: `${(c / n) * 100}%` }} /></span><span className="text-right tabular-nums">{c}</span></li>)}
            </ul>
          </div>
          <div className="space-y-4">
            {low.length > 0 && (
              <div>
                <p className="font-semibold">Perlu ditindaklanjuti (3 bintang ke bawah)</p>
                <ul className="mt-2 divide-y divide-line border-y border-line">
                  {low.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
                      <div className="min-w-0"><p><Stars value={r.stars} /> <Link href={`/admin/pesanan/${r.order_id}`} className="ml-1 font-semibold text-ocean-900">{r.order_code ?? r.order_id}</Link> · {r.customer_name} <span className="text-xs text-mute">· {formatDateTime(r.created_at)}</span></p>{r.comment && <p className="text-mute">“{r.comment}”</p>}
                        {r.items.filter((i) => i.stars <= 2).length > 0 && <p className="text-xs text-gold-ink">Nilai rendah: {r.items.filter((i) => i.stars <= 2).map((i) => products.find((p) => p.id === i.product_id)?.name ?? i.product_id).join(", ")}</p>}</div>
                      {r.phone && <a className="inline-flex items-center gap-1 text-xs font-semibold text-gold-ink" target="_blank" rel="noreferrer" href={waLink(r.phone, `Halo ${r.customer_name ?? ""}, terima kasih sudah menilai pesanan ${r.order_code ?? ""}. Mohon maaf pesanan itu belum sesuai harapan. Boleh kami tahu apa yang perlu kami perbaiki?`)}><MessageCircle className="h-3.5 w-3.5" />Hubungi via WA</a>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {weakest.length > 0 && <p className="text-xs">Produk dengan nilai terendah (minimal 3 penilaian): {weakest.map((w) => `${w.name} ${one(w.average)} (${w.count})`).join(" · ")}</p>}
            {comments.length > 0 && <div><p className="font-semibold">Komentar terbaru</p><ul className="mt-1 space-y-1 text-mute">{comments.map((r) => <li key={r.id}>“{r.comment}” <span className="text-xs">· {r.customer_name}</span></li>)}</ul></div>}
          </div>
        </div>
      )}
    </section>
  );
}

export function RetentionReport({ data, days, storeName, siteUrl, mayPromote }: {
  data: Retention; days: number; storeName: string; siteUrl: string;
  /** phone numbers of households that agreed to receive offers; restaurants are contacted as account customers */
  mayPromote: string[];
}) {
  const r = data.bySegment.retail, b = data.bySegment.business;
  const ok = new Set(mayPromote);
  const gap = (g: number | null) => (g === null ? "—" : `${g} hari`);
  return (
    <section className="card p-5 text-sm" aria-labelledby="kembali">
      <h2 id="kembali" className="text-ocean-900">Pelanggan kembali</h2>
      <p className="mt-1 text-xs text-mute">Dari pesanan {days} hari terakhir (tidak mengikuti rentang tanggal di atas). Rumah tangga dikenali dari nomor WhatsApp, restoran dari akunnya.</p>
      {data.customers === 0 ? <p className="mt-3 text-mute">Belum ada pesanan.</p> : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="border border-line p-3"><p className="text-xs text-mute">Pelanggan</p><p className="text-2xl font-bold">{data.customers}</p><p className="text-[11px] text-mute">{r.customers} rumah tangga · {b.customers} restoran</p></div>
            <div className="border border-line p-3"><p className="text-xs text-mute">Pesan lagi dalam 30 hari</p><p className="text-2xl font-bold">{pct(data.returned30, data.eligible30)}</p><p className="text-[11px] text-mute">{data.returned30} dari {data.eligible30} pelanggan yang pesanan pertamanya sudah lewat 30 hari</p></div>
            <div className="border border-line p-3"><p className="text-xs text-mute">Jarak antarpesanan (median)</p><p className="text-2xl font-bold">{gap(r.medianGap)}</p><p className="text-[11px] text-mute">rumah tangga · restoran {gap(b.medianGap)}</p></div>
            <div className="border border-line p-3"><p className="text-xs text-mute">Nilai pesanan rata-rata</p><p className="text-2xl font-bold">{r.orders ? rupiah(r.aov) : "—"}</p><p className="text-[11px] text-mute">rumah tangga · restoran {b.orders ? rupiah(b.aov) : "—"}</p></div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[460px] text-xs">
              <thead><tr className="border-b border-line text-left text-mute"><th className="py-1.5 pr-2 font-semibold">Pesanan pertama</th><th className="py-1.5 pr-2 text-right font-semibold">Pelanggan</th><th className="py-1.5 pr-2 text-right font-semibold">Pesan lagi</th><th className="py-1.5 pr-2 text-right font-semibold">Dalam 30 hari</th><th className="py-1.5 text-right font-semibold">Belanja per pelanggan</th></tr></thead>
              <tbody>
                {data.cohorts.map((c) => (
                  <tr key={c.month} className="border-b border-line"><td className="py-1.5 pr-2">{formatDate(`${c.month}-01`, "long").split(" ").slice(2).join(" ")}</td><td className="py-1.5 pr-2 text-right tabular-nums">{c.customers}</td><td className="py-1.5 pr-2 text-right tabular-nums">{c.returned} ({pct(c.returned, c.customers)})</td><td className="py-1.5 pr-2 text-right tabular-nums">{c.returned30} ({pct(c.returned30, c.customers)})</td><td className="py-1.5 text-right tabular-nums">{rupiah(Math.round(c.revenue / c.customers))}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="mt-5 text-sm font-bold">Sudah lama tidak memesan</h3>
          <p className="text-xs text-mute">Rumah tangga lebih dari 21 hari, restoran lebih dari 7 hari, atau dua kali jarak pesanan mereka yang biasa. Urut dari belanja terbesar.</p>
          {data.quiet.length === 0 ? <p className="mt-2 text-mute">Tidak ada: semua pelanggan masih dalam jarak pesanan mereka yang biasa.</p> : (
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {data.quiet.slice(0, 15).map((c) => {
                const allowed = c.segment === "business" || ok.has(c.phone);
                return (
                  <li key={c.key} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div className="min-w-0"><p><b>{c.name}</b> <span className="text-xs text-mute">· {c.segment === "business" ? "restoran" : "rumah tangga"} · {c.orders} pesanan · {rupiah(c.total)}</span></p><p className="text-xs text-mute">Terakhir {formatDate(c.last, "short")} ({c.daysSince} hari lalu){c.usualGap ? ` · biasanya tiap ${c.usualGap} hari` : ""}</p></div>
                    {allowed
                      ? <a className="inline-flex items-center gap-1 text-xs font-semibold text-gold-ink" target="_blank" rel="noreferrer" href={waLink(c.phone, `Halo ${c.name}, sudah ${c.daysSince} hari sejak pesanan terakhir Anda di ${storeName}. Ada yang bisa kami siapkan minggu ini? Tangkapan terbaru: ${siteUrl}/belanja`)}><MessageCircle className="h-3.5 w-3.5" />Sapa via WA</a>
                      : <span className="text-[11px] text-mute">Belum setuju menerima penawaran</span>}
                  </li>
                );
              })}
            </ul>
          )}
          {data.quiet.length > 15 && <p className="mt-2 text-xs text-mute">dan {data.quiet.length - 15} pelanggan lain.</p>}
        </>
      )}
    </section>
  );
}
