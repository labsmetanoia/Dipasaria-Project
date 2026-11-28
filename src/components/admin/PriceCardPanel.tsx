"use client";
// Daily price card: pick sizes, household or restaurant prices, Status (9:16) or post (4:5); preview, save, share
// to WhatsApp from the phone, or print the same list as a PDF for restaurants.
import { useMemo, useState } from "react";
import { Download, Printer, Share2 } from "lucide-react";
import { CARD_SIZE, type CardFormat, type CardVersion } from "@/lib/priceCard";

export interface CardItem { variant_id: string; name: string; label: string; category_id: string; storage: string; business_only: boolean; bought: boolean }

export function PriceCardPanel({ items, categories }: { items: CardItem[]; categories: Array<{ id: string; name: string }> }) {
  const [version, setVersion] = useState<CardVersion>("retail");
  const [format, setFormat] = useState<CardFormat>("story");
  const [note, setNote] = useState("");
  // start with what was bought this morning; without purchases, the fresh seafood that is available
  const defaults = useMemo(() => {
    const bought = items.filter((i) => i.bought).map((i) => i.variant_id);
    return bought.length ? bought : items.filter((i) => i.storage === "chilled").slice(0, 10).map((i) => i.variant_id);
  }, [items]);
  const [picked, setPicked] = useState<string[]>(defaults);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const usable = items.filter((i) => version === "business" || !i.business_only);
  const ids = picked.filter((id) => usable.some((i) => i.variant_id === id));
  const qs = new URLSearchParams({ v: version, f: format, ids: ids.join(","), ...(note.trim() ? { note: note.trim() } : {}) }).toString();
  const src = `/admin/harga/kartu?${qs}`;
  const file = `harga-${version === "business" ? "grosir" : "hari-ini"}-${format}.png`;
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const share = async () => {
    setShareMsg(null);
    try {
      const blob = await (await fetch(src)).blob();
      const f = new File([blob], file, { type: "image/png" });
      if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: "Harga hari ini" });
      else setShareMsg("Perangkat ini tidak dapat membagikan gambar langsung. Unduh gambarnya, lalu kirim dari galeri.");
    } catch { /* the share sheet was closed */ }
  };
  const max = CARD_SIZE[format].lines;
  return (
    <div className="card p-5" data-price-card>
      <h2 className="text-lg text-ocean-900">Kartu harga</h2>
      <p className="text-xs text-mute">Gambar untuk Status WhatsApp, Instagram dan grup restoran, dengan harga yang sedang berlaku (simpan harga di atas dulu). Versi restoran memuat harga grosir: bagikan hanya ke grup restoran.</p>
      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setVersion("retail")} className={`chip ${version === "retail" ? "chip-on" : ""}`}>Rumah tangga</button>
            <button type="button" onClick={() => setVersion("business")} className={`chip ${version === "business" ? "chip-on" : ""}`}>Restoran (grosir)</button>
            <span className="w-3" />
            <button type="button" onClick={() => setFormat("story")} className={`chip ${format === "story" ? "chip-on" : ""}`}>Status 9:16</button>
            <button type="button" onClick={() => setFormat("post")} className={`chip ${format === "post" ? "chip-on" : ""}`}>Post 4:5</button>
          </div>
          <label className="block text-sm"><span className="label">Catatan di kartu (opsional)</span><input className="input" value={note} maxLength={90} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: Kakap merah besar hari ini, stok terbatas" /></label>
          <div>
            <p className="label">Produk di kartu ({ids.length} dipilih{ids.length > max - 3 ? "; yang tidak muat disebut “produk lain” di kartu" : ""})</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <button type="button" className="btn-ghost px-2 py-1" onClick={() => setPicked(defaults)}>Pilihan awal</button>
              <button type="button" className="btn-ghost px-2 py-1" onClick={() => setPicked([])}>Kosongkan</button>
            </div>
            <div className="mt-2 max-h-80 space-y-3 overflow-y-auto border border-line p-3">
              {categories.map((c) => {
                const list = usable.filter((i) => i.category_id === c.id);
                if (!list.length) return null;
                return (
                  <fieldset key={c.id}>
                    <legend className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-ink">{c.name}</legend>
                    <div className="mt-1 grid gap-1 sm:grid-cols-2">
                      {list.map((i) => <label key={i.variant_id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={picked.includes(i.variant_id)} onChange={() => toggle(i.variant_id)} className="accent-ocean-900" />{i.name} <span className="text-mute">{i.label}</span>{i.bought && <span className="text-[10px] font-bold uppercase text-success-600">pagi ini</span>}</label>)}
                    </div>
                  </fieldset>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={src} download={file} className="btn-primary text-sm"><Download className="h-4 w-4" /> Unduh gambar</a>
            <button type="button" onClick={share} className="btn-secondary text-sm"><Share2 className="h-4 w-4" /> Bagikan</button>
            <a href={`/admin/harga/cetak?${new URLSearchParams({ v: version, ids: ids.join(","), ...(note.trim() ? { note: note.trim() } : {}) }).toString()}`} className="btn-secondary text-sm"><Printer className="h-4 w-4" /> Daftar harga (PDF)</a>
          </div>
          {shareMsg && <p className="text-sm text-mute">{shareMsg}</p>}
        </div>
        <div>
          <p className="label">Pratinjau</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={src} src={src} alt="Pratinjau kartu harga" className="w-full border border-line bg-sand-50" style={{ aspectRatio: `${CARD_SIZE[format].width} / ${CARD_SIZE[format].height}` }} data-card-preview />
        </div>
      </div>
    </div>
  );
}
