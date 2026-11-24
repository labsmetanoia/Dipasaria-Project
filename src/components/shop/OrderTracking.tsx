"use client";
import { useState, useTransition } from "react";
import { CheckCircle2, Circle, Loader2, MessageCircle, Scale } from "lucide-react";
import type { Order, Settings } from "@/lib/types";
import { formatDate, formatDateTime, rupiah, waLink, qtyUnit } from "@/lib/format";
import { fmt } from "@/lib/i18n/dict";
import { useT } from "@/lib/i18n/client";
import { confirmPaymentAction } from "@/actions/shop";
import { skipBoxOrderAction } from "@/actions/box";
import { TrackView } from "@/components/Track";
import Link from "next/link";
import { msgCustomerAsk, msgCustomerPaid } from "@/lib/wa";
import { PaymentBadge } from "@/components/ui";
import { ReorderButton } from "./ReorderPanel";
import { Emblem } from "@/components/Logo";
import { QrisPay } from "./QrisPay";
import { VaPay } from "./VaPay";
import { ClaimForm } from "./ClaimForm";
import { RatingForm } from "./RatingForm";
import { ShieldCheck } from "lucide-react";

const STEPS: Order["status"][] = ["new", "confirmed", "packing", "delivering", "completed"];

export type ClaimSummary = { id: string; status: "open" | "replace" | "refund" | "declined"; resolution_note: string; refund_amount: number | null; created_at: string };

