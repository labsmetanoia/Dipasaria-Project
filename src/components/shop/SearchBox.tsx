"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Product, Segment } from "@/lib/types";
import { ProductCard } from "./ProductCard";

export function SearchBox({ products, segment, discountPct }: { products: Product[]; segment: Segment; discountPct?: number }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return products.filter((p) => [p.name, p.name_en, p.scientific_name, ...p.aliases, ...p.variants.map((v) => v.label)].filter(Boolean).some((t) => (t as string).toLowerCase().includes(s)));
  }, [q, products]);
  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-mute" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kakap, bambangan, udang, nugget…" className="input py-3 pl-11 text-base" />
      </div>
      <p className="mt-2 text-xs text-mute">Nama Indonesia, Inggris, ilmiah atau nama pasar (bambangan menemukan kakap merah).</p>
      {q && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {results.length ? results.map((p) => <ProductCard key={p.id} p={p} segment={segment} discountPct={discountPct} />) : <p className="col-span-full py-10 text-center text-sm text-mute">Tidak ada hasil untuk “{q}”.</p>}
        </div>
      )}
    </div>
  );
}
