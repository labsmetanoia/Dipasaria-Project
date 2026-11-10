"use client";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import type { Order } from "@/lib/types";
import { useCart } from "@/store/cart";
import { formatDate, rupiah, qtyUnit } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/dict";

export function ReorderButton({ order, label, className = "btn-accent" }: { order: Order; label?: string; className?: string }) {
 const { t } = useT();
 const replace = useCart((s) => s.replace);
 const router = useRouter();
 return (
    <button className={className} onClick={() => { replace(order.items.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id, qty: i.qty_ordered, prep_option_id: i.prep_option_id }))); router.push("/keranjang"); }}>
      <RotateCcw className="h-4 w-4" /> {label ?? t.shop.reorder}
    </button>
  );
}

export function ReorderPanel({ orders, accountName }: { orders: Order[]; accountName: string }) {
 const { t, locale } = useT();
 const last = orders[0];
 if (!last) return null;
 return (
    <section className="bg-ocean-950 p-6 text-white shadow-float sm:p-8">
      <p className="eyebrow">{fmt(t.shop.reorderGreeting, { name: accountName })}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[2rem]">{t.shop.reorderTitle}</h2>
          <p className="mt-1 text-sm text-white/70">{formatDate(last.delivery_date, "short", locale)} · {fmt(t.shop.items, { n: last.items.length })} · {rupiah(last.total_final ?? last.total_est)}</p>
          <p className="mt-1 line-clamp-1 text-xs text-white/50">{last.items.map((i) => `${i.product_name} ${qtyUnit(i.qty_ordered, i.unit, locale)}`).join(" · ")}</p>
        </div>
        <ReorderButton order={last} />
      </div>
    </section>
  );
}
