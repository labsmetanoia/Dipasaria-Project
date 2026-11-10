import Link from "next/link";
import { Scale } from "lucide-react";
import { getRepo } from "@/lib/data";
import { pickDate } from "@/lib/ops";
import { DateSelector } from "@/components/admin/DateSelector";
import { StatusBadge, PaymentBadge, Empty } from "@/components/ui";
import { formatDateTime, rupiah } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/config";
import type { OrderStatus } from "@/lib/types";

const STATUSES: OrderStatus[] = ["new", "confirmed", "packing", "delivering", "completed", "cancelled"];

export default async function OrdersAdmin({ searchParams }: { searchParams: Promise<{ date?: string; status?: string; q?: string; weigh?: string; unpaid?: string; all?: string }> }) {
  const sp = await searchParams;
  const date = pickDate(sp.date);
  const repo = await getRepo();
  let orders = await repo.listOrders(sp.all ? { q: sp.q, limit: 200 } : { date, status: STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : undefined, q: sp.q });
  if (sp.weigh) orders = orders.filter((o) => o.has_catch_weight && !o.weighed_at && o.status !== "cancelled");
  if (sp.unpaid) orders = orders.filter((o) => o.payment_status !== "paid" && o.status !== "cancelled");
  const base = `/admin/pesanan?date=${date}`;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-ocean-900">Pesanan</h1>
        <DateSelector date={date} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={base} className={`chip ${!sp.status && !sp.weigh && !sp.unpaid && !sp.all ? "chip-on" : ""}`}>Semua hari ini</Link>
        {STATUSES.map((s) => <Link key={s} href={`${base}&status=${s}`} className={`chip ${sp.status === s ? "chip-on" : ""}`}>{STATUS_LABEL[s]}</Link>)}
        <Link href={`${base}&weigh=1`} className={`chip ${sp.weigh ? "chip-on" : ""}`}><Scale className="h-3 w-3" /> Perlu ditimbang</Link>
        <Link href={`${base}&unpaid=1`} className={`chip ${sp.unpaid ? "chip-on" : ""}`}>Belum lunas</Link>
        <form className="ml-auto flex gap-2" action="/admin/pesanan">
          <input type="hidden" name="all" value="1" />
          <input name="q" defaultValue={sp.q} className="input w-48 py-1.5 text-sm" placeholder="Cari kode, nama atau nomor HP (semua tanggal)" />
        </form>
      </div>
      {orders.length === 0 ? <Empty title="Tidak ada pesanan untuk filter ini" /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-sand-100 text-left text-xs text-mute">
              <tr><th className="px-4 py-2 font-medium">Pesanan</th><th className="hidden px-4 py-2 font-medium sm:table-cell">Slot</th><th className="hidden px-4 py-2 font-medium md:table-cell">Item</th><th className="px-4 py-2 text-right font-medium">Total</th><th className="px-4 py-2 font-medium">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-sand-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/pesanan/${o.id}`} className="block">
                      <p className="font-semibold text-ocean-900">{o.customer_name} <span className="ml-1 rounded bg-sand-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-mute">{o.segment === "business" ? "B2B" : "RT"}</span></p>
                      <p className="text-xs text-mute">{o.code} · {formatDateTime(o.created_at)}{sp.all ? ` · kirim ${o.delivery_date}` : ""}</p>
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-mute sm:table-cell">{o.slot_label}<br />{o.area_name.split(" (")[0]}</td>
                  <td className="hidden max-w-xs truncate px-4 py-3 text-xs text-mute md:table-cell">{o.items.map((i) => `${i.product_name} ${i.qty_ordered}${i.unit === "kg" ? "kg" : ""}`).join(", ")}</td>
                  <td className="px-4 py-3 text-right font-semibold">{o.has_catch_weight && !o.weighed_at && <span className="text-xs font-normal text-mute">± </span>}{rupiah(o.total_final ?? o.total_est)}</td>
                  <td className="px-4 py-3"><div className="flex flex-col items-start gap-1"><StatusBadge status={o.status} /><PaymentBadge status={o.payment_status} />{o.has_catch_weight && !o.weighed_at && o.status !== "cancelled" && <span className="text-[10px] text-warn-600">belum ditimbang</span>}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
