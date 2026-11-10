import type { Variant } from "@/lib/types";

/** Scale a recipe quantity by `factor` and round up to the variant's step, never below its minimum. Fixed items (bottles, packs of sauce) don't scale. */
export function scaleQty(qty: number, variant: Pick<Variant, "min_qty" | "step_qty">, factor: number, fixed: boolean): number {
  if (fixed) return Math.max(variant.min_qty, qty);
  const q = qty * factor;
  const { min_qty: min, step_qty: step } = variant;
  if (q <= min) return min;
  const steps = Math.ceil((q - min) / step - 1e-9);
  return Math.round((min + steps * step) * 1000) / 1000;
}
