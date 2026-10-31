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
    return products.filter((p) => [p.name, p.name_en, p.scientific_name, ...p.aliases, ...p.variants.map((v) => v.label)].filter(Boolean).some((x) => (x as string).toLowerCase().includes(s)));
  }, [q, products]);
  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-mute" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.shop.searchPlaceholder} className="input py-3 pl-11 text-base" />
      </div>
      <p className="mt-2 text-xs text-mute">{t.shop.searchHint}</p>
      {q && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {results.length ? results.map((p) => <ProductCard key={p.id} p={p} segment={segment} discountPct={discountPct} locale={locale} quickAdd />) : <p className="col-span-full py-10 text-center text-sm text-mute">{fmt(t.shop.noResults, { q })}</p>}
        </div>
      )}
    </div>
  );
}
