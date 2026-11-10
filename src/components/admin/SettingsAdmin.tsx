"use client";
import { useState, useTransition } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import type { DeliveryArea, DeliverySlot, Settings } from "@/lib/types";
import { updateSettingsAction, upsertAreaAction, upsertSlotAction } from "@/actions/admin";
import { Field } from "@/components/ui";

export function SettingsAdmin({ settings: initial, areas: a0, slots: s0 }: { settings: Settings; areas: DeliveryArea[]; slots: DeliverySlot[] }) {
  const [s, setS] = useState(initial);
  const [areas, setAreas] = useState(a0);
  const [slots, setSlots] = useState(s0);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS({ ...s, [k]: v });
  const save = () => start(async () => {
    setErr(null);
    const r = await updateSettingsAction(s);
    if (!r.ok) { setErr(r.error); return; }
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  });
  const saveArea = (a: DeliveryArea) => start(async () => { const r = await upsertAreaAction(a); if (r.ok) setAreas((xs) => xs.map((x) => (x.id === a.id ? r.data : x))); });
  const saveSlot = (sl: DeliverySlot) => start(async () => { const r = await upsertSlotAction(sl); if (r.ok) setSlots((xs) => xs.map((x) => (x.id === sl.id ? r.data : x))); });
  const num = (v: string) => Number(v.replace(/[^\d.]/g, "")) || 0;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="card space-y-4 p-5">
        <h2 className="text-ocean-900">Toko & pembayaran</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nama toko"><input className="input" value={s.store_name} onChange={(e) => set("store_name", e.target.value)} /></Field>
          <Field label="Nomor WhatsApp bisnis" hint="Format 62…"><input className="input" value={s.whatsapp_number} onChange={(e) => set("whatsapp_number", e.target.value)} /></Field>
          <Field label="Bank"><input className="input" value={s.bank_name} onChange={(e) => set("bank_name", e.target.value)} /></Field>
          <Field label="Nomor rekening"><input className="input" value={s.bank_account} onChange={(e) => set("bank_account", e.target.value)} /></Field>
          <Field label="Atas nama"><input className="input" value={s.bank_holder} onChange={(e) => set("bank_holder", e.target.value)} /></Field>
          <Field label="URL gambar QRIS statis" hint="Unggah gambar QRIS dari bank ke Supabase Storage atau layanan penyimpanan gambar, lalu tempelkan tautannya di sini."><input className="input" value={s.qris_image_url ?? ""} onChange={(e) => set("qris_image_url", e.target.value || null)} /></Field>
          <Field label="Instagram"><input className="input" value={s.instagram} onChange={(e) => set("instagram", e.target.value)} /></Field>
          <Field label="Alamat singkat"><input className="input" value={s.address_line} onChange={(e) => set("address_line", e.target.value)} /></Field>
        </div>
        <Field label="Pengumuman di toko (opsional)"><input className="input" value={s.announcement ?? ""} onChange={(e) => set("announcement", e.target.value || null)} placeholder="Misal: Libur Lebaran 30 Mar–2 Apr, pesanan dibuka lagi 3 Apr." /></Field>
      </div>
      <div className="card space-y-4 p-5">
        <h2 className="text-ocean-900">Aturan pesanan</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Batas pemesanan (WIB)"><input className="input" value={s.cutoff_time} onChange={(e) => set("cutoff_time", e.target.value)} placeholder="20:00" /></Field>
          <Field label="Maks. hari ke depan"><input className="input" type="number" value={s.max_days_ahead} onChange={(e) => set("max_days_ahead", Number(e.target.value))} /></Field>
          <Field label="Min. pesanan rumah tangga"><input className="input" value={s.min_order_retail} onChange={(e) => set("min_order_retail", num(e.target.value))} /></Field>
          <Field label="Min. pesanan bisnis"><input className="input" value={s.min_order_business} onChange={(e) => set("min_order_business", num(e.target.value))} /></Field>
          <Field label="Gratis ongkos kirim rumah tangga mulai"><input className="input" value={s.free_delivery_retail} onChange={(e) => set("free_delivery_retail", num(e.target.value))} /></Field>
          <Field label="Gratis ongkos kirim bisnis mulai"><input className="input" value={s.free_delivery_business} onChange={(e) => set("free_delivery_business", num(e.target.value))} /></Field>
          <Field label="Buffer beli ikan segar (%)" hint="Rencana bisnis: mulai 5%, sesuaikan dengan data susut Gate A."><input className="input" type="number" value={s.catch_weight_buffer_pct} onChange={(e) => set("catch_weight_buffer_pct", Number(e.target.value))} /></Field>
        </div>
        {err && <p className="text-sm text-gold-ink">{err}</p>}
        <button onClick={save} disabled={pending} className="btn-primary">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <><Check className="h-4 w-4" /> Tersimpan</> : "Simpan pengaturan"}</button>
      </div>

      <div className="card p-5">
        <h2 className="text-ocean-900">Area pengiriman</h2>
        <p className="text-xs text-mute">Tiga sampai lima wilayah dengan ongkos kirim tetap lebih mudah dipahami pelanggan daripada tarif per km.</p>
        <ul className="mt-3 space-y-2">
          {areas.map((a) => (
            <li key={a.id} className="flex items-center gap-2 text-sm">
              <input className="input py-1.5" value={a.name} onChange={(e) => setAreas(areas.map((x) => (x.id === a.id ? { ...x, name: e.target.value } : x)))} onBlur={() => saveArea(a)} />
              <input className="input w-28 py-1.5 text-right" value={a.fee} onChange={(e) => setAreas(areas.map((x) => (x.id === a.id ? { ...x, fee: num(e.target.value) } : x)))} onBlur={() => saveArea(a)} />
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={a.is_active} onChange={(e) => { const na = { ...a, is_active: e.target.checked }; setAreas(areas.map((x) => (x.id === a.id ? na : x))); saveArea(na); }} /> aktif</label>
            </li>
          ))}
        </ul>
        <button onClick={() => { const a: DeliveryArea = { id: `a_${Date.now().toString(36)}`, name: "Wilayah baru", fee: 25000, is_active: false, sort: areas.length + 1 }; setAreas([...areas, a]); saveArea(a); }} className="btn-secondary mt-3 text-sm"><Plus className="h-4 w-4" /> Tambah wilayah</button>
      </div>
      <div className="card p-5">
        <h2 className="text-ocean-900">Slot pengiriman</h2>
        <p className="text-xs text-mute">Kapasitas = jumlah drop maksimum yang bisa diantar satu kendaraan dalam slot itu.</p>
        <ul className="mt-3 space-y-2">
          {slots.map((sl) => (
            <li key={sl.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 text-sm">
              <input className="input py-1.5" value={sl.label} onChange={(e) => setSlots(slots.map((x) => (x.id === sl.id ? { ...x, label: e.target.value } : x)))} onBlur={() => saveSlot(sl)} />
              <input className="input w-20 py-1.5" value={sl.start_time} onChange={(e) => setSlots(slots.map((x) => (x.id === sl.id ? { ...x, start_time: e.target.value } : x)))} onBlur={() => saveSlot(sl)} />
              <input className="input w-20 py-1.5" value={sl.end_time} onChange={(e) => setSlots(slots.map((x) => (x.id === sl.id ? { ...x, end_time: e.target.value } : x)))} onBlur={() => saveSlot(sl)} />
              <select className="input w-auto py-1.5 text-xs" value={sl.segment} onChange={(e) => { const ns = { ...sl, segment: e.target.value as DeliverySlot["segment"] }; setSlots(slots.map((x) => (x.id === sl.id ? ns : x))); saveSlot(ns); }}><option value="all">Semua</option><option value="retail">Rumah tangga</option><option value="business">Bisnis</option></select>
              <input className="input w-16 py-1.5 text-right" type="number" value={sl.capacity} onChange={(e) => setSlots(slots.map((x) => (x.id === sl.id ? { ...x, capacity: Number(e.target.value) } : x)))} onBlur={() => saveSlot(sl)} />
            </li>
          ))}
        </ul>
        <button onClick={() => { const sl: DeliverySlot = { id: `s_${Date.now().toString(36)}`, label: "Jam pengiriman baru", start_time: "13:00", end_time: "15:00", segment: "all", capacity: 10, is_active: true, sort: slots.length + 1 }; setSlots([...slots, sl]); saveSlot(sl); }} className="btn-secondary mt-3 text-sm"><Plus className="h-4 w-4" /> Tambah jam pengiriman</button>
      </div>
    </div>
  );
}
