"use client";
import { ShoppingBag, Check } from "lucide-react";
import { useState } from "react";
import type { Product, Variant } from "@/lib/types";
import { useCart } from "@/store/cart";
import { useT } from "@/lib/i18n/client";

export function QuickAdd({ product, variant, disabled }: { product: Product; variant: Variant; disabled?: boolean }) {
 const { locale } = useT();
 const { add, notify } = useCart();
 const [done, setDone] = useState(false);
 return (
    <button
 type="button"
 disabled={disabled}
 aria-label={`+ ${product.name}`}
 onClick={(e) => { e.preventDefault(); add({ product_id: product.id, variant_id: variant.id, qty: variant.min_qty, prep_option_id: null }); notify(locale === "en" && product.name_en ? product.name_en : product.name); setDone(true); setTimeout(() => setDone(false), 1200); }}
 className={`flex h-10 w-10 items-center justify-center transition active:scale-95 disabled:opacity-40 ${done ? "bg-success-600 text-white" : "bg-coral-500 text-ocean-950 hover:bg-ocean-950 hover:text-coral-500"}`}
    >
      {done ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
    </button>
  );
}
