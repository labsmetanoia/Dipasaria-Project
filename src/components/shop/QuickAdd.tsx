"use client";
import { Plus, Check } from "lucide-react";
import { useState } from "react";
import type { Product, Variant } from "@/lib/types";
import { useCart } from "@/store/cart";

export function QuickAdd({ product, variant, disabled }: { product: Product; variant: Variant; disabled?: boolean }) {
  const { add, notify } = useCart();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`Tambah ${product.name}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        add({ product_id: product.id, variant_id: variant.id, qty: variant.min_qty, prep_option_id: null });
        notify(product.name);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
      className={`flex h-9 w-9 items-center justify-center rounded-full shadow-soft transition active:scale-95 disabled:opacity-40 ${done ? "bg-success-600 text-white" : "bg-ocean-950 text-white hover:bg-coral-500"}`}
    >
      {done ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
    </button>
  );
}
