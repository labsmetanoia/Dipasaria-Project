"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Scale, Snowflake, MapPin } from "lucide-react";
import type { BusinessAccount, Product } from "@/lib/types";
import { segmentOf, unitPrice } from "@/lib/pricing";
import { rupiah } from "@/lib/format";
import { pick } from "@/lib/i18n";
import { fmt } from "@/lib/i18n/dict";
import { useT } from "@/lib/i18n/client";
import { useCart } from "@/store/cart";
import { QtyStepper } from "./QtyStepper";
import { StorageBadge } from "@/components/ui";

export function ProductSheet({ product, account }: { product: Product; account: BusinessAccount | null }) {
  const { t, locale } = useT();
  const segment = segmentOf(account);
  const variants = product.variants.filter((v) => v.is_active && (segment === "business" || !v.business_only));
  const [variantId, setVariantId] = useState(variants[0]?.id);
  const [prepId, setPrepId] = useState<string | null>(null);
  const variant = variants.find((v) => v.id === variantId) ?? variants[0];
  const [qty, setQty] = useState(variant?.min_qty ?? 1);
  const [added, setAdded] = useState(false);
  const { add, notify } = useCart();
  const router = useRouter();

  const prep = product.prep_options.find((p) => p.id === prepId) ?? null;
  const price = useMemo(() => (variant ? unitPrice(variant, segment, account) + (prep?.surcharge ?? 0) : 0), [variant, segment, account, prep]);
  const total = Math.round(price * qty);
  const off = !product.available_today;
  const outOfStock = variant?.stock_qty !== null && variant?.stock_qty !== undefined && variant.stock_qty < (variant.min_qty ?? 1);
  if (!variant) return <p className="text-sm text-mute">{t.shop.businessOnlyProduct}</p>;
  const unit = t.unit[variant.unit];
  const doAdd = () => { add({ product_id: product.id, variant_id: variant.id, qty, prep_option_id: prepId }); notify(locale === "en" && product.name_en ? product.name_en : product.name); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <StorageBadge storage={product.storage_class} />
        {product.is_catch_weight && <span className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-2 py-0.5 text-[11px] font-bold text-ink/70"><Scale className="h-3 w-3" /> {t.shop.weighed}</span>}
        {off && <span className="rounded-full bg-ink/80 px-2 py-0.5 text-[11px] font-bold text-white">{t.shop.soldOut}</span>}
      </div>

      {variants.length > 1 ? (
        <div>
          <p className="label">{t.shop.sizeGrade}</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button key={v.id} type="button" onClick={() => { setVariantId(v.id); setQty(v.min_qty); }} className={`chip ${v.id === variant.id ? "chip-on" : ""}`}>
                {pick(locale, v.label, v.label_en)}<span className={`ml-1 text-xs ${v.id === variant.id ? "text-white/70" : "text-mute"}`}>{rupiah(unitPrice(v, segment, account))}/{t.unit[v.unit]}</span>
              </button>
            ))}
          </div>
        </div>
      ) : <p className="text-sm text-mute">{pick(locale, variant.label, variant.label_en)}</p>}

      {product.prep_options.length > 0 && (
        <div>
          <p className="label">{t.shop.prep}</p>
          <div className="space-y-2">
            <label className={`flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm ${prepId === null ? "border-ocean-950 bg-ocean-950/5" : "border-line"}`}>
              <span className="flex items-center gap-2"><input type="radio" name="prep" checked={prepId === null} onChange={() => setPrepId(null)} className="accent-ocean-950" /> {t.shop.prepNone}</span><span className="text-mute">+Rp 0</span>
            </label>
            {product.prep_options.map((p) => (
              <label key={p.id} className={`flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm ${prepId === p.id ? "border-ocean-950 bg-ocean-950/5" : "border-line"}`}>
                <span className="flex items-center gap-2"><input type="radio" name="prep" checked={prepId === p.id} onChange={() => setPrepId(p.id)} className="accent-ocean-950" /><span>{pick(locale, p.label, p.label_en)}{(p.note || p.note_en) && <span className="block text-xs text-mute">{pick(locale, p.note, p.note_en)}</span>}</span></span>
                <span className="whitespace-nowrap text-mute">+{rupiah(p.surcharge)}/{unit}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 text-sm text-ink/80 sm:grid-cols-2">
        <p className="flex gap-2"><MapPin className="h-4 w-4 flex-none text-coral-500" />{pick(locale, product.origin, product.origin_en)}</p>
        <p className="flex gap-2"><Snowflake className="h-4 w-4 flex-none text-tide-500" />{pick(locale, product.storage_note, product.storage_note_en)}</p>
      </div>
      {product.is_catch_weight && <p className="rounded-xl bg-coral-50 px-4 py-3 text-[13px] leading-relaxed text-ink/80">{t.shop.catchNote}</p>}

      <div className="sticky bottom-20 z-10 -mx-5 border-t border-line bg-white/95 px-5 py-3 backdrop-blur md:static md:mx-0 md:rounded-2xl md:border md:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-mute">{product.is_catch_weight ? `± ${t.common.estimated}` : t.shop.total} · {rupiah(price)}/{unit}</p>
            <p className="text-2xl font-bold text-ocean-950">{rupiah(total)}</p>
          </div>
          <QtyStepper value={qty} min={variant.min_qty} step={variant.step_qty} unit={unit} onChange={(v) => setQty(Math.max(variant.min_qty, v))} />
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={off || outOfStock} onClick={() => { doAdd(); setAdded(true); setTimeout(() => setAdded(false), 1500); }} className="btn-primary flex-1">
            {added ? <><Check className="h-4 w-4" /> {t.shop.added}</> : off ? t.shop.soldOut : outOfStock ? t.shop.outOfStock : t.shop.addToCart}
          </button>
          <button type="button" disabled={off || outOfStock} onClick={() => { doAdd(); router.push("/keranjang"); }} className="btn-accent">{t.shop.buyNow}</button>
        </div>
        {variant.stock_qty !== null && variant.stock_qty <= 5 && variant.stock_qty > 0 && <p className="mt-2 text-xs text-coral-600">{fmt(t.shop.leftInStock, { n: variant.stock_qty, unit })}</p>}
      </div>
    </div>
  );
}
