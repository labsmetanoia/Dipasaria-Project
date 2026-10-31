"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Order } from "@/lib/types";
import { useCart } from "@/store/cart";
import { lookupOrdersAction } from "@/actions/shop";
import { formatDate, rupiah } from "@/lib/format";
import { fmt } from "@/lib/i18n/dict";
import { useT } from "@/lib/i18n/client";
import { StatusBadge, PaymentBadge } from "@/components/ui";

export function MyOrders({ accountOrders }: { accountOrders: Order[] }) {
 const { t, locale } = useT();
 const refs = useCart((s) => s.orders);
 const [orders, setOrders] = useState<Order[] | null>(null);
 useEffect(() => { if (!refs.length) { setOrders([]); return; } lookupOrdersAction(refs.map((r) => ({ code: r.code, phone: r.phone }))).then(setOrders); }, [refs]);
 const list = [...accountOrders, ...(orders ?? []).filter((o) => !accountOrders.some((a) => a.id === o.id))];
 if (orders === null && !accountOrders.length) return <div className="h-24 animate-pulse bg-sand-100" />;
 if (!list.length) return null;
 return (
    <section>
      <h2 className="mb-3 font-bold text-ocean-950">{t.tracking.yourOrders}</h2>
      <ul className="space-y-2">
        {list.map((o) => (
          <li key={o.id}>
            <Link href={`/pesanan/${o.code}?hp=${o.phone}`} className="card flex items-center justify-between gap-3 p-4 hover:border-coral-500">
              <div className="min-w-0"><p className="font-bold text-ocean-950">{o.code}</p><p className="truncate text-xs text-mute">{formatDate(o.delivery_date, "short", locale)} · {o.slot_label} · {fmt(t.shop.items, { n: o.items.length })}</p></div>
              <div className="text-right"><p className="text-sm font-bold">{rupiah(o.total_final ?? o.total_est)}</p><div className="mt-1 flex justify-end gap-1"><StatusBadge status={o.status} /><PaymentBadge status={o.payment_status} /></div></div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
