"use client";
// Harga hari ini: this morning's cost per size (from Belanja subuh), current prices and their margin, and the prices
// that keep the target margins. Nothing changes until the owner saves; lowering a price is always a manual choice.
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wand2 } from "lucide-react";
import type { PriceRow } from "@/lib/dailyPrice";
import { marginPct, suggestPrice } from "@/lib/dailyPrice";
import { applyDailyPricesAction } from "@/actions/admin";
import { formatDate, rupiah } from "@/lib/format";
import { UNIT_LABEL } from "@/lib/config";

type Edit = { cost: string; price_retail: string; price_business: string };
type Filter = "check" | "bought" | "all";
const num = (s: string) => Number(String(s).replace(/\D/g, "")) || 0;
const pct = (m: number | null) => (m === null ? "—" : `${m.toFixed(1).replace(".", ",")}%`);

export function DailyPrices({ rows, categories, targetRetail, targetBusiness, today }: { rows: PriceRow[]; categories: Array<{ id: string; name: string }>; targetRetail: number; targetBusiness: number; today: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const bought = rows.some((r) => r.cost.source === "today");
  const [filter, setFilter] = useState<Filter>(bought ? "check" : "all");
  const [cat, setCat] = useState("");
  // the cost starts at this morning's (or the latest logged) cost; prices start at what the shop charges now
  const initial = useMemo(() => Object.fromEntries(rows.map((r) => [r.variant_id, { cost: String(r.cost.cost), price_retail: String(r.price_retail), price_business: String(r.price_business) }])) as Record<string, Edit>, [rows]);
  const [edits, setEdits] = useState<Record<string, Edit>>(initial);
  const set = (id: string, patch: Partial<Edit>) => { setMsg(null); setEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } })); };

  const live = (r: PriceRow) => {
    const e = edits[r.variant_id];
    const cost = num(e.cost), pr = num(e.price_retail), pb = num(e.price_business);
    return { cost, pr, pb, mr: r.business_only ? null : marginPct(pr, cost), mb: marginPct(pb, cost), sr: r.business_only ? 0 : suggestPrice(cost, targetRetail), sb: suggestPrice(cost, targetBusiness) };
  };
  const changed = rows.filter((r) => { const l = live(r); return l.cost !== r.stored_cost || l.pr !== r.price_retail || l.pb !== r.price_business; });
  const needsCheck = (r: PriceRow) => { const l = live(r); return r.cost.source === "today" || (l.mr !== null && l.mr < targetRetail) || (l.mb !== null && l.mb < targetBusiness); };
  const shown = rows.filter((r) => (!cat || r.category_id === cat) && (filter === "all" || (filter === "bought" ? r.cost.source === "today" : needsCheck(r))));
  const raiseAll = () => {
    for (const r of shown) {
      const l = live(r);
      const patch: Partial<Edit> = {};
      if (l.mr !== null && l.mr < targetRetail && l.sr > l.pr) patch.price_retail = String(l.sr);
      if (l.mb !== null && l.mb < targetBusiness && l.sb > l.pb) patch.price_business = String(l.sb);
      if (Object.keys(patch).length) set(r.variant_id, patch);
    }
  };
  const save = () => start(async () => {
    const r = await applyDailyPricesAction(changed.map((x) => { const l = live(x); return { variant_id: x.variant_id, cost: l.cost, price_retail: l.pr, price_business: l.pb }; }));
    if (!r.ok) { setMsg({ ok: false, text: r.error }); return; }
    setMsg({ ok: true, text: `${r.data} ukuran disimpan. Harga baru berlaku di toko sekarang.` });
    router.refresh();
  });

  return (
    <div className="card p-5" data-daily-prices>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg text-ocean-900">Modal, harga dan margin</h2>
          <p className="text-xs text-mute">Target margin: rumah tangga {targetRetail}%, grosir {targetBusiness}% (ubah di Pengaturan). Saran dibulatkan ke atas per Rp1.000.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {([["check", "Perlu dicek"], ["bought", "Dibeli pagi ini"], ["all", "Semua"]] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setFilter(k)} className={`chip ${filter === k ? "chip-on" : ""}`}>{l}</button>)}
          <select className="input w-auto py-1.5 text-sm" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Kategori"><option value="">Semua kategori</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </div>
      </div>
      {!bought && <p className="mt-3 bg-sand-50 px-3 py-2 text-sm">Belum ada pembelian tercatat untuk hari ini ({formatDate(today, "short")}). Catat pembelian di Belanja subuh, atau isi modal langsung di tabel ini.</p>}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead><tr className="border-b border-line text-left text-xs text-mute"><th className="py-2 pr-2">Produk</th><th className="py-2 pr-2">Modal per satuan</th><th className="py-2 pr-2">Harga rumah tangga</th><th className="py-2 pr-2">Harga grosir</th><th className="py-2" /></tr></thead>
          <tbody>
            {shown.map((r) => {
              const e = edits[r.variant_id], l = live(r), unit = UNIT_LABEL[r.unit] ?? r.unit;
              const lowR = l.mr !== null && l.mr < targetRetail, lowB = l.mb !== null && l.mb < targetBusiness;
              return (
                <tr key={r.variant_id} className="border-b border-line/60 align-top" data-price-row={r.variant_id}>
                  <td className="py-2 pr-2"><b>{r.product_name}</b> <span className="text-mute">{r.label}</span>{!r.available && <span className="ml-1 text-xs text-mute">(tidak tersedia)</span>}</td>
                  <td className="py-2 pr-2">
                    <input className="input w-28 py-1.5" inputMode="numeric" aria-label={`Modal ${r.product_name} ${r.label}`} value={e.cost} onChange={(ev) => set(r.variant_id, { cost: ev.target.value })} />
                    <span className="mt-0.5 block text-[11px] text-mute">{r.cost.source === "today" ? <b className="text-success-600">pagi ini</b> : r.cost.source === "latest" ? `dibeli ${formatDate(r.cost.date!, "short")}` : "modal tersimpan"}{r.cost.source !== "stored" && r.stored_cost !== r.cost.cost ? ` · sebelumnya ${rupiah(r.stored_cost)}` : ""}{r.cost.source !== "stored" ? ` · rata-rata 7 hari ${rupiah(r.cost.recent)}` : ""}/{unit}</span>
                  </td>
                  <td className="py-2 pr-2">
                    {r.business_only ? <span className="text-xs text-mute">khusus bisnis</span> : (
                      <>
                        <input className="input w-28 py-1.5" inputMode="numeric" aria-label={`Harga rumah tangga ${r.product_name} ${r.label}`} value={e.price_retail} onChange={(ev) => set(r.variant_id, { price_retail: ev.target.value })} />
                        <span className={`mt-0.5 block text-[11px] ${lowR ? "font-bold text-gold-ink" : "text-mute"}`}>margin {pct(l.mr)}{l.sr && l.sr !== l.pr ? <> · <button type="button" className="underline" onClick={() => set(r.variant_id, { price_retail: String(l.sr) })}>saran {rupiah(l.sr)}</button></> : null}</span>
                      </>
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    <input className="input w-28 py-1.5" inputMode="numeric" aria-label={`Harga grosir ${r.product_name} ${r.label}`} value={e.price_business} onChange={(ev) => set(r.variant_id, { price_business: ev.target.value })} />
                    <span className={`mt-0.5 block text-[11px] ${lowB ? "font-bold text-gold-ink" : "text-mute"}`}>margin {pct(l.mb)}{l.sb && l.sb !== l.pb ? <> · <button type="button" className="underline" onClick={() => set(r.variant_id, { price_business: String(l.sb) })}>saran {rupiah(l.sb)}</button></> : null}</span>
                  </td>
                  <td className="py-2 text-right">{(l.sr !== l.pr && !r.business_only) || l.sb !== l.pb ? <button type="button" onClick={() => set(r.variant_id, { ...(r.business_only ? {} : { price_retail: String(l.sr) }), price_business: String(l.sb) })} className="btn-ghost px-2 py-1 text-xs">Pakai saran</button> : null}</td>
                </tr>
              );
            })}
            {shown.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-sm text-mute">Tidak ada yang perlu dicek. Semua harga di atas target margin.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={raiseAll} className="btn-secondary text-sm"><Wand2 className="h-4 w-4" /> Naikkan yang di bawah target ke harga saran</button>
        <button type="button" onClick={save} disabled={pending || changed.length === 0} className="btn-primary text-sm">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : changed.length ? `Simpan ${changed.length} perubahan` : "Tidak ada perubahan"}</button>
        {changed.length > 0 && <button type="button" onClick={() => setEdits(initial)} className="btn-ghost text-sm">Batalkan perubahan</button>}
        {msg && <p className={`text-sm ${msg.ok ? "text-success-600" : "text-gold-ink"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}
      </div>
      <p className="mt-2 text-xs text-mute">Menyimpan juga memperbarui modal tersimpan, sehingga margin di laporan dan penawaran memakai modal terbaru. Untuk produk dengan beberapa ukuran, modal pagi ini dibagi menurut perbandingan modal tersimpan tiap ukuran. Harga lama pada pesanan yang sudah dibuat tidak berubah.</p>
    </div>
  );
}
