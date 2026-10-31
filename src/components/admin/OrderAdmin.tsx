"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, MessageCircle, Scale, XCircle, ExternalLink, Save } from "lucide-react";
import type { Order, OrderStatus, Settings } from "@/lib/types";
import { setOrderStatusAction, setPaymentStatusAction, weighOrderAction, updateInternalNoteAction } from "@/actions/admin";
import { msgFinalInvoice, msgOrderConfirmed, msgOutForDelivery, waTo } from "@/lib/wa";
import { formatDate, formatDateTime, rupiah } from "@/lib/format";
import { PAYMENT_LABEL, STATUS_LABEL, UNIT_LABEL, TERMS_LABEL } from "@/lib/config";
import { StatusBadge, PaymentBadge, StorageBadge } from "@/components/ui";

const FLOW: OrderStatus[] = ["new", "confirmed", "packing", "delivering", "completed"];

export function OrderAdmin({ order: initial, settings, accountTerms }: { order: Order; settings: Settings; accountTerms?: string }) {
  const [order, setOrder] = useState(initial);
  const [weights, setWeights] = useState<Record<string, string>>(() => Object.fromEntries(order.items.filter((i) => i.is_catch_weight).map((i) => [i.id, String(i.qty_final ?? i.qty_ordered)])));
  const [note, setNote] = useState(order.internal_note);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const next = FLOW[FLOW.indexOf(order.status) + 1];
  const needsWeigh = order.has_catch_weight && !order.weighed_at;

  const run = (fn: () => Promise<{ ok: true; data: Order } | { ok: false; error: string }>) =>
    start(async () => {
      setErr(null);
      const r = await fn();
      if (r.ok) setOrder(r.data); else setErr(r.error);
    });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/pesanan" className="inline-flex items-center gap-1 text-sm text-mute hover:text-ocean-900"><ArrowLeft className="h-4 w-4" /> Pesanan</Link>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ocean-900">{order.code}</h1>
          <p className="text-sm text-mute">{formatDate(order.delivery_date)} · {order.slot_label} · dibuat {formatDateTime(order.created_at)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2"><StatusBadge status={order.status} /><PaymentBadge status={order.payment_status} /><span className="rounded bg-sand-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-mute">{order.segment === "business" ? "B2B" : "Rumah tangga"}</span></div>
      </div>

      {err && <div className="rounded-xl bg-coral-50 px-4 py-3 text-sm text-coral-700">{err}</div>}

      {/* Status actions */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          {order.status !== "cancelled" && order.status !== "completed" && next && (
            <button disabled={pending} onClick={() => run(() => setOrderStatusAction(order.id, next))} className="btn-primary">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Tandai {STATUS_LABEL[next].toLowerCase()}</button>
          )}
          {order.status !== "cancelled" && order.status !== "completed" && (
            <button disabled={pending} onClick={() => { if (confirm("Batalkan pesanan ini? Stok dikembalikan.")) run(() => setOrderStatusAction(order.id, "cancelled", "Dibatalkan dari back-office")); }} className="btn-secondary text-coral-600"><XCircle className="h-4 w-4" /> Batalkan</button>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            <a className="btn-secondary" target="_blank" rel="noreferrer" href={waTo(order.phone, msgOrderConfirmed(order, settings))}><MessageCircle className="h-4 w-4" /> WA konfirmasi</a>
            <a className={`btn-secondary ${needsWeigh ? "opacity-50" : ""}`} target="_blank" rel="noreferrer" href={waTo(order.phone, msgFinalInvoice(order, settings))}><MessageCircle className="h-4 w-4" /> WA invoice final</a>
            <a className="btn-secondary" target="_blank" rel="noreferrer" href={waTo(order.phone, msgOutForDelivery(order, settings))}><MessageCircle className="h-4 w-4" /> WA sedang dikirim</a>
          </div>
        </div>
        <ol className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-mute">
          {order.history.map((h, i) => <li key={i}><b className="text-ink/70">{h.status === "paid" ? "Lunas" : h.status === "weighed" ? "Ditimbang" : STATUS_LABEL[h.status]}</b> {formatDateTime(h.at)}{h.note ? ` · ${h.note}` : ""}</li>)}
        </ol>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Items & weighing */}
        <div className="card p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ocean-900">Item{order.has_catch_weight && <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-mute"><Scale className="h-3.5 w-3.5" />{order.weighed_at ? `ditimbang ${formatDateTime(order.weighed_at)}` : "belum ditimbang"}</span>}</h2>
          </div>
          <table className="mt-3 w-full text-sm">
            <thead className="text-xs text-mute"><tr><th className="pb-1 text-left font-medium">Produk</th><th className="pb-1 text-right font-medium">Dipesan</th>{order.has_catch_weight && <th className="pb-1 text-right font-medium">Timbang</th>}<th className="pb-1 text-right font-medium">Total</th></tr></thead>
            <tbody className="divide-y divide-line">
              {order.items.map((i) => (
                <tr key={i.id}>
                  <td className="py-2"><p className="font-medium">{i.product_name} <span className="text-mute">{i.variant_label}</span></p><p className="flex flex-wrap items-center gap-1 text-xs text-mute">{i.prep_label && <span className="rounded bg-warn-50 px-1.5 py-0.5 font-semibold text-warn-600">{i.prep_label}</span>}<StorageBadge storage={i.storage_class} /> {rupiah(i.unit_price)}/{UNIT_LABEL[i.unit]} · modal {rupiah(i.unit_cost)}</p></td>
                  <td className="py-2 text-right">{i.qty_ordered} {UNIT_LABEL[i.unit]}</td>
                  {order.has_catch_weight && (
                    <td className="py-2 text-right">
                      {i.is_catch_weight && order.status !== "cancelled" ? (
                        <input type="number" step="0.01" min="0" inputMode="decimal" value={weights[i.id] ?? ""} onChange={(e) => setWeights({ ...weights, [i.id]: e.target.value })} className="input w-24 py-1 text-right" />
                      ) : <span className="text-mute">{i.qty_final ?? i.qty_ordered} {UNIT_LABEL[i.unit]}</span>}
                    </td>
                  )}
                  <td className="py-2 text-right font-semibold">{rupiah(i.line_total_final ?? i.line_total_est)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {order.has_catch_weight && order.status !== "cancelled" && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sand-100 px-4 py-3">
              <p className="text-xs text-mute">Isi berat hasil timbangan (kg). Harga, promo dan ongkir dihitung ulang di server.</p>
              <button disabled={pending} onClick={() => run(() => weighOrderAction(order.id, Object.entries(weights).map(([item_id, v]) => ({ item_id, qty_final: Number(v) }))))} className="btn-primary"><Scale className="h-4 w-4" /> Simpan timbangan & hitung ulang</button>
            </div>
          )}
          <dl className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-mute">Subtotal {order.subtotal_final === null && "(perkiraan)"}</dt><dd>{rupiah(order.subtotal_final ?? order.subtotal_est)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between text-success-600"><dt>Promo {order.promo_code}</dt><dd>−{rupiah(order.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-mute">Ongkir</dt><dd>{order.delivery_fee ? rupiah(order.delivery_fee) : "Gratis"}</dd></div>
            <div className="flex justify-between text-base"><dt className="font-semibold">Total</dt><dd className="font-display text-xl font-semibold text-ocean-900">{rupiah(order.total_final ?? order.total_est)}</dd></div>
            <div className="flex justify-between text-xs text-mute"><dt>Est. laba kotor</dt><dd>{rupiah(order.items.reduce((s, i) => s + (i.line_total_final ?? i.line_total_est) - i.unit_cost * (i.qty_final ?? i.qty_ordered), 0) - order.discount)}</dd></div>
          </dl>
        </div>

        {/* Customer & payment */}
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="font-semibold text-ocean-900">Pelanggan</h2>
            <p className="mt-2 font-medium">{order.customer_name}</p>
            <a href={`https://wa.me/${order.phone}`} target="_blank" rel="noreferrer" className="text-sm text-tide-600">+{order.phone}</a>
            <p className="mt-2 text-sm text-ink/80">{order.address}</p>
            <p className="text-xs text-mute">{order.area_name}</p>
            {order.maps_url && <a href={order.maps_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-tide-600">Buka Maps <ExternalLink className="h-3 w-3" /></a>}
            {order.customer_note && <p className="mt-3 rounded-lg bg-warn-50 px-3 py-2 text-sm text-warn-600">“{order.customer_note}”</p>}
            {accountTerms && <p className="mt-2 text-xs text-mute">Akun: {accountTerms}</p>}
          </div>
          <div className="card p-4">
            <h2 className="font-semibold text-ocean-900">Pembayaran</h2>
            <p className="mt-1 text-sm">{PAYMENT_LABEL[order.payment_method]} · <PaymentBadge status={order.payment_status} /></p>
            <div className="mt-3 flex flex-wrap gap-2">
              {order.payment_status !== "paid" && order.status !== "cancelled" && <button disabled={pending} onClick={() => run(() => setPaymentStatusAction(order.id, "paid"))} className="btn-primary"><Check className="h-4 w-4" /> Tandai lunas</button>}
              {order.payment_status === "paid" && <button disabled={pending} onClick={() => run(() => setPaymentStatusAction(order.id, "unpaid"))} className="btn-secondary">Batalkan lunas</button>}
            </div>
            <p className="mt-2 text-xs text-mute">Tandai lunas hanya setelah dana terlihat di aplikasi bank / QRIS merchant, bukan dari tangkapan layar.</p>
          </div>
          <div className="card p-4">
            <h2 className="font-semibold text-ocean-900">Catatan internal</h2>
            <textarea className="input mt-2" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Hanya terlihat di back-office" />
            <button disabled={pending} onClick={() => run(() => updateInternalNoteAction(order.id, note))} className="btn-secondary mt-2 text-sm"><Save className="h-4 w-4" /> Simpan</button>
          </div>
          {order.account_id && accountTerms && <p className="text-xs text-mute">Tempo akun: {TERMS_LABEL[accountTerms] ?? accountTerms}</p>}
        </div>
      </div>
    </div>
  );
}
