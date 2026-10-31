"use client";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import type { Order } from "@/lib/types";
import { useCart } from "@/store/cart";
import { formatDate, rupiah } from "@/lib/format";

export function ReorderButton({ order, label = "Pesan lagi", className = "btn-accent" }: { order: Order; label?: string; className?: string }) {
  const replace = useCart((s) => s.replace);
  const router = useRouter();
  return (
    <button
      className={className}
      onClick={() => {
        replace(order.items.map((i) => ({ product_id: i.product_id, variant_id: i.variant_id, qty: i.qty_ordered, prep_option_id: i.prep_option_id })));
        router.push("/keranjang");
      }}
    >
      <RotateCcw className="h-4 w-4" /> {label}
    </button>
  );
}

export function ReorderPanel({ orders, accountName }: { orders: Order[]; accountName: string }) {
  const last = orders[0];
  if (!last) return null;
  return (
    <section className="rounded-2xl bg-ocean-900 p-5 text-white shadow-soft">
      <p className="eyebrow text-tide-400">Selamat malam, {accountName}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Ulangi pesanan terakhir</h2>
          <p className="mt-1 text-sm text-white/70">{formatDate(last.delivery_date, "short")} · {last.items.length} item · {rupiah(last.total_final ?? last.total_est)}</p>
          <p className="mt-1 line-clamp-1 text-xs text-white/50">{last.items.map((i) => `${i.product_name} ${i.qty_ordered} ${i.unit}`).join(" · ")}</p>
        </div>
        <ReorderButton order={last} />
      </div>
    </section>
  );
}
