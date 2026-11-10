"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { Category, PrepOption, Product, Variant } from "@/lib/types";
import { createVariantAction, deletePrepOptionAction, upsertPrepOptionAction, upsertProductAction, updateVariantAction } from "@/actions/admin";
import { Field } from "@/components/ui";
import { slugify } from "@/lib/format";
import { UNIT_LABEL } from "@/lib/config";

const ICONS = ["fish", "shrimp", "squid", "fillet", "chicken", "egg", "bottle", "box", "snow"];

export function ProductForm({ product, categories }: { product: Product | null; categories: Category[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [p, setP] = useState<Omit<Product, "variants" | "prep_options">>(
    product ?? { id: "", slug: "", category_id: categories[0]?.id ?? "", name: "", name_en: "", scientific_name: "", aliases: [], description: "", description_en: "", origin: "", origin_en: "", storage_class: "chilled", storage_note: "", storage_note_en: "", is_catch_weight: false, available_today: true, is_active: true, is_featured: false, image_url: null, icon: "fish", sort: 99 },
  );
  const [variants, setVariants] = useState<Variant[]>(product?.variants ?? []);
  const [preps, setPreps] = useState<PrepOption[]>(product?.prep_options ?? []);
  const set = <K extends keyof typeof p>(k: K, v: (typeof p)[K]) => setP({ ...p, [k]: v });

  const save = () =>
    start(async () => {
      setErr(null);
      const body = { ...p, slug: p.slug || slugify(p.name), name_en: p.name_en || null, scientific_name: p.scientific_name || null, image_url: p.image_url || null, description_en: p.description_en || null, origin_en: p.origin_en || null, storage_note_en: p.storage_note_en || null };
      const r = await upsertProductAction(body);
      if (!r.ok) { setErr(r.error); return; }
      if (!product) router.push(`/admin/produk/${r.data.id}`);
      else router.refresh();
    });

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="card space-y-4 p-5 lg:col-span-2">
        <h2 className="font-semibold text-ocean-900">Informasi produk</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama (Indonesia)"><input className="input" value={p.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Nama Inggris"><input className="input" value={p.name_en ?? ""} onChange={(e) => set("name_en", e.target.value)} /></Field>
          <Field label="Nama ilmiah"><input className="input italic" value={p.scientific_name ?? ""} onChange={(e) => set("scientific_name", e.target.value)} /></Field>
          <Field label="Nama lain (pisahkan koma)" hint="Dipakai pencarian: bambangan, red snapper"><input className="input" value={p.aliases.join(", ")} onChange={(e) => set("aliases", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} /></Field>
          <Field label="Kategori"><select className="input" value={p.category_id} onChange={(e) => set("category_id", e.target.value)}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Slug URL"><input className="input" value={p.slug} onChange={(e) => set("slug", e.target.value)} placeholder={slugify(p.name) || "otomatis"} /></Field>
          <Field label="Penyimpanan"><select className="input" value={p.storage_class} onChange={(e) => set("storage_class", e.target.value as Product["storage_class"])}><option value="chilled">Segar 0–4 °C</option><option value="frozen">Beku −18 °C</option><option value="ambient">Suhu ruang</option></select></Field>
          <Field label="Ikon"><select className="input" value={p.icon} onChange={(e) => set("icon", e.target.value)}>{ICONS.map((i) => <option key={i}>{i}</option>)}</select></Field>
        </div>
        <Field label="Deskripsi (ID)"><textarea className="input" rows={3} value={p.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="Description (EN)"><textarea className="input" rows={2} value={p.description_en ?? ""} onChange={(e) => set("description_en", e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Asal (ID)"><input className="input" value={p.origin} onChange={(e) => set("origin", e.target.value)} placeholder="Muara Baru, didaratkan menjelang subuh" /></Field>
          <Field label="Origin (EN)"><input className="input" value={p.origin_en ?? ""} onChange={(e) => set("origin_en", e.target.value)} /></Field>
          <Field label="Catatan penyimpanan (ID)"><input className="input" value={p.storage_note} onChange={(e) => set("storage_note", e.target.value)} /></Field>
          <Field label="Storage note (EN)"><input className="input" value={p.storage_note_en ?? ""} onChange={(e) => set("storage_note_en", e.target.value)} /></Field>
          <Field label="URL foto (opsional)"><input className="input" value={p.image_url ?? ""} onChange={(e) => set("image_url", e.target.value)} placeholder="https://…" /></Field>
          <Field label="Urutan"><input className="input" type="number" value={p.sort} onChange={(e) => set("sort", Number(e.target.value))} /></Field>
        </div>
        <div className="flex flex-wrap gap-5 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={p.is_catch_weight} onChange={(e) => set("is_catch_weight", e.target.checked)} className="accent-ocean-900" /> Ditimbang (harga per kg, total akhir setelah ditimbang)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={p.is_featured} onChange={(e) => set("is_featured", e.target.checked)} className="accent-ocean-900" /> Tampilkan di “Pilihan dapur”</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={p.is_active} onChange={(e) => set("is_active", e.target.checked)} className="accent-ocean-900" /> Aktif di katalog</label>
        </div>
        {err && <p className="text-sm text-gold-ink">{err}</p>}
        <button onClick={save} disabled={pending || !p.name} className="btn-primary">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : product ? "Simpan perubahan" : "Buat produk"}</button>
      </div>

      {product && (
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="font-semibold text-ocean-900">Varian & harga</h2>
            <p className="text-xs text-mute">Harga dan stok juga bisa diubah langsung di tabel Produk & stok.</p>
            <ul className="mt-3 divide-y divide-line text-sm">
              {variants.map((v) => (
                <li key={v.id} className="py-2">
                  <div className="flex items-center justify-between gap-2">
                    <input className="input py-1 text-sm" value={v.label} onChange={(e) => setVariants(variants.map((x) => (x.id === v.id ? { ...x, label: e.target.value } : x)))} onBlur={() => updateVariantAction(v.id, { label: v.label })} />
                    <label className="flex items-center gap-1 whitespace-nowrap text-xs"><input type="checkbox" checked={v.is_active} onChange={(e) => { const nv = { ...v, is_active: e.target.checked }; setVariants(variants.map((x) => (x.id === v.id ? nv : x))); updateVariantAction(v.id, { is_active: nv.is_active }); }} className="accent-ocean-900" /> aktif</label>
                  </div>
                  <p className="mt-1 text-xs text-mute">{UNIT_LABEL[v.unit]} · min {v.min_qty} · kelipatan {v.step_qty}{v.business_only ? " · hanya B2B" : ""}</p>
                </li>
              ))}
            </ul>
            <NewVariant productId={product.id} onCreated={(v) => setVariants([...variants, v])} />
          </div>
          <div className="card p-5">
            <h2 className="font-semibold text-ocean-900">Opsi penyiapan</h2>
            <p className="text-xs text-mute">Biaya tambahan per unit; muncul di daftar kerja mitra pembersih.</p>
            <ul className="mt-3 space-y-2 text-sm">
              {preps.map((o) => (
                <li key={o.id} className="flex items-center gap-2">
                  <input className="input py-1 text-sm" value={o.label} onChange={(e) => setPreps(preps.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)))} onBlur={() => upsertPrepOptionAction(o)} />
                  <input className="input w-24 py-1 text-right text-sm" type="number" value={o.surcharge} onChange={(e) => setPreps(preps.map((x) => (x.id === o.id ? { ...x, surcharge: Number(e.target.value) } : x)))} onBlur={() => upsertPrepOptionAction(o)} />
                  <button onClick={() => { deletePrepOptionAction(o.id); setPreps(preps.filter((x) => x.id !== o.id)); }} className="rounded-lg p-1.5 text-mute hover:text-gold-ink" aria-label="Hapus"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
            <button onClick={() => { const o: PrepOption = { id: `pp_${Date.now().toString(36)}`, product_id: product.id, label: "Siangi", label_en: "Gutted & scaled", surcharge: 3000, note: null, note_en: null, sort: preps.length + 1 }; setPreps([...preps, o]); upsertPrepOptionAction(o); }} className="btn-secondary mt-3 text-sm"><Plus className="h-4 w-4" /> Tambah opsi</button>
          </div>
        </div>
      )}
    </div>
  );
}

function NewVariant({ productId, onCreated }: { productId: string; onCreated: (v: Variant) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [v, setV] = useState<Omit<Variant, "id">>({ product_id: productId, label: "", label_en: null, unit: "kg", min_qty: 0.5, step_qty: 0.5, price_retail: 0, price_business: 0, cost: 0, stock_qty: null, business_only: false, is_active: true, sort: 99 });
  if (!open) return <button onClick={() => setOpen(true)} className="btn-secondary mt-3 text-sm"><Plus className="h-4 w-4" /> Tambah varian</button>;
  return (
    <div className="mt-3 space-y-2 rounded-xl bg-sand-100 p-3 text-sm">
      <input className="input py-1.5" placeholder="Label, mis. 1–2 kg/ekor" value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} />
      <div className="grid grid-cols-3 gap-2">
        <select className="input py-1.5" value={v.unit} onChange={(e) => setV({ ...v, unit: e.target.value as Variant["unit"] })}>{Object.entries(UNIT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <input className="input py-1.5" type="number" step="0.5" placeholder="min" value={v.min_qty} onChange={(e) => setV({ ...v, min_qty: Number(e.target.value) })} />
        <input className="input py-1.5" type="number" step="0.5" placeholder="kelipatan" value={v.step_qty} onChange={(e) => setV({ ...v, step_qty: Number(e.target.value) })} />
        <input className="input py-1.5" type="number" placeholder="modal" value={v.cost} onChange={(e) => setV({ ...v, cost: Number(e.target.value) })} />
        <input className="input py-1.5" type="number" placeholder="retail" value={v.price_retail} onChange={(e) => setV({ ...v, price_retail: Number(e.target.value) })} />
        <input className="input py-1.5" type="number" placeholder="grosir" value={v.price_business} onChange={(e) => setV({ ...v, price_business: Number(e.target.value) })} />
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        <label className="flex items-center gap-1"><input type="checkbox" checked={v.stock_qty !== null} onChange={(e) => setV({ ...v, stock_qty: e.target.checked ? 0 : null })} /> lacak stok</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={v.business_only} onChange={(e) => setV({ ...v, business_only: e.target.checked })} /> hanya B2B</label>
      </div>
      <div className="flex gap-2"><button disabled={pending || !v.label} onClick={() => start(async () => { const r = await createVariantAction(v); if (r.ok) { onCreated(r.data); setOpen(false); } })} className="btn-primary py-1.5 text-sm">Simpan varian</button><button onClick={() => setOpen(false)} className="btn-ghost py-1.5 text-sm">Batal</button></div>
    </div>
  );
}
