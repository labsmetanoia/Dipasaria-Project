"use client";
// "Lengkapi masakan": when the cart holds the main fish of one of our recipes, offer the rest of its ingredients in one
// tap. Built from the recipe data already on the site; no tracking and no server call.
import Link from "next/link";
import { ChefHat, Plus } from "lucide-react";
import type { BusinessAccount, CartLine, Product } from "@/lib/types";
import { recipes } from "@/lib/content/recipes";
import { resolveRecipe } from "@/lib/content/recipe-items";
import { segmentOf, unitPrice } from "@/lib/pricing";
import { rupiah } from "@/lib/format";
import { useCart } from "@/store/cart";
import { useT } from "@/lib/i18n/client";

export function RecipeComplete({ lines, products, account }: { lines: CartLine[]; products: Product[]; account: BusinessAccount | null }) {
  const { locale } = useT();
  const en = locale === "en";
  const add = useCart((s) => s.add);
  const segment = segmentOf(account);
  const inCart = new Set(lines.map((l) => l.variant_id));
  const productsInCart = new Set(lines.map((l) => l.product_id));
  const offers = recipes
    .map((r) => {
      const items = resolveRecipe(r, products).filter((it) => it.product.is_active && it.product.available_today && (!it.variant.business_only || segment === "business"));
      const main = items[0];
      if (!main || !productsInCart.has(main.product.id)) return null;
      const missing = items.slice(1).filter((it) => !inCart.has(it.variant.id) && (it.variant.stock_qty === null || it.variant.stock_qty >= it.variant.min_qty));
      if (!missing.length) return null;
      const priced = missing.map((it) => { const qty = Math.max(it.qty, it.variant.min_qty); return { it, qty, price: Math.round((unitPrice(it.variant, segment, account) + (it.prep?.surcharge ?? 0)) * qty) }; });
      return { r, priced, total: priced.reduce((s, x) => s + x.price, 0) };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 2);
  if (!offers.length) return null;
  return (
    <div className="space-y-3">
      {offers.map(({ r, priced, total }) => (
        <div key={r.slug} className="card border-coral-500/40 p-4">
          <div className="flex items-start gap-3">
            <ChefHat className="mt-0.5 h-5 w-5 flex-none text-gold-ink" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ocean-950">{en ? "Complete the dish" : "Lengkapi masakan"}: <Link href={`/resep/${r.slug}`} className="underline decoration-coral-500 underline-offset-2">{r[en ? "en" : "id"].title}</Link></p>
              <ul className="mt-1 text-sm text-ink/80">{priced.map(({ it, price }) => <li key={it.variant.id}>+ {en && it.product.name_en ? it.product.name_en : it.product.name} <span className="text-mute">{it.variant.label} · {rupiah(price)}</span></li>)}</ul>
              <button onClick={() => priced.forEach(({ it, qty }) => add({ product_id: it.product.id, variant_id: it.variant.id, qty, prep_option_id: it.prep?.id ?? null }))} className="btn-secondary mt-3 px-3 py-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> {en ? `Add all (${rupiah(total)})` : `Tambah semua (${rupiah(total)})`}</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
