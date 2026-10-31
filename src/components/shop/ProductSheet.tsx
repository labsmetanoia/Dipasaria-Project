"use client";
import { useMemo, useState } from "react";
import { Check, Scale, Snowflake, MapPin, ShieldCheck, Fish, BadgeCheck, ShoppingBag } from "lucide-react";
import type { BusinessAccount, Product } from "@/lib/types";
import { segmentOf, unitPrice } from "@/lib/pricing";
import { rupiah } from "@/lib/format";
import { pick } from "@/lib/i18n";
import { fmt } from "@/lib/i18n/dict";
import { useT } from "@/lib/i18n/client";
import { useCart } from "@/store/cart";
import { QtyStepper } from "./QtyStepper";

export function ProductSheet({ product, account }: { product: Product; account: BusinessAccount | null }) {
 const { t, locale } = useT();
 const segment = segmentOf(account);
 const variants = product.variants.filter((v) => v.is_active && (segment === "business" || !v.business_only));
 const [variantId, setVariantId] = useState(variants[0]?.id);
 const [prepId, setPrepId] = useState<string | null>(null);
 const variant = variants.find((v) => v.id === variantId) ?? variants[0];
 const [qty, setQty] = useState(variant?.min_qty ?? 1);
 const [added, setAdded] = useState(false);
 const [more, setMore] = useState(false);
 const { add, notify } = useCart();
 const prep = product.prep_options.find((p) => p.id === prepId) ?? null;
 const price = useMemo(() => (variant ? unitPrice(variant, segment, account) + (prep?.surcharge ?? 0) : 0), [variant, segment, account, prep]);
 const total = Math.round(price * qty);
 const off = !product.available_today;
 const outOfStock = variant?.stock_qty !== null && variant?.stock_qty !== undefined && variant.stock_qty < (variant.min_qty ?? 1);
 if (!variant) return <p className="font-sans text-sm text-mute">{t.shop.businessOnlyProduct}</p>;
 const unit = t.unit[variant.unit];
 const retail = segment === "business" && variant.price_retail > 0 ? variant.price_retail + (prep?.surcharge ?? 0) : null;
 const desc = pick(locale, product.description, product.description_en);
 const trust = [
    { Icon: Fish, label: locale === "en" ? "Auctioned at dawn" : "Lelang subuh" },
    { Icon: Snowflake, label: t.storage[product.storage_class] },
    { Icon: BadgeCheck, label: product.category_id === "c_ayam" ? "Halal · NKV" : locale === "en" ? "Named species" : "Spesies bernama" },
    { Icon: ShieldCheck, label: locale === "en" ? "2-hour guarantee" : "Garansi 2 jam" },
  ];
 const doAdd = () => { add({ product_id: product.id, variant_id: variant.id, qty, prep_option_id: prepId }); notify(locale === "en" && product.name_en ? product.name_en : product.name); setAdded(true); setTimeout(() => setAdded(false), 1500); };

 return (
    <div className="space-y-6">
      <div>
        <p className={`font-sans text-[14px] leading-relaxed text-ink/80 ${more ? "" : "line-clamp-3"}`}>{desc}</p>
        {desc.length > 160 && <button onClick={() => setMore((v) => !v)} className="mt-1 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-coral-600">{more ? (locale === "en" ? "Read less" : "Tutup") : (locale === "en" ? "Read more" : "Selengkapnya")}</button>}
      </div>

      <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
        <p className="font-display text-[3rem] font-bold leading-none">{rupiah(price)}</p>
        <p className="pb-1 font-sans text-[13px] font-semibold text-mute">/{unit}{product.is_catch_weight ? ` · ± ${t.shop.weighed.toLowerCase()}` : ""}</p>
        {retail !== null && <p className="pb-1 font-sans text-[14px] text-mute line-through">{rupiah(retail)}</p>}
      </div>

      {variants.length > 1 && (
        <div>
          <p className="label">{t.shop.sizeGrade}</p>
          <div className="flex flex-wrap gap-2">{variants.map((v) => <button key={v.id} type="button" onClick={() => { setVariantId(v.id); setQty(v.min_qty); }} className={`chip ${v.id === variant.id ? "chip-on" : ""}`}>{pick(locale, v.label, v.label_en)}<span className={`ml-1 normal-case tracking-normal ${v.id === variant.id ? "text-white/70" : "text-mute"}`}>{rupiah(unitPrice(v, segment, account))}</span></button>)}</div>
        </div>
      )}
      {variants.length === 1 && <p className="font-sans text-[12px] font-bold uppercase tracking-[0.14em] text-mute">{pick(locale, variant.label, variant.label_en)}</p>}

      {product.prep_options.length > 0 && (
        <div>
          <p className="label">{t.shop.prep}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className={`flex cursor-pointer items-center justify-between border px-3.5 py-3 font-sans text-[13px] ${prepId === null ? "border-ocean-950 bg-white" : "border-line bg-white/60"}`}><span className="flex items-center gap-2"><input type="radio" name="prep" checked={prepId === null} onChange={() => setPrepId(null)} className="accent-ocean-950" /> {t.shop.prepNone}</span><span className="text-mute">+Rp 0</span></label>
            {product.prep_options.map((p) => (
              <label key={p.id} className={`flex cursor-pointer items-center justify-between border px-3.5 py-3 font-sans text-[13px] ${prepId === p.id ? "border-ocean-950 bg-white" : "border-line bg-white/60"}`}>
                <span className="flex items-center gap-2"><input type="radio" name="prep" checked={prepId === p.id} onChange={() => setPrepId(p.id)} className="accent-ocean-950" /><span>{pick(locale, p.label, p.label_en)}{(p.note || p.note_en) && <span className="block text-[11px] text-mute">{pick(locale, p.note, p.note_en)}</span>}</span></span>
                <span className="whitespace-nowrap text-mute">+{rupiah(p.surcharge)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <QtyStepper value={qty} min={variant.min_qty} step={variant.step_qty} unit={unit} onChange={(v) => setQty(Math.max(variant.min_qty, v))} />
        <p className="font-sans text-[13px] text-mute">{product.is_catch_weight ? `± ${t.common.estimated}: ` : `${t.shop.total}: `}<b className="text-ink">{rupiah(total)}</b></p>
      </div>
      <button type="button" disabled={off || outOfStock} onClick={doAdd} className="btn-accent w-full py-4 text-[13.5px]">
        {added ? <><Check className="h-4 w-4" /> {t.shop.added}</> : off ? t.shop.soldOut : outOfStock ? t.shop.outOfStock : <><ShoppingBag className="h-4 w-4" /> {t.shop.addToCart}</>}
      </button>
      {variant.stock_qty !== null && variant.stock_qty <= 5 && variant.stock_qty > 0 && <p className="-mt-3 font-sans text-xs text-coral-700">{fmt(t.shop.leftInStock, { n: variant.stock_qty, unit })}</p>}

      <div className="grid grid-cols-4 gap-2 border-y border-line py-4">
        {trust.map(({ Icon, label }) => <div key={label} className="flex flex-col items-center gap-2 text-center"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-ocean-950 text-coral-500"><Icon className="h-4 w-4" /></span><span className="font-sans text-[9.5px] font-bold uppercase leading-tight tracking-[0.12em] text-ink/70">{label}</span></div>)}
      </div>

      <div className="grid gap-2 font-sans text-[13px] text-ink/80 sm:grid-cols-2">
        <p className="flex gap-2"><MapPin className="h-4 w-4 flex-none text-coral-600" />{pick(locale, product.origin, product.origin_en)}</p>
        <p className="flex gap-2"><Snowflake className="h-4 w-4 flex-none text-coral-600" />{pick(locale, product.storage_note, product.storage_note_en)}</p>
      </div>
      {product.is_catch_weight && <p className="flex gap-2 bg-sand-100 px-4 py-3 font-sans text-[12.5px] leading-relaxed text-ink/80"><Scale className="mt-0.5 h-4 w-4 flex-none text-coral-600" />{t.shop.catchNote}</p>}
    </div>
  );
}