export function OrderTracking({ order: initial, settings, isNew, qrisAuto, vaBanks = [], claims = [], claimUntil = null, box = null, rating = null }: { order: Order; settings: Settings; isNew?: boolean; qrisAuto?: boolean; /** banks a virtual account can be opened at (empty without a gateway) */ vaBanks?: Array<{ id: string; label: string }>; claims?: ClaimSummary[]; claimUntil?: string | null; /** the rating already given, "open" while the order can still be rated, null otherwise */ rating?: { stars: number; comment: string } | "open" | null; /** this order came from a weekly box; skippable while unpaid and before the cut-off */ box?: { skippable: boolean } | null }) {
 const { t, locale } = useT();
 const [order, setOrder] = useState(initial);
 const [pending, start] = useTransition();
 const [msg, setMsg] = useState<string | null>(null);
 const idx = order.status === "cancelled" ? -1 : STEPS.indexOf(order.status);
 // the amount to pay is known only once the final total exists (weighed orders are re-priced after weighing)
 const finalKnown = order.total_final !== null;
 const total = order.total_final ?? order.total_est;
 const payNow = finalKnown && (order.payment_method === "qris" || order.payment_method === "transfer") && (order.payment_status === "unpaid" || order.payment_status === "awaiting_confirmation") && order.status !== "cancelled";
 const [qrisDone, setQrisDone] = useState<"paid" | "checking" | null>(null);
 // QRIS orders with a gateway: a dynamic QR for the exact amount, confirmed automatically (no "I have paid" step)
 const gatewayQris = Boolean(qrisAuto) && order.payment_method === "qris" && (order.payment_status === "unpaid" || qrisDone !== null);
 // transfer orders with a gateway: a virtual account for the exact amount, also confirmed automatically
 const gatewayVa = vaBanks.length > 0 && order.payment_method === "transfer" && (order.payment_status === "unpaid" || qrisDone !== null);
 const auto = gatewayQris || gatewayVa;
 const paidAuto = (s: "paid" | "checking") => { setQrisDone(s); setOrder((o) => ({ ...o, payment_status: s === "paid" ? "paid" : "awaiting_confirmation", pay_by: null })); };
 const en = locale === "en";
 const skippedByCustomer = order.history.some((h) => h.status === "cancelled" && h.note?.startsWith("Dilewati pelanggan"));
 const skipWeek = () => { if (confirm(en ? "Skip this week's box? Next time's box stays as planned." : "Lewati kotak minggu ini? Kotak berikutnya tetap berjalan.")) start(async () => { const r = await skipBoxOrderAction(order.code, order.phone); if (r.ok) setOrder(r.data); else setMsg(r.error); }); };
 const markPaid = () => start(async () => { const r = await confirmPaymentAction(order.code, order.phone); if (r.ok) { setOrder(r.data); setMsg(t.tracking.paidThanks); } else setMsg(r.error); });
 const unit = (u: Order["items"][number]["unit"]) => t.unit[u];

 return (
    <div className="space-y-5">
      {isNew && <TrackView event="order_placed" />}
      {isNew && <div className="relative flex items-center gap-4 overflow-hidden border-b-4 border-coral-500 bg-ocean-950 px-5 py-5 text-sand-50"><div aria-hidden className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(/brand/pattern-sisik.svg)", backgroundSize: "48px 24px" }} /><Emblem variant="reversed" className="relative h-14 w-14 flex-none" /><div className="relative"><p className="font-display text-[1.6rem] font-bold uppercase leading-none">{t.tracking.received}</p><p className="mt-1.5 text-sm text-sand-50/80">{fmt(t.tracking.receivedBody, { what: order.has_catch_weight ? t.tracking.receivedCatch : t.tracking.receivedStatus, phone: order.phone })}</p></div></div>}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="eyebrow">{t.tracking.orderNo}</p><p className="text-2xl font-bold text-ocean-950">{order.code}</p><p className="mt-1 text-sm text-mute">{formatDate(order.delivery_date, "long", locale)} · {order.slot_label}</p></div>
          <div className="text-right"><PaymentBadge status={order.payment_status} /><p className="mt-1 text-xs text-mute">{t.paymentMethod[order.payment_method]}</p></div>
        </div>
        {box && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 bg-sand-100 px-4 py-3 text-sm">
            <p><b>{en ? "Weekly box" : "Kotak mingguan"}</b> · <Link href="/akun#langganan" className="font-semibold text-gold-ink underline-offset-2 hover:underline">{en ? "manage subscription" : "atur langganan"}</Link></p>
            {box.skippable && order.status !== "cancelled" && order.payment_status === "unpaid" && <button type="button" disabled={pending} onClick={skipWeek} className="btn-outline px-3 py-2 text-[11.5px]">{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} {en ? "Skip this week" : "Lewati minggu ini"}</button>}
          </div>
        )}
        {order.status === "cancelled" && skippedByCustomer ? <p className="mt-5 bg-sand-100 px-4 py-3 text-sm">{en ? "You skipped this week's box. Nothing to pay; your next box stays as planned." : "Kotak minggu ini Anda lewati. Tidak ada yang perlu dibayar; kotak berikutnya tetap berjalan."}</p> : order.status === "cancelled" ? <p className="mt-5 bg-sand-100 px-4 py-3 text-sm">{order.history.some((h) => h.status === "cancelled" && h.note?.startsWith("Dibatalkan otomatis")) ? t.tracking.expired : t.tracking.cancelled}</p> : (
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
          <thead className="text-xs text-mute"><tr><th className="pb-1 text-left font-medium">{t.tracking.product}</th><th className="hidden pb-1 pl-3 text-right font-medium sm:table-cell">{t.tracking.ordered}</th>{order.has_catch_weight && <th className="hidden pb-1 pl-3 text-right font-medium sm:table-cell">{t.tracking.weighed}</th>}<th className="pb-1 text-right font-medium">{t.tracking.price}</th></tr></thead>
          <tbody className="divide-y divide-line">
            {order.items.map((i) => (
              <tr key={i.id}>
                <td className="py-2"><span className="font-semibold">{i.product_name}</span><span className="block text-xs text-mute">{i.variant_label}{i.prep_label ? ` · ${i.prep_label}` : ""} · {rupiah(i.unit_price)}/{unit(i.unit)}</span><span className="mt-0.5 block text-xs font-semibold text-ink sm:hidden">{t.tracking.ordered}: {qtyUnit(i.qty_ordered, i.unit, locale)}{i.qty_final !== null && i.is_catch_weight ? ` · ${t.tracking.weighed}: ${qtyUnit(i.qty_final, i.unit, locale)}` : ""}</span></td>
                <td className="hidden whitespace-nowrap py-2 pl-3 text-right sm:table-cell">{qtyUnit(i.qty_ordered, i.unit, locale)}</td>
                {order.has_catch_weight && <td className="hidden whitespace-nowrap py-2 pl-3 text-right sm:table-cell">{i.qty_final !== null ? qtyUnit(i.qty_final, i.unit, locale) : i.is_catch_weight ? "—" : qtyUnit(i.qty_ordered, i.unit, locale)}</td>}
                <td className="whitespace-nowrap py-2 pl-3 text-right font-bold">{rupiah(i.line_total_final ?? i.line_total_est)}</td>
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

      {(payNow || qrisDone) && (
        <div className="card p-5">
          <h2 className="font-bold text-ocean-950">{fmt(t.tracking.paymentOf, { amount: rupiah(total) })}</h2>
          {order.pay_by && order.payment_status === "unpaid" && <p className="mt-2 bg-warn-50 px-3 py-2 text-sm font-medium text-warn-600">{fmt(t.tracking.payBy, { time: formatDateTime(order.pay_by, locale) })}</p>}
          {gatewayVa ? (
            <VaPay banks={vaBanks} target={{ kind: "order", code: order.code, phone: order.phone }} onDone={paidAuto} fallback={
              <div className="bg-sand-100 px-4 py-3 text-sm"><p>{fmt(t.tracking.transferTo, { amount: rupiah(total) })}</p><p className="mt-1 text-xl font-bold text-ocean-950">{settings.bank_name} {settings.bank_account}</p><p className="text-mute">{fmt(t.tracking.onBehalf, { holder: settings.bank_holder })}</p></div>
            } />
          ) : gatewayQris ? (
            <QrisPay code={order.code} phone={order.phone} onDone={paidAuto} fallback={
              <div className="bg-sand-100 px-4 py-3 text-sm"><p>{fmt(t.tracking.transferTo, { amount: rupiah(total) })}</p><p className="mt-1 text-xl font-bold text-ocean-950">{settings.bank_name} {settings.bank_account}</p><p className="text-mute">{fmt(t.tracking.onBehalf, { holder: settings.bank_holder })}</p></div>
            } />
          ) : order.payment_method === "qris" ? (
            <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {settings.qris_image_url ? <img src={settings.qris_image_url} alt="QRIS" className="h-48 w-48 border border-line object-contain" /> : <div className="flex h-48 w-48 items-center justify-center border border-dashed border-line text-center text-xs text-mute">{t.tracking.qrisMissing}</div>}
              <p className="text-sm text-ink/80">{fmt(t.tracking.qrisHelp, { holder: settings.bank_holder, amount: rupiah(total) })}</p>
            </div>
          ) : (
            <div className="mt-3 bg-sand-100 px-4 py-3 text-sm"><p>{fmt(t.tracking.transferTo, { amount: rupiah(total) })}</p><p className="mt-1 text-xl font-bold text-ocean-950">{settings.bank_name} {settings.bank_account}</p><p className="text-mute">{fmt(t.tracking.onBehalf, { holder: settings.bank_holder })}</p></div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {order.payment_status === "unpaid" && !auto && <button onClick={markPaid} disabled={pending} className="btn-primary">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t.tracking.paid}</button>}
            {!auto && <a href={waLink(settings.whatsapp_number, msgCustomerPaid(order, settings))} target="_blank" rel="noreferrer" className="btn-secondary"><MessageCircle className="h-4 w-4" /> {t.tracking.sendProof}</a>}
          </div>
          {msg && <p className="mt-2 text-sm text-tide-700">{msg}</p>}
        </div>
      )}
      {!finalKnown && order.status !== "cancelled" && <div className=" bg-tide-50 px-5 py-4 text-sm text-tide-700">{t.tracking.catchPending}</div>}
      {order.delivered_at && <div className="card flex items-start gap-3 p-5 text-sm"><CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-success-600" /><p>{locale === "en" ? "Delivered" : "Diterima"} {formatDateTime(order.delivered_at, locale)} WIB{order.delivery_note ? ` · ${order.delivery_note}` : ""}</p></div>}
      {order.gift_message != null && (
        <div className="card p-5 text-sm">
          <p className="font-semibold">🎁 {locale === "en" ? `A gift for ${order.customer_name}` : `Hadiah untuk ${order.customer_name}`}</p>
          <p className="mt-1 text-mute">{order.gift_message ? `${locale === "en" ? "Card" : "Kartu"}: “${order.gift_message}”${order.gift_from ? ` — ${order.gift_from}` : ""}` : locale === "en" ? "No card message." : "Tanpa pesan kartu."} {locale === "en" ? "The parcel carries no prices; updates come to your WhatsApp." : "Paket tidak berisi nota harga; kabar pesanan dikirim ke WhatsApp Anda."}</p>
        </div>
      )}
      {rating && <RatingForm order={order} existing={rating === "open" ? null : rating} claimOpen={Boolean(claimUntil)} />}
      {claims.map((c) => (
        <div key={c.id} className="card flex items-start gap-3 p-5 text-sm">
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-tide-600" />
          <p>{locale === "en" ? "Your report" : "Laporan Anda"} ({formatDateTime(c.created_at, locale)}): <b>{c.status === "open" ? (locale === "en" ? "being reviewed" : "sedang kami periksa") : c.status === "replace" ? (locale === "en" ? "replaced on your next delivery" : "diganti pada pengiriman berikutnya") : c.status === "refund" ? `${locale === "en" ? "refunded" : "dana dikembalikan"}${c.refund_amount ? ` ${rupiah(c.refund_amount)}` : ""}` : (locale === "en" ? "not accepted" : "belum dapat kami ganti")}</b>{c.resolution_note ? ` · ${c.resolution_note}` : ""}</p>
        </div>
      ))}
      {claimUntil && claims.length < 3 && <ClaimForm order={order} until={claimUntil} />}
      <div className="flex flex-wrap gap-2">
        <a href={waLink(settings.whatsapp_number, msgCustomerAsk(order.code, settings))} target="_blank" rel="noreferrer" className="btn-secondary"><MessageCircle className="h-4 w-4" /> {t.tracking.ask}</a>
        <ReorderButton order={order} className="btn-secondary" />
      </div>
    </div>
  );
}
