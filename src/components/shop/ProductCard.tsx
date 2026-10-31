import Link from "next/link";
import type { Product, Segment } from "@/lib/types";
import { ProductArt } from "@/components/ProductArt";
import { StorageBadge } from "@/components/ui";
import { rupiah } from "@/lib/format";
import { UNIT_LABEL } from "@/lib/config";

export function priceFrom(p: Product, segment: Segment, discountPct = 0): { price: number; unit: string; retail?: number } | null {
  const vs = p.variants.filter((v) => v.is_active && (segment === "business" || !v.business_only));
  if (!vs.length) return null;
  const pick = vs.reduce((a, b) => ((segment === "business" ? a.price_business : a.price_retail) <= (segment === "business" ? b.price_business : b.price_retail) ? a : b));
  const price = segment === "business" ? Math.round(pick.price_business * (1 - discountPct / 100)) : pick.price_retail;
  return { price, unit: UNIT_LABEL[pick.unit], retail: segment === "business" ? pick.price_retail : undefined };
}

export function ProductCard({ p, segment, discountPct = 0 }: { p: Product; segment: Segment; discountPct?: number }) {
  const pf = priceFrom(p, segment, discountPct);
  if (!pf) return null;
  const off = !p.available_today;
  return (
    <Link href={`/belanja/produk/${p.slug}`} className={`card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-float ${off ? "opacity-60 saturate-50" : ""}`}>
      <div className="relative aspect-square overflow-hidden">
        <ProductArt icon={p.icon} storage={p.storage_class} image={p.image_url} alt={p.name} />
        <div className="absolute left-2 top-2"><StorageBadge storage={p.storage_class} /></div>
        {off && <span className="absolute right-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-[11px] font-semibold text-white">Habis hari ini</span>}
        {p.is_catch_weight && !off && <span className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-[10.5px] font-semibold text-ocean-900">Ditimbang</span>}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-1 text-[15px] font-semibold text-ocean-900">{p.name}</p>
        <p className="line-clamp-1 text-xs text-mute">{p.name_en ?? p.variants[0]?.label}</p>
        <div className="mt-auto pt-2.5">
          <p className="text-[15px] font-bold text-ink">{rupiah(pf.price)}<span className="text-xs font-medium text-mute">/{pf.unit}</span></p>
          {pf.retail !== undefined && pf.retail > 0 && <p className="text-[11px] text-mute line-through">{rupiah(pf.retail)}</p>}
        </div>
      </div>
    </Link>
  );
}
