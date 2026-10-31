import Link from "next/link";
import type { Product, Segment } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import { pick } from "@/lib/i18n";
import { dict } from "@/lib/i18n/dict";
import { ProductArt } from "@/components/ProductArt";
import { rupiah } from "@/lib/format";
import { QuickAdd } from "./QuickAdd";

export function defaultVariant(p: Product, segment: Segment) {
 const vs = p.variants.filter((v) => v.is_active && (segment === "business" || !v.business_only));
 if (!vs.length) return null;
 return vs.reduce((a, b) => ((segment === "business" ? a.price_business : a.price_retail) <= (segment === "business" ? b.price_business : b.price_retail) ? a : b));
}

export function ProductCard({ p, segment, discountPct = 0, locale = "id", quickAdd = true }: { p: Product; segment: Segment; discountPct?: number; locale?: Locale; quickAdd?: boolean }) {
 const t = dict[locale];
 const v = defaultVariant(p, segment);
 if (!v) return null;
 const price = segment === "business" ? Math.round(v.price_business * (1 - discountPct / 100)) : v.price_retail;
 const retail = segment === "business" && v.price_retail > 0 ? v.price_retail : null;
 const off = !p.available_today;
 const out = v.stock_qty !== null && v.stock_qty < v.min_qty;
 const name = locale === "en" && p.name_en ? p.name_en : p.name;
 const sub = locale === "en" ? p.name : p.name_en;
 const badge = off ? t.shop.soldOut : p.is_catch_weight ? t.shop.weighed : v.business_only ? t.shop.businessOnly : null;
 return (
    <div className={`group card flex flex-col transition hover:shadow-float ${off ? "opacity-60" : ""}`}>
      <Link href={`/belanja/produk/${p.slug}`} className="relative block aspect-square overflow-hidden tile-bg">
        <div className="absolute inset-0 transition duration-500 group-hover:scale-[1.03]"><ProductArt icon={p.icon} storage={p.storage_class} image={p.image_url} alt={name} /></div>
        {badge && <span className="absolute left-0 top-3 bg-ocean-950 px-2.5 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-coral-500">{badge}</span>}
        <span className="absolute bottom-3 right-3 bg-white/90 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-ink/70">{t.storage[p.storage_class]}</span>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link href={`/belanja/produk/${p.slug}`} className="line-clamp-2 font-display text-[21px] font-bold uppercase leading-[1] hover:text-coral-600">{name}{p.variants.length === 1 ? ` – ${pick(locale, v.label, v.label_en)}` : ""}</Link>
        <p className="mt-1.5 line-clamp-2 font-sans text-[12.5px] leading-snug text-mute">{sub ? `${sub}. ` : ""}{pick(locale, p.description, p.description_en)}</p>
        <div className="mt-auto flex items-end justify-between border-t border-line pt-3">
          <div>
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-mute">{p.variants.length > 1 ? (locale === "en" ? "From" : "Mulai") : (locale === "en" ? "Price" : "Harga")}</p>
            <p className="font-display text-[24px] font-bold leading-none">{rupiah(price)}<span className="ml-1 font-sans text-[11px] font-semibold text-mute">/{t.unit[v.unit]}</span></p>
            {retail !== null && <p className="font-sans text-[11px] text-mute line-through">{rupiah(retail)}</p>}
          </div>
          {quickAdd && <QuickAdd product={p} variant={v} disabled={off || out} />}
        </div>
      </div>
    </div>
  );
}
