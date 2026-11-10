"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Product, Segment } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { useT } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/dict";

export function SearchBox({ products, segment, discountPct }: { products: Product[]; segment: Segment; discountPct?: number }) {
 const { t, locale } = useT();
 const [q, setQ] = useState("");
 const results = useMemo(() => {
 const s = q.trim().toLowerCase();
 if (!s) return [];
 return products.filter((p) => [p.name, p.name_en, p.scientific_name, p.description, ...p.aliases, ...p.variants.map((v) => v.label)].filter(Boolean).some((x) => (x as string).toLowerCase().includes(s)));
  }, [q, products]);
 return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-mute" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.shop.searchPlaceholder} className="input py-3 pl-11 text-base" />
      </div>
      <p className="mt-2 text-xs text-mute">{t.shop.searchHint}</p>
      {!q && (
        <div className="mt-6">
          <p className="eyebrow">{locale === "en" ? "Popular searches" : "Pencarian populer"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(locale === "en" ? ["Snapper", "Prawns", "Salmon", "Squid", "Chicken", "Eggs", "Box"] : ["Kakap", "Udang", "Salmon", "Cumi", "Kerapu", "Ayam", "Telur", "Paket"]).map((x) => (
              <button key={x} type="button" onClick={() => setQ(x)} className="border border-line bg-white px-4 py-2 font-sans text-[12px] font-bold uppercase tracking-[0.12em] hover:border-ocean-950">{x}</button>
            ))}
          </div>
        </div>
      )}
      {q && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {results.length ? results.map((p) => <ProductCard key={p.id} p={p} segment={segment} discountPct={discountPct} locale={locale} />) : <p className="col-span-full py-10 text-center text-sm text-mute">{fmt(t.shop.noResults, { q })}</p>}
        </div>
      )}
    </div>
  );
}
