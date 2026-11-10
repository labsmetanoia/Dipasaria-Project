"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Loader2, Plus, Search } from "lucide-react";
import type { Category, Product, Variant } from "@/lib/types";
import { setAvailabilityAction, updateVariantAction } from "@/actions/admin";
import { UNIT_LABEL } from "@/lib/config";
import { StorageBadge } from "@/components/ui";

function margin(v: Variant, biz: boolean) {
  const p = biz ? v.price_business : v.price_retail;
  if (!p) return null;
  return ((p - v.cost) / p) * 100;
}

function MoneyCell({ value, onSave, disabled }: { value: number; onSave: (n: number) => Promise<void>; disabled?: boolean }) {
  const [v, setV] = useState(String(value));
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const commit = async () => {
    const n = Number(v.replace(/[^\d.]/g, ""));
    if (Number.isNaN(n) || n === value) { setV(String(value)); return; }
    setState("saving");
    await onSave(n);
    setState("saved");
    setTimeout(() => setState("idle"), 1200);
  };
  return (
    <span className="relative inline-block">
      <input disabled={disabled} value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} inputMode="numeric" className="w-24 border border-transparent bg-transparent px-2 py-1 text-right text-sm tabular-nums hover:border-line focus:border-tide-500 focus:bg-white focus:outline-none disabled:text-mute" />
      {state !== "idle" && <span className="absolute -right-1 -top-1 text-tide-600">{state === "saving" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}</span>}
    </span>
  );
}

export function ProductsTable({ products: initial, categories }: { products: Product[]; categories: Category[] }) {
  const [products, setProducts] = useState(initial);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [, start] = useTransition();

  const list = useMemo(() => products.filter((p) => (!cat || p.category_id === cat) && (!q || [p.name, p.name_en, p.scientific_name, ...p.aliases].filter(Boolean).some((t) => (t as string).toLowerCase().includes(q.toLowerCase())))), [products, q, cat]);

  const patchVariant = async (variantId: string, patch: Partial<Variant>) => {
    const r = await updateVariantAction(variantId, patch);
    if (r.ok) setProducts((ps) => ps.map((p) => ({ ...p, variants: p.variants.map((v) => (v.id === variantId ? r.data : v)) })));
  };
  const toggleAvail = (p: Product) => {
    const next = !p.available_today;
    setProducts((ps) => ps.map((x) => (x.id === p.id ? { ...x, available_today: next } : x)));
    start(async () => { await setAvailabilityAction(p.id, next); });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" /><input value={q} onChange={(e) => setQ(e.target.value)} className="input w-56 pl-9 py-2 text-sm" placeholder="Cari produk" /></div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="input w-auto py-2 text-sm"><option value="">Semua kategori</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <Link href="/admin/produk/baru" className="btn-primary ml-auto text-sm"><Plus className="h-4 w-4" /> Produk baru</Link>
      </div>
      <p className="text-xs text-mute">Klik angka untuk mengubah; tersimpan otomatis saat Anda pindah sel. Margin merah = di bawah 10%, batas minimum rencana bisnis. Harga grosir mengikuti indeks pasar: perbarui sebelum 18.00.</p>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-sand-100 text-left text-xs text-mute">
            <tr><th className="px-3 py-2 font-medium">Ada hari ini</th><th className="px-3 py-2 font-medium">Produk / varian</th><th className="px-3 py-2 text-right font-medium">Modal</th><th className="px-3 py-2 text-right font-medium">Harga eceran</th><th className="px-3 py-2 text-right font-medium">Margin</th><th className="px-3 py-2 text-right font-medium">Harga grosir</th><th className="px-3 py-2 text-right font-medium">Margin</th><th className="px-3 py-2 text-right font-medium">Stok</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((p) => p.variants.map((v, vi) => {
              const mr = margin(v, false), mb = margin(v, true);
              const flag = (m: number | null) => m === null ? "text-mute" : m < 10 ? "font-semibold text-gold-ink" : m < 12 ? "text-warn-600" : "text-success-600";
              return (
                <tr key={v.id} className={`${!p.available_today ? "bg-sand-50/70 text-mute" : ""} ${vi > 0 ? "" : "border-t-2 border-sand-200"}`}>
                  <td className="px-3 py-2">{vi === 0 && <button onClick={() => toggleAvail(p)} className={`relative h-6 w-11 rounded-full transition ${p.available_today ? "bg-success-600" : "bg-sand-300"}`} aria-label="Ada hari ini"><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${p.available_today ? "left-[22px]" : "left-0.5"}`} /></button>}</td>
                  <td className="px-3 py-2">
                    {vi === 0 ? <Link href={`/admin/produk/${p.id}`} className="font-semibold text-ocean-900 hover:underline">{p.name}</Link> : <span className="text-transparent select-none">{p.name}</span>}
                    <span className="ml-2 text-xs text-mute">{v.label} · {UNIT_LABEL[v.unit]}{v.business_only ? " · B2B" : ""}{p.is_catch_weight && vi === 0 ? " · ditimbang" : ""}</span>
                    {vi === 0 && <span className="ml-2 align-middle"><StorageBadge storage={p.storage_class} /></span>}
                  </td>
                  <td className="px-3 py-1 text-right"><MoneyCell value={v.cost} onSave={(n) => patchVariant(v.id, { cost: n })} /></td>
                  <td className="px-3 py-1 text-right"><MoneyCell value={v.price_retail} disabled={v.business_only} onSave={(n) => patchVariant(v.id, { price_retail: n })} /></td>
                  <td className={`px-3 py-2 text-right tabular-nums ${flag(mr)}`}>{mr === null ? "—" : `${mr.toFixed(0)}%`}</td>
                  <td className="px-3 py-1 text-right"><MoneyCell value={v.price_business} onSave={(n) => patchVariant(v.id, { price_business: n })} /></td>
                  <td className={`px-3 py-2 text-right tabular-nums ${flag(mb)}`}>{mb === null ? "—" : `${mb.toFixed(0)}%`}</td>
                  <td className="px-3 py-1 text-right">{v.stock_qty === null ? <span className="text-xs text-mute">sesuai pesanan</span> : <MoneyCell value={v.stock_qty} onSave={(n) => patchVariant(v.id, { stock_qty: n })} />}</td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
