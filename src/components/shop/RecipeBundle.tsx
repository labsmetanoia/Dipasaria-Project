"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Minus, Plus, ShoppingBag, Users } from "lucide-react";
import type { BusinessAccount, PrepOption, Product, Segment, Variant } from "@/lib/types";
import { unitPrice } from "@/lib/pricing";
import { qtyUnit, rupiah } from "@/lib/format";
import { pick } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { useCart } from "@/store/cart";
import { ProductArt } from "@/components/ProductArt";
import { scaleQty } from "@/lib/content/recipe-scale";

export interface BundleItem {
  product: Product;
  variant: Variant;
  prep: PrepOption | null;
  qty: number;
  fixed: boolean;
  note: { id: string; en: string } | null;
}

const scaled = (item: BundleItem, factor: number) => scaleQty(item.qty, item.variant, factor, item.fixed);

export function RecipeBundle({ items, baseServings, title, segment, account }: { items: BundleItem[]; baseServings: number; title: string; segment: Segment; account: BusinessAccount | null }) {
  const { t, locale } = useT();
  const en = locale === "en";
  const { add, notify } = useCart();
  const [servings, setServings] = useState(baseServings);
  const [off, setOff] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);
  const factor = servings / baseServings;
  const rows = useMemo(() => items.map((it) => {
    const q = scaled(it, factor);
    const price = unitPrice(it.variant, segment, account) + (it.prep?.surcharge ?? 0);
    const available = it.product.available_today && (segment === "business" || !it.variant.business_only);
    return { it, q, line: Math.round(price * q), available, key: it.variant.id + (it.prep?.id ?? "") };
  }), [items, factor, segment, account]);
  const chosen = rows.filter((r) => r.available && !off.has(r.key));
  const total = chosen.reduce((s, r) => s + r.line, 0);
  const hasWeighed = chosen.some((r) => r.it.product.is_catch_weight);

  const addAll = () => {
    chosen.forEach((r) => add({ product_id: r.it.product.id, variant_id: r.it.variant.id, qty: r.q, prep_option_id: r.it.prep?.id ?? null }));
    notify(en ? `${chosen.length} items for ${title}` : `${chosen.length} bahan untuk ${title}`);
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  };

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow">{en ? "Ingredients from Dipasaria" : "Bahan dari Dipasaria"}</p>
        <div className="flex items-center gap-2" aria-label={en ? "Servings" : "Porsi"}>
          <Users className="h-4 w-4 text-mute" />
          <button type="button" onClick={() => setServings((s) => Math.max(1, s - 1))} className="flex h-8 w-8 items-center justify-center border border-line hover:border-ocean-950" aria-label={en ? "Fewer servings" : "Kurangi porsi"}><Minus className="h-3.5 w-3.5" /></button>
          <span className="min-w-[4.5rem] text-center font-sans text-[13px] font-bold">{servings} {en ? "people" : "orang"}</span>
          <button type="button" onClick={() => setServings((s) => Math.min(20, s + 1))} className="flex h-8 w-8 items-center justify-center border border-line hover:border-ocean-950" aria-label={en ? "More servings" : "Tambah porsi"}><Plus className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {rows.map((r) => {
          const on = r.available && !off.has(r.key);
          const name = en && r.it.product.name_en ? r.it.product.name_en : r.it.product.name;
          return (
            <li key={r.key} className={`flex items-center gap-3 py-3 ${on ? "" : "opacity-50"}`}>
              <input type="checkbox" className="h-4 w-4 flex-none accent-black" checked={on} disabled={!r.available} aria-label={name}
                onChange={() => setOff((s) => { const n = new Set(s); if (n.has(r.key)) n.delete(r.key); else n.add(r.key); return n; })} />
              <Link href={`/belanja/produk/${r.it.product.slug}`} className="h-12 w-12 flex-none overflow-hidden"><ProductArt icon={r.it.product.icon} storage={r.it.product.storage_class} image={r.it.product.image_url} alt={name} /></Link>
              <div className="min-w-0 flex-1">
                <Link href={`/belanja/produk/${r.it.product.slug}`} className="block truncate font-display text-[16px] font-bold uppercase leading-tight hover:text-gold-ink">{name}</Link>
                <p className="truncate font-sans text-[12px] text-mute">{pick(locale, r.it.variant.label, r.it.variant.label_en)}{r.it.prep ? ` · ${pick(locale, r.it.prep.label, r.it.prep.label_en).split(" (")[0]}` : ""}{r.it.note ? ` · ${pick(locale, r.it.note.id, r.it.note.en)}` : ""}</p>
                {!r.available && <p className="font-sans text-[11px] font-bold text-gold-ink">{t.shop.soldOut}</p>}
              </div>
              <div className="text-right">
                <p className="whitespace-nowrap font-sans text-[12.5px] font-semibold">{qtyUnit(r.q, r.it.variant.unit, locale)}</p>
                <p className="whitespace-nowrap font-sans text-[12px] text-mute">{r.it.product.is_catch_weight ? "± " : ""}{rupiah(r.line)}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex items-baseline justify-between">
        <span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-mute">{hasWeighed ? (en ? "Estimated total" : "Perkiraan total") : "Total"}</span>
        <span className="font-display text-[2rem] font-bold leading-none">{rupiah(total)}</span>
      </div>
      {hasWeighed && <p className="mt-1 font-sans text-[11.5px] text-mute">{en ? "Weighed items are billed on the final weight." : "Produk yang ditimbang ditagih sesuai berat akhir."}</p>}
      <button type="button" onClick={addAll} disabled={!chosen.length} className="btn-accent mt-5 w-full py-4 text-[13px]">
        {done ? <><Check className="h-4 w-4" /> {en ? "Added to cart" : "Masuk keranjang"}</> : <><ShoppingBag className="h-4 w-4" /> {en ? `Add ${chosen.length} items to cart` : `Tambah ${chosen.length} bahan ke keranjang`}</>}
      </button>
      <p className="mt-2 text-center font-sans text-[11.5px] text-mute">{en ? "Untick anything you already have at home." : "Hilangkan centang untuk bahan yang sudah Anda punya."}</p>
    </div>
  );
}
