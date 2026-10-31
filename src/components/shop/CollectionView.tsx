"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Category, Product, Segment, StorageClass } from "@/lib/types";
import { pick } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { ProductCard, defaultVariant } from "./ProductCard";
import { ImageSlot } from "@/components/site/Decor";

type Sort = "recommended" | "price_asc" | "price_desc" | "name";

export function CollectionView({ products, categories, segment, discountPct, activeSlug, promo }: { products: Product[]; categories: Category[]; segment: Segment; discountPct?: number; activeSlug?: string; promo?: { eyebrow: string; title: string; body: string; cta: string; href: string; image?: string | null } }) {
 const { t, locale } = useT();
 const [storage, setStorage] = useState<StorageClass | "all">("all");
 const [sort, setSort] = useState<Sort>("recommended");
 const [onlyAvail, setOnlyAvail] = useState(false);
 const [limit, setLimit] = useState(12);
 const L = locale === "en"
    ? { all: "All categories", storage: "Storage", sortBy: "Sort by", rec: "Recommended", pl: "Price: low to high", ph: "Price: high to low", nm: "Name", avail: "Available today", more: "See more products", count: (n: number) => `${n} products` }
    : { all: "Semua kategori", storage: "Penyimpanan", sortBy: "Urutkan", rec: "Rekomendasi", pl: "Harga: rendah ke tinggi", ph: "Harga: tinggi ke rendah", nm: "Nama", avail: "Tersedia hari ini", more: "Lihat produk lainnya", count: (n: number) => `${n} produk` };
 const list = useMemo(() => {
 const price = (p: Product) => { const v = defaultVariant(p, segment); return v ? (segment === "business" ? v.price_business : v.price_retail) : 0; };
 let xs = products.filter((p) => (storage === "all" || p.storage_class === storage) && (!onlyAvail || p.available_today));
 if (sort === "price_asc") xs = [...xs].sort((a, b) => price(a) - price(b));
 else if (sort === "price_desc") xs = [...xs].sort((a, b) => price(b) - price(a));
 else if (sort === "name") xs = [...xs].sort((a, b) => a.name.localeCompare(b.name));
 else xs = [...xs].sort((a, b) => Number(b.available_today) - Number(a.available_today) || Number(b.is_featured) - Number(a.is_featured) || a.sort - b.sort);
 return xs;
  }, [products, storage, sort, onlyAvail, segment]);
 const sel = "appearance-none border border-line bg-white py-2 pl-3 pr-8 font-sans text-[11px] font-bold uppercase tracking-[0.12em] focus:border-ocean-950 focus:outline-none";
 const shown = list.slice(0, limit);
 return (
    <>
      <div className="border-y border-line bg-sand-100">
        <div className="container-x flex flex-wrap items-center gap-2 py-3">
          <div className="relative"><select className={sel} value={activeSlug ?? ""} onChange={(e) => { window.location.href = e.target.value ? `/belanja/kategori/${e.target.value}` : "/belanja/semua"; }}><option value="">{L.all}</option>{categories.map((c) => <option key={c.id} value={c.slug}>{pick(locale, c.name, c.name_en)}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" /></div>
          <div className="relative"><select className={sel} value={storage} onChange={(e) => setStorage(e.target.value as StorageClass | "all")}><option value="all">{L.storage}</option><option value="chilled">{t.storage.chilled}</option><option value="frozen">{t.storage.frozen}</option><option value="ambient">{t.storage.ambient}</option></select><ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" /></div>
          <label className="flex items-center gap-2 border border-line bg-white px-3 py-2 font-sans text-[11px] font-bold uppercase tracking-[0.12em]"><input type="checkbox" checked={onlyAvail} onChange={(e) => setOnlyAvail(e.target.checked)} className="accent-ocean-950" />{L.avail}</label>
          <div className="ml-auto flex items-center gap-2 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-mute"><span className="hidden sm:inline">{L.sortBy}</span>
            <div className="relative"><select className={sel} value={sort} onChange={(e) => setSort(e.target.value as Sort)}><option value="recommended">{L.rec}</option><option value="price_asc">{L.pl}</option><option value="price_desc">{L.ph}</option><option value="name">{L.nm}</option></select><ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" /></div>
          </div>
        </div>
      </div>
      <div className="container-x py-8 md:py-12">
        <p className="mb-4 font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-mute">{L.count(list.length)}</p>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {shown.map((p, i) => (
            <>
              {promo && i === 4 && (
                <Link key="promo" href={promo.href} className="group relative col-span-2 block min-h-[260px] overflow-hidden bg-ocean-950 text-white">
                  <ImageSlot src={promo.image} alt={promo.title} icon="box" className="absolute inset-0 transition duration-700 group-hover:scale-[1.03]"><div className="photo-fade absolute inset-0" /></ImageSlot>
                  <div className="absolute inset-0 flex flex-col justify-end p-6"><p className="eyebrow text-coral-500">{promo.eyebrow}</p><p className="mt-2 font-display text-[2.2rem] font-bold uppercase leading-none">{promo.title}</p><p className="mt-2 max-w-sm font-sans text-[13px] text-white/75">{promo.body}</p><span className="btn-link mt-4 text-white">{promo.cta} →</span></div>
                </Link>
              )}
              <ProductCard key={p.id} p={p} segment={segment} discountPct={discountPct} locale={locale} />
            </>
          ))}
        </div>
        {shown.length < list.length && <div className="mt-10 text-center"><button onClick={() => setLimit((n) => n + 12)} className="btn-outline">{L.more}</button></div>}
      </div>
    </>
  );
}
