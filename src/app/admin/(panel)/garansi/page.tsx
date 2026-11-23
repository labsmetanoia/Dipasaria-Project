import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { addDays, formatDateTime, nowJakarta, rupiah } from "@/lib/format";
import { ClaimDecision } from "@/components/admin/ClaimDecision";
import type { Claim, Order } from "@/lib/types";

export const metadata = { title: "Garansi" };

const REASON: Record<Claim["reason"], string> = { not_fresh: "Kurang segar / berbau", short_weight: "Berat atau jumlah kurang", wrong_item: "Produk atau ukuran salah", damaged: "Rusak atau bocor", missing: "Tidak ada dalam kiriman", other: "Lainnya" };
const STATUS: Record<Claim["status"], string> = { open: "Menunggu keputusan", replace: "Diganti", refund: "Dana dikembalikan", declined: "Ditolak" };

export default async function ClaimsPage() {
  await requireAdmin();
  const repo = await getRepo();
  const today = nowJakarta().date;
  const [claims, sales] = await Promise.all([repo.listClaims({ limit: 200 }), repo.salesReport(addDays(today, -30), today)]);
  const orders = new Map<string, Order>();
  for (const id of [...new Set(claims.map((c) => c.order_id))]) { const o = await repo.getOrder(id); if (o) orders.set(id, o); }
  const recent = claims.filter((c) => c.created_at.slice(0, 10) >= addDays(today, -30));
  const refunds = recent.reduce((s, c) => s + (c.refund_amount ?? 0), 0);
  const replaced = recent.filter((c) => c.status === "replace").reduce((s, c) => s + (orders.get(c.order_id)?.items.filter((i) => c.items.some((x) => x.item_id === i.id)).reduce((t, i) => t + (i.line_total_final ?? i.line_total_est), 0) ?? 0), 0);
  const sales30 = sales.reduce((s, r) => s + r.sales, 0);
  const cost = refunds + replaced;
  const open = claims.filter((c) => c.status === "open");
  const done = claims.filter((c) => c.status !== "open").slice(0, 30);
  const card = (c: Claim) => {
    const o = orders.get(c.order_id);
    const lines = o?.items.filter((i) => c.items.some((x) => x.item_id === i.id)) ?? [];
    const value = lines.reduce((t, i) => t + (i.line_total_final ?? i.line_total_est), 0);
    return (
      <div key={c.id} className="card p-4 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><p className="font-semibold">{o ? <Link href={`/admin/pesanan/${o.id}`} className="text-ocean-900">{o.code}</Link> : c.order_id} · {o?.customer_name}</p><p className="text-xs text-mute">Dilaporkan {formatDateTime(c.created_at)} WIB{o?.delivered_at ? ` · diterima ${formatDateTime(o.delivered_at)} WIB` : ""}</p></div>
          <span className={`px-2 py-0.5 text-[11px] font-semibold ${c.status === "open" ? "bg-coral-50 text-gold-ink" : "bg-sand-100 text-ink/70"}`}>{STATUS[c.status]}</span>
        </div>
        <p className="mt-2"><b>{REASON[c.reason]}</b>{c.note ? ` · “${c.note}”` : ""}</p>
        <p className="text-xs text-mute">{lines.map((i) => `${i.product_name} ${i.variant_label}`).join(" · ")} · nilai {rupiah(value)}</p>
        {c.photos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {c.photos.map((p, i) => <details key={i}><summary className="list-none"><img src={p} alt={`Foto ${i + 1} laporan ${o?.code ?? ""}`} className="h-24 w-24 cursor-zoom-in border border-line object-cover" /></summary>{ }<img src={p} alt="" className="mt-2 max-h-[70vh] max-w-full border border-line" /></details>)}
          </div>
        )}
        {c.status === "open" ? <ClaimDecision id={c.id} suggestedRefund={value} /> : <p className="mt-2 text-xs text-mute">{c.refund_amount ? `${rupiah(c.refund_amount)} · ` : ""}{c.resolution_note}</p>}
      </div>
    );
  };
  return (
    <div className="space-y-5">
      <div><p className="eyebrow">Garansi kesegaran</p><h1 className="text-2xl text-ocean-900">Laporan pelanggan</h1><p className="text-sm text-mute">Pelanggan melapor dengan foto dalam 2 jam setelah pesanan diterima. Keputusan Anda dikirim ke pelanggan lewat WhatsApp.</p></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card p-4"><p className="text-xs text-mute">Menunggu keputusan</p><p className="text-2xl font-bold">{open.length}</p></div>
        <div className="card p-4"><p className="text-xs text-mute">Laporan 30 hari</p><p className="text-2xl font-bold">{recent.length}</p></div>
        <div className="card p-4"><p className="text-xs text-mute">Biaya garansi 30 hari</p><p className="text-2xl font-bold">{rupiah(cost)}</p><p className="text-[11px] text-mute">dana kembali + nilai barang diganti</p></div>
        <div className="card p-4"><p className="text-xs text-mute">Terhadap penjualan</p><p className={`text-2xl font-bold ${sales30 && cost / sales30 > 0.015 ? "text-gold-ink" : ""}`}>{sales30 ? ((cost / sales30) * 100).toFixed(2).replace(".", ",") : "0"}%</p><p className="text-[11px] text-mute">anggaran 1,5%</p></div>
      </div>
      <section className="space-y-3"><h2 className="text-ocean-900">Menunggu keputusan</h2>{open.length ? open.map(card) : <p className="text-sm text-mute">Tidak ada laporan yang menunggu.</p>}</section>
      {done.length > 0 && <section className="space-y-3"><h2 className="text-ocean-900">Sudah diputuskan</h2>{done.map(card)}</section>}
    </div>
  );
}
