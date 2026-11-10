import type { BusinessAccount, Product, Segment } from "@/lib/types";
import { unitPrice } from "@/lib/pricing";
import type { Recipe } from "./recipes";
import type { BundleItem } from "@/components/shop/RecipeBundle";
import { scaleQty } from "./recipe-scale";

/** Resolve a recipe's ingredients against the live catalogue (drops anything no longer sold). */
export function resolveRecipe(recipe: Recipe, products: Product[]): BundleItem[] {
  const out: BundleItem[] = [];
  for (const ing of recipe.ingredients) {
    const product = products.find((p) => p.variants.some((v) => v.id === ing.variant_id));
    const variant = product?.variants.find((v) => v.id === ing.variant_id && v.is_active);
    if (!product || !variant) continue;
    const prep = ing.prep_option_id ? product.prep_options.find((o) => o.id === ing.prep_option_id) ?? null : null;
    out.push({ product, variant, prep, qty: ing.qty, fixed: !!ing.fixed, note: ing.note ?? null });
  }
  return out;
}

/** Estimated price of the whole bundle at its base servings. */
export function recipeTotal(items: BundleItem[], segment: Segment, account: BusinessAccount | null): number {
  return items.reduce((s, it) => s + Math.round((unitPrice(it.variant, segment, account) + (it.prep?.surcharge ?? 0)) * scaleQty(it.qty, it.variant, 1, it.fixed)), 0);
}
