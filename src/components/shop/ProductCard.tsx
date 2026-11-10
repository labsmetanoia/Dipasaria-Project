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

const CAT_LABEL: Record<string, { id: string; en: string }> = {
  c_ikan: { id: "Ikan segar", en: "Fresh fish" },
  c_udang: { id: "Udang & cumi", en: "Shrimp & squid" },
  c_beku: { id: "Seafood beku", en: "Frozen seafood" },
  c_ayam: { id: "Ayam halal", en: "Halal chicken" },
  c_olahan: { id: "Olahan beku", en: "Frozen food" },
  c_telur: { id: "Telur", en: "Eggs" },
  c_bumbu: { id: "Bumbu dapur", en: "Pantry" },
  c_paket: { id: "Paket hemat", en: "Value box" },
};

export function ProductCard({ p, segment, discountPct = 0, locale = "id", quickAdd = true, size = "md" }: { p: Product; segment: Segment; discountPct?: number; locale?: Locale; quickAdd?: boolean; size?: "md" | "lg" }) {
  const t = dict[locale];
  const en = locale === "en";
  const v = defaultVariant(p, segment);
  if (!v) return null;
  const price = segment === "business" ? Math.round(v.price_business * (1 - discountPct / 100)) : v.price_retail;
  const retail = segment === "business" && v.price_retail > 0 ? v.price_retail : null;
  const off = !p.available_today;
  const out = v.stock_qty !== null && v.stock_qty < v.min_qty;
  const name = en && p.name_en ? p.name_en : p.name;
  const sub = en ? p.name : p.name_en;
  const variants = p.variants.filter((x) => x.is_active && (segment === "business" || !x.business_only));
  const preps = p.prep_options.map((o) => pick(locale, o.label, o.label_en).split(/[ (]/)[0]).slice(0, 2);
  const spec = [variants.length > 1 ? `${variants.length} ${en ? "sizes" : "pilihan ukuran"}` : pick(locale, v.label, v.label_en), ...preps, ...(p.is_catch_weight ? [en ? "weighed" : "ditimbang"] : [])].join(" · ");
  // One badge at most, in priority order: availability first, then access, then merchandising.
  const badge: { text: string; tone: "dark" | "gold" | "light" } | null = off
    ? { text: t.shop.soldOut, tone: "light" }
    : v.business_only
      ? { text: t.shop.businessOnly, tone: "dark" }
      : p.is_featured
        ? { text: en ? "Best seller" : "Terlaris", tone: "gold" }
        : null;
  const tone = { dark: "bg-ocean-950 text-coral-500", gold: "bg-coral-500 text-ocean-950", light: "bg-white text-ink" };
  return (
    <div className={`group flex flex-col border border-line bg-white transition duration-300 hover:-translate-y-1 hover:border-ocean-950/20 hover:shadow-float ${off ? "opacity-70" : ""}`}>
      <Link href={`/belanja/produk/${p.slug}`} className={`relative block overflow-hidden tile-bg ${size === "lg" ? "aspect-[4/5]" : "aspect-square"}`}>
        <div className={`absolute inset-0 transition duration-700 ease-out group-hover:scale-[1.06] ${off ? "grayscale" : ""}`}><ProductArt icon={p.icon} storage={p.storage_class} image={p.image_url} alt={name} /></div>
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent opacity-0 transition group-hover:opacity-100" />
        {badge && <span className={`absolute left-0 top-3 px-2.5 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.14em] ${tone[badge.tone]}`}>{badge.text}</span>}
        <span className="absolute bottom-3 left-3 bg-white/95 px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-ink/75 backdrop-blur">{t.storage[p.storage_class]}</span>
        <span className="absolute bottom-3 right-3 translate-y-2 bg-ocean-950 px-2.5 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">{en ? "View" : "Lihat"} →</span>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-gold-ink">{(CAT_LABEL[p.category_id] ?? CAT_LABEL.c_ikan)[locale]}</p>
        <Link href={`/belanja/produk/${p.slug}`} className="mt-1 line-clamp-2 font-display text-[22px] font-bold uppercase leading-[0.98] hover:text-gold-ink">{name}</Link>
        <p className="mt-1 line-clamp-1 font-sans text-[12px] text-mute">{sub}{p.scientific_name ? <i> · {p.scientific_name}</i> : null}</p>
        <p className="mt-2 line-clamp-1 font-sans text-[11.5px] font-semibold text-ink/70">{spec}</p>
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-line pt-3 mt-3">
          <div className="min-w-0">
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-mute">{variants.length > 1 ? (en ? "From" : "Mulai") : (en ? "Price" : "Harga")}</p>
            <p className="whitespace-nowrap font-display text-[25px] font-bold leading-none">{rupiah(price)}<span className="ml-1 font-sans text-[11px] font-semibold text-mute">/{t.unit[v.unit]}</span></p>
            {retail !== null && <p className="font-sans text-[11px] text-mute line-through">{rupiah(retail)}</p>}
          </div>
          {quickAdd && <QuickAdd product={p} variant={v} disabled={off || out} />}
        </div>
      </div>
    </div>
  );
}
