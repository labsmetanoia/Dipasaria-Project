"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Scale, Snowflake, MapPin } from "lucide-react";
import type { BusinessAccount, Product } from "@/lib/types";
import { segmentOf, unitPrice } from "@/lib/pricing";
import { rupiah } from "@/lib/format";
import { UNIT_LABEL } from "@/lib/config";
import { useCart } from "@/store/cart";
import { QtyStepper } from "./QtyStepper";
import { StorageBadge } from "@/components/ui";

export function ProductSheet({ product, account }: { product: Product; account: BusinessAccount | null }) {
  const segment = segmentOf(account);
  const variants = product.variants.filter((v) => v.is_active && (segment === "business" || !v.business_only));
  const [variantId, setVariantId] = useState(variants[0]?.id);
  const [prepId, setPrepId] = useState<string | null>(null);
  const variant = variants.find((v) => v.id === variantId) ?? variants[0];
  const [qty, setQty] = useState(variant?.min_qty ?? 1);
  const [added, setAdded] = useState(false);
  const add = useCart((s) => s.add);
  const router = useRouter();

  const prep = product.prep_options.find((p) => p.id === prepId) ?? null;
  const price = useMemo(() => (variant ? unitPrice(variant, segment, account) + (prep?.surcharge ?? 0) : 0), [variant, segment, account, prep]);
  const total = Math.round(price * qty);
  const off = !product.available_today;
  const outOfStock = variant?.stock_qty !== null && variant?.stock_qty !== undefined && variant.stock_qty < (variant.min_qty ?? 1);

  if (!variant) return <p className="text-sm text-mute">Produk ini hanya tersedia untuk akun bisnis.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <StorageBadge storage={product.storage_class} />
        {product.is_catch_weight && <span className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-2 py-0.5 text-[11px] font-semibold text-ink/70"><Scale className="h-3 w-3" /> Ditimbang</span>}
        {off && <span className="rounded-full bg-ink/80 px-2 py-0.5 text-[11px] font-semibold text-white">Habis hari ini</span>}
      </div>

      {variants.length > 1 && (
        <div>
          <p className="label">Ukuran / grade</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button key={v.id} type="button" onClick={() => { setVariantId(v.id); setQty(v.min_qty); }} className={`chip ${v.id === variant.id ? "chip-on" : ""}`}>
                {v.label}
                <span className={`ml-1 text-xs ${v.id === variant.id ? "text-white/70" : "text-mute"}`}>{rupiah(unitPrice(v, segment, account))}/{UNIT_LABEL[v.unit]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {variants.length === 1 && <p className="text-sm text-mute">{variant.label}</p>}

      {product.prep_options.length > 0 && (
        <div>
          <p className="label">Penyiapan</p>
          <div className="space-y-2">
            <label className={`flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm ${prepId === null ? "border-ocean-900 bg-ocean-900/5" : "border-line"}`}>
              <span className="flex items-center gap-2"><input type="radio" name="prep" checked={prepId === null} onChange={() => setPrepId(null)} className="accent-ocean-900" /> Utuh, tanpa penyiapan</span>
              <span className="text-mute">+Rp 0</span>
            </label>
            {product.prep_options.map((p) => (
              <label key={p.id} className={`flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm ${prepId === p.id ? "border-ocean-900 bg-ocean-900/5" : "border-line"}`}>
                <span className="flex items-center gap-2">
                  <input type="radio" name="prep" checked={prepId === p.id} onChange={() => setPrepId(p.id)} className="accent-ocean-900" />
                  <span>{p.label}{p.note && <span className="block text-xs text-mute">{p.note}</span>}</span>
                </span>
                <span className="whitespace-nowrap text-mute">+{rupiah(p.surcharge)}/{UNIT_LABEL[variant.unit]}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 text-sm text-ink/80 sm:grid-cols-2">
        <p className="flex gap-2"><MapPin className="h-4 w-4 flex-none text-tide-600" />{product.origin}</p>
        <p className="flex gap-2"><Snowflake className="h-4 w-4 flex-none text-tide-600" />{product.storage_note}</p>
      </div>
      {product.is_catch_weight && (
        <p className="rounded-xl bg-sand-100 px-4 py-3 text-[13px] leading-relaxed text-ink/80">
          Dijual per kg dan ditimbang setelah disiapkan. Total di keranjang adalah <b>perkiraan</b>; invoice final dikirim via WhatsApp sebelum pengiriman, dan Anda membayar jumlah final.
        </p>
      )}

      <div className="sticky bottom-20 z-10 -mx-4 border-t border-line bg-white/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:rounded-2xl md:border md:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-mute">{product.is_catch_weight ? "Perkiraan" : "Total"} · {rupiah(price)}/{UNIT_LABEL[variant.unit]}</p>
            <p className="font-display text-2xl font-semibold text-ocean-900">{rupiah(total)}</p>
          </div>
          <QtyStepper value={qty} min={variant.min_qty} step={variant.step_qty} unit={UNIT_LABEL[variant.unit]} onChange={(v) => setQty(Math.max(variant.min_qty, v))} />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={off || outOfStock}
            onClick={() => {
              add({ product_id: product.id, variant_id: variant.id, qty, prep_option_id: prepId });
              setAdded(true);
              setTimeout(() => setAdded(false), 1800);
            }}
            className="btn-primary flex-1"
          >
            {added ? <><Check className="h-4 w-4" /> Ditambahkan</> : off ? "Habis hari ini" : outOfStock ? "Stok habis" : "Tambah ke keranjang"}
          </button>
          <button type="button" disabled={off || outOfStock} onClick={() => { add({ product_id: product.id, variant_id: variant.id, qty, prep_option_id: prepId }); router.push("/keranjang"); }} className="btn-accent">Beli</button>
        </div>
        {variant.stock_qty !== null && variant.stock_qty <= 5 && variant.stock_qty > 0 && <p className="mt-2 text-xs text-coral-600">Tersisa {variant.stock_qty} {UNIT_LABEL[variant.unit]}.</p>}
      </div>
    </div>
  );
}
