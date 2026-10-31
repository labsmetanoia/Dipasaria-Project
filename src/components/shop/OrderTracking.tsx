"use client";
import { useState, useTransition } from "react";
import { CheckCircle2, Circle, Loader2, MessageCircle, Scale } from "lucide-react";
import type { Order, Settings } from "@/lib/types";
import { formatDate, formatDateTime, rupiah, waLink } from "@/lib/format";
import { fmt } from "@/lib/i18n/dict";
import { useT } from "@/lib/i18n/client";
import { confirmPaymentAction } from "@/actions/shop";
import { msgCustomerAsk, msgCustomerPaid } from "@/lib/wa";
import { PaymentBadge } from "@/components/ui";
import { ReorderButton } from "./ReorderPanel";

const STEPS: Order["status"][] = ["new", "confirmed", "packing", "delivering", "completed"];

export function OrderTracking({ order: initial, settings, isNew }: { order: Order; settings: Settings; isNew?: boolean }) {
  const { t, locale } = useT();
  const [order, setOrder] = useState(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const idx = order.status === "cancelled" ? -1 : STEPS.indexOf(order.status);
  const finalKnown = !order.has_catch_weight || order.weighed_at !== null;
  const total = order.total_final ?? order.total_est;
  const payNow = finalKnown && (order.payment_method === "qris" || order.payment_method === "transfer") && order.payment_status !== "paid" && order.status !== "cancelled";
  const markPaid = () => start(async () => { const r = await confirmPaymentAction(order.code, order.phone); if (r.ok) { setOrder(r.data); setMsg(t.tracking.paidThanks); } else setMsg(r.error); });
  const unit = (u: Order["items"][number]["unit"]) => t.unit[u];

  return (
    <div className="space-y-5">
      {isNew && <div className="rounded-2xl bg-success-50 px-5 py-4 text-success-600"><p className="font-bold">{t.tracking.received}</p><p className="mt-0.5 text-sm">{fmt(t.tracking.receivedBody, { what: order.has_catch_weight ? t.tracking.receivedCatch : t.tracking.receivedStatus, phone: order.phone })}</p></div>}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="eyebrow">{t.tracking.orderNo}</p><p className="text-2xl font-bold text-ocean-950">{order.code}</p><p className="mt-1 text-sm text-mute">{formatDate(order.delivery_date, "long", locale)} · {order.slot_label}</p></div>
          <div className="text-right"><PaymentBadge status={order.payment_status} /><p className="mt-1 text-xs text-mute">{t.paymentMethod[order.payment_method]}</p></div>
        </div>
        {order.status === "cancelled" ? <p className="mt-5 rounded-xl bg-sand-100 px-4 py-3 text-sm">{t.tracking.cancelled}</p> : (
          <ol className="mt-6 grid grid-cols-5 gap-1">
            {STEPS.map((s, i) => {
              const done = i <= idx;
              const at = order.history.filter((h) => h.status === s).at(-1)?.at;
              return (
                <li key={s} className="flex flex-col items-center text-center">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full ${done ? "bg-tide-600 text-white" : "bg-sand-200 text-mute"}`}>{done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-3 w-3" />}</div>
                  <p className={`mt-1.5 text-[11px] font-bold ${done ? "text-ocean-950" : "text-mute"}`}>{t.status[s]}</p>
                  {at && <p className="text-[10px] text-mute">{formatDateTime(at, locale)}</p>}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between"><h2 className="font-bold text-ocean-950">{t.tracking.details}</h2>{order.has_catch_weight && <span className="inline-flex items-center gap-1 text-xs text-mute"><Scale className="h-3.5 w-3.5" />{order.weighed_at ? t.tracking.weighedDone : t.tracking.weighedPending}</span>}</div>
        <table className="mt-3 w-full text-sm">
          <thead className="text-xs text-mute"><tr><th className="pb-1 text-left font-medium">{t.tracking.product}</th><th className="pb-1 text-right font-medium">{t.tracking.ordered}</th>{order.has_catch_weight && <th className="pb-1 text-right font-medium">{t.tracking.weighed}</th>}<th className="pb-1 text-right font-medium">{t.tracking.price}</th></tr></thead>
          <tbody className="divide-y divide-line">
            {order.items.map((i) => (
              <tr key={i.id}>
                <td className="py-2"><span className="font-semibold">{i.product_name}</span><span className="block text-xs text-mute">{i.variant_label}{i.prep_label ? ` · ${i.prep_label}` : ""} · {rupiah(i.unit_price)}/{unit(i.unit)}</span></td>
                <td className="py-2 text-right">{i.qty_ordered} {unit(i.unit)}</td>
                {order.has_catch_weight && <td className="py-2 text-right">{i.qty_final !== null ? `${i.qty_final} ${unit(i.unit)}` : i.is_catch_weight ? "—" : `${i.qty_ordered} ${unit(i.unit)}`}</td>}
                <td className="py-2 text-right font-bold">{rupiah(i.line_total_final ?? i.line_total_est)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-mute">{t.cart.subtotal}</dt><dd>{rupiah(order.subtotal_final ?? order.subtotal_est)}</dd></div>
          {order.discount > 0 && <div className="flex justify-between text-success-600"><dt>{t.checkout.discount} {order.promo_code}</dt><dd>−{rupiah(order.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-mute">{t.cart.shipping}</dt><dd>{order.delivery_fee ? rupiah(order.delivery_fee) : t.common.free}</dd></div>
          <div className="flex justify-between pt-1 text-base"><dt className="font-bold">{t.shop.total} {finalKnown ? "" : <span className="text-xs font-normal text-mute">({t.common.estimated})</span>}</dt><dd className="text-xl font-bold text-ocean-950">{rupiah(total)}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-mute">{t.tracking.shipTo}: {order.address} ({order.area_name}){order.customer_note ? ` · ${t.tracking.note}: ${order.customer_note}` : ""}</p>
      </div>

      {payNow && (
        <div className="card p-5">
          <h2 className="font-bold text-ocean-950">{fmt(t.tracking.paymentOf, { amount: rupiah(total) })}</h2>
          {order.payment_method === "qris" ? (
            <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {settings.qris_image_url ? <img src={settings.qris_image_url} alt="QRIS" className="h-48 w-48 rounded-xl border border-line object-contain" /> : <div className="flex h-48 w-48 items-center justify-center rounded-xl border border-dashed border-line text-center text-xs text-mute">{t.tracking.qrisMissing}</div>}
              <p className="text-sm text-ink/80">{fmt(t.tracking.qrisHelp, { holder: settings.bank_holder, amount: rupiah(total) })}</p>
            </div>
          ) : (
            <div className="mt-3 rounded-xl bg-sand-100 px-4 py-3 text-sm"><p>{fmt(t.tracking.transferTo, { amount: rupiah(total) })}</p><p className="mt-1 text-xl font-bold text-ocean-950">{settings.bank_name} {settings.bank_account}</p><p className="text-mute">{fmt(t.tracking.onBehalf, { holder: settings.bank_holder })}</p></div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {order.payment_status === "unpaid" && <button onClick={markPaid} disabled={pending} className="btn-primary">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t.tracking.paid}</button>}
            <a href={waLink(settings.whatsapp_number, msgCustomerPaid(order, settings))} target="_blank" rel="noreferrer" className="btn-secondary"><MessageCircle className="h-4 w-4" /> {t.tracking.sendProof}</a>
          </div>
          {msg && <p className="mt-2 text-sm text-tide-700">{msg}</p>}
        </div>
      )}
      {!finalKnown && order.status !== "cancelled" && <div className="rounded-2xl bg-tide-50 px-5 py-4 text-sm text-tide-700">{t.tracking.catchPending}</div>}
      <div className="flex flex-wrap gap-2">
        <a href={waLink(settings.whatsapp_number, msgCustomerAsk(order.code, settings))} target="_blank" rel="noreferrer" className="btn-secondary"><MessageCircle className="h-4 w-4" /> {t.tracking.ask}</a>
        <ReorderButton order={order} className="btn-secondary" />
      </div>
    </div>
  );
}
