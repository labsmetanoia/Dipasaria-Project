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

export function ProductCard({ p, segment, discountPct = 0, locale = "id", quickAdd = false }: { p: Product; segment: Segment; discountPct?: number; locale?: Locale; quickAdd?: boolean }) {
  const t = dict[locale];
  const v = defaultVariant(p, segment);
  if (!v) return null;
  const price = segment === "business" ? Math.round(v.price_business * (1 - discountPct / 100)) : v.price_retail;
  const retail = segment === "business" && v.price_retail > 0 ? v.price_retail : null;
  const off = !p.available_today;
  const out = v.stock_qty !== null && v.stock_qty < v.min_qty;
  const label = pick(locale, v.label, v.label_en);
  return (
    <Link href={`/belanja/produk/${p.slug}`} className={`group flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-float ${off ? "opacity-60 saturate-50" : ""}`}>
      <div className="relative aspect-[5/4] overflow-hidden">
        <ProductArt icon={p.icon} storage={p.storage_class} image={p.image_url} alt={p.name} />
        <div className="absolute left-2.5 top-2.5 flex gap-1">
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ocean-950 backdrop-blur">{t.storage[p.storage_class]}</span>
        </div>
        {off && <span className="absolute right-2.5 top-2.5 rounded-full bg-ink/85 px-2 py-0.5 text-[10.5px] font-bold text-white">{t.shop.soldOut}</span>}
        {p.is_catch_weight && !off && <span className="absolute bottom-2.5 left-2.5 rounded-full bg-ocean-950/80 px-2 py-0.5 text-[10.5px] font-semibold text-white backdrop-blur">± {t.shop.weighed}</span>}
        {quickAdd && <div className="absolute bottom-2.5 right-2.5"><QuickAdd product={p} variant={v} disabled={off || out} /></div>}
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <p className="line-clamp-1 text-[15px] font-bold text-ocean-950">{locale === "en" && p.name_en ? p.name_en : p.name}</p>
        <p className="line-clamp-1 text-[12px] text-mute">{locale === "en" ? p.name : p.name_en ?? label}{p.variants.length > 1 ? "" : ` · ${label}`}</p>
        <div className="mt-auto flex items-end justify-between pt-3">
          <div>
            <p className="text-[15.5px] font-extrabold text-ocean-950">{rupiah(price)}<span className="text-[11.5px] font-semibold text-mute">/{t.unit[v.unit]}</span></p>
            {retail !== null && <p className="text-[11px] text-mute line-through">{rupiah(retail)}</p>}
          </div>
          {p.variants.length > 1 && <span className="text-[11px] font-semibold text-tide-600">{p.variants.length} {locale === "en" ? "sizes" : "ukuran"}</span>}
        </div>
      </div>
    </Link>
  );
}
