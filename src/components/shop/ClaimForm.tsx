"use client";
// Freshness guarantee: report a problem with photos within the window after delivery.
// Photos are shrunk in the browser (max 1280 px, JPEG) so a report uploads quickly on a phone connection.
import { useState, useTransition } from "react";
import { shrinkImage as shrink } from "@/lib/shrinkImage";
import { Camera, CheckCircle2, Loader2, ShieldCheck, X } from "lucide-react";
import type { ClaimReason, Order } from "@/lib/types";
import { createClaimAction } from "@/actions/care";
import { formatDateTime } from "@/lib/format";
import { useT } from "@/lib/i18n/client";

const REASONS: Record<ClaimReason, { id: string; en: string }> = {
  not_fresh: { id: "Kurang segar / berbau", en: "Not fresh / smells" },
  short_weight: { id: "Berat atau jumlah kurang", en: "Short weight or count" },
  wrong_item: { id: "Produk atau ukuran salah", en: "Wrong item or size" },
  damaged: { id: "Rusak atau bocor", en: "Damaged or leaking" },
  missing: { id: "Tidak ada dalam kiriman", en: "Missing from the delivery" },
  other: { id: "Lainnya", en: "Other" },
};

export function ClaimForm({ order, until }: { order: Order; until: string }) {
  const { locale } = useT();
  const en = locale === "en";
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [reason, setReason] = useState<ClaimReason>("not_fresh");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const [reading, setReading] = useState(false);

  if (done) return <div className="card flex items-start gap-3 bg-success-50 p-5 text-success-600" role="status"><CheckCircle2 className="mt-0.5 h-5 w-5 flex-none" /><p className="text-sm font-semibold">{en ? "Report received. We will reply on WhatsApp, usually within the hour." : "Laporan diterima. Kami membalas lewat WhatsApp, biasanya dalam satu jam."}</p></div>;
  if (!open) {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-tide-600" /><div><p className="font-bold text-ocean-950">{en ? "Freshness guarantee" : "Garansi kesegaran"}</p><p className="text-sm text-mute">{en ? `Something not right? Report it with a photo until ${formatDateTime(until, locale)} WIB and we replace it or refund.` : `Ada yang kurang sesuai? Laporkan dengan foto sampai ${formatDateTime(until, locale)} WIB, kami ganti atau kembalikan dananya.`}</p></div></div>
        <button onClick={() => setOpen(true)} className="btn-secondary">{en ? "Report a problem" : "Laporkan masalah"}</button>
      </div>
    );
  }
  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    setReading(true);
    try {
      const next = [...photos];
      for (const f of Array.from(files)) { if (next.length >= 3) break; if (f.type.startsWith("image/")) next.push(await shrink(f)); }
      setPhotos(next);
    } catch { setErr(en ? "This photo could not be read. Try another one." : "Foto tidak dapat dibaca. Coba foto lain."); }
    setReading(false);
  };
  const submit = () => start(async () => {
    setErr(null);
    const r = await createClaimAction(order.code, order.phone, { item_ids: items, reason, note, photos });
    if (r.ok) setDone(true); else setErr(r.error);
  });
  return (
    <div className="card space-y-4 p-5">
      <div className="flex items-center justify-between"><h2 className="font-bold text-ocean-950">{en ? "Report a problem" : "Laporkan masalah"}</h2><button onClick={() => setOpen(false)} aria-label={en ? "Close" : "Tutup"} className="p-1 text-mute"><X className="h-4 w-4" /></button></div>
      <fieldset>
        <legend className="text-sm font-semibold">{en ? "Which items?" : "Produk yang mana?"}</legend>
        <div className="mt-2 space-y-1.5">
          {order.items.map((i) => (
            <label key={i.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-ocean-950" checked={items.includes(i.id)} onChange={(e) => setItems(e.target.checked ? [...items, i.id] : items.filter((x) => x !== i.id))} />{i.product_name} <span className="text-mute">{i.variant_label}</span></label>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm font-semibold">{en ? "What happened?" : "Apa masalahnya?"}
        <select className="input mt-1 font-normal" value={reason} onChange={(e) => setReason(e.target.value as ClaimReason)}>{(Object.keys(REASONS) as ClaimReason[]).map((k) => <option key={k} value={k}>{REASONS[k][en ? "en" : "id"]}</option>)}</select>
      </label>
      <label className="block text-sm font-semibold">{en ? "Details (optional)" : "Keterangan (opsional)"}<textarea className="input mt-1 font-normal" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <div>
        <p className="text-sm font-semibold">{en ? "Photos (up to 3)" : "Foto (maksimal 3)"}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {photos.map((p, i) => <div key={i} className="relative"><img src={p} alt={`${en ? "Photo" : "Foto"} ${i + 1}`} className="h-20 w-20 border border-line object-cover" /><button type="button" onClick={() => setPhotos(photos.filter((_, j) => j !== i))} aria-label={en ? "Remove photo" : "Hapus foto"} className="absolute -right-2 -top-2 rounded-full bg-ink p-0.5 text-white"><X className="h-3 w-3" /></button></div>)}
          {photos.length < 3 && <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-line text-xs text-mute">{reading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}{en ? "Add" : "Tambah"}<input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addPhotos(e.target.files)} aria-label={en ? "Add photos" : "Tambah foto"} /></label>}
        </div>
      </div>
      {err && <p className="text-sm text-gold-ink" role="alert">{err}</p>}
      <button disabled={pending || reading || !items.length || !photos.length} onClick={submit} className="btn-primary w-full sm:w-auto">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : en ? "Send report" : "Kirim laporan"}</button>
      {(!items.length || !photos.length) && <p className="text-xs text-mute">{en ? "Choose at least one item and add a photo." : "Pilih minimal satu produk dan tambahkan foto."}</p>}
    </div>
  );
}
