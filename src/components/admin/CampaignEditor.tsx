"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { Campaign } from "@/lib/types";
import { saveCampaignAction } from "@/actions/admin";
import { Field } from "@/components/ui";
import { slugify } from "@/lib/format";

type Draft = Omit<Campaign, "id" | "created_at"> & { id?: string };

/** Create or edit a seasonal pre-order. Dates: opens → order-by (closes at the shop cut-off) → delivery days. */
export function CampaignEditor({ campaign, defaults }: { campaign: Campaign | null; defaults: Pick<Campaign, "opens_on" | "order_by" | "deliver_from" | "deliver_to"> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [c, setC] = useState<Draft>(campaign
    ? { ...campaign }
    : { slug: "", name: "", name_en: null, intro: "", intro_en: null, image_url: null, is_active: true, ...defaults });
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setSaved(false); setC({ ...c, [k]: v }); };
  const save = () => start(async () => {
    setErr(null);
    const r = await saveCampaignAction({ ...c, slug: c.slug || slugify(c.name) });
    if (!r.ok) { setErr(r.error); return; }
    setSaved(true);
    if (!campaign) setC({ slug: "", name: "", name_en: null, intro: "", intro_en: null, image_url: null, is_active: true, ...defaults });
    router.refresh();
  });
  const k = campaign?.id ?? "new";
  return (
    <div className="space-y-4" data-campaign-editor={k}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama (ID)"><input className="input" name="name" value={c.name} onChange={(e) => set("name", e.target.value)} placeholder="Imlek 2027" maxLength={80} /></Field>
        <Field label="Name (EN)"><input className="input" value={c.name_en ?? ""} onChange={(e) => set("name_en", e.target.value || null)} placeholder="Chinese New Year 2027" maxLength={80} /></Field>
        <Field label="Alamat halaman" hint={`/belanja/musim/${c.slug || slugify(c.name) || "…"}`}><input className="input" name="slug" value={c.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} placeholder={slugify(c.name) || "imlek-2027"} /></Field>
        <Field label="URL foto (opsional)" hint="Kosongkan untuk memakai foto produk pertama"><input className="input" value={c.image_url ?? ""} onChange={(e) => set("image_url", e.target.value || null)} placeholder="/images/… atau https://…" /></Field>
      </div>
      <Field label="Pengantar (ID)"><textarea className="input" rows={2} value={c.intro} onChange={(e) => set("intro", e.target.value)} maxLength={1000} placeholder="Ikan utuh untuk makan malam Imlek, dibeli sesuai pesanan di lelang subuh…" /></Field>
      <Field label="Intro (EN)"><textarea className="input" rows={2} value={c.intro_en ?? ""} onChange={(e) => set("intro_en", e.target.value || null)} maxLength={1000} /></Field>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Dibuka"><input className="input" type="date" name="opens_on" value={c.opens_on} onChange={(e) => set("opens_on", e.target.value)} /></Field>
        <Field label="Pesan paling lambat" hint="Ditutup pada jam batas pesan"><input className="input" type="date" name="order_by" value={c.order_by} onChange={(e) => set("order_by", e.target.value)} /></Field>
        <Field label="Kirim mulai"><input className="input" type="date" name="deliver_from" value={c.deliver_from} onChange={(e) => set("deliver_from", e.target.value)} /></Field>
        <Field label="Kirim sampai"><input className="input" type="date" name="deliver_to" value={c.deliver_to} onChange={(e) => set("deliver_to", e.target.value)} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.is_active} onChange={(e) => set("is_active", e.target.checked)} className="accent-ocean-900" /> Tampilkan di toko (halaman pre-order dan spanduk di halaman belanja)</label>
      {err && <p className="text-sm text-gold-ink" role="alert">{err}</p>}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={pending || !c.name.trim()} className="btn-primary text-sm">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : campaign ? "Simpan pre-order" : "Buat pre-order"}</button>
        {saved && <span className="text-sm text-success-600">Tersimpan.</span>}
      </div>
    </div>
  );
}
