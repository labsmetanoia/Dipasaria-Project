"use client";
import { useState, useTransition } from "react";
import { CheckCircle2, Circle, Loader2, MessageCircle, Scale } from "lucide-react";
import type { Order, Settings } from "@/lib/types";
import { PAYMENT_LABEL, STATUS_LABEL, UNIT_LABEL } from "@/lib/config";
import { formatDate, formatDateTime, rupiah, waLink } from "@/lib/format";
import { confirmPaymentAction } from "@/actions/shop";
import { msgCustomerAsk, msgCustomerPaid } from "@/lib/wa";
import { PaymentBadge } from "@/components/ui";
import { ReorderButton } from "./ReorderPanel";

const STEPS: Order["status"][] = ["new", "confirmed", "packing", "delivering", "completed"];

export function OrderTracking({ order: initial, settings, isNew }: { order: Order; settings: Settings; isNew?: boolean }) {
  const [order, setOrder] = useState(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const idx = order.status === "cancelled" ? -1 : STEPS.indexOf(order.status);
  const finalKnown = !order.has_catch_weight || order.weighed_at !== null;
  const total = order.total_final ?? order.total_est;
  const payNow = finalKnown && (order.payment_method === "qris" || order.payment_method === "transfer") && order.payment_status !== "paid" && order.status !== "cancelled";

  const markPaid = () =>
    start(async () => {
      const r = await confirmPaymentAction(order.code, order.phone);
      if (r.ok) { setOrder(r.data); setMsg("Terima kasih. Kami cek di aplikasi bank dan konfirmasi via WhatsApp."); }
      else setMsg(r.error);
    });

  return (
    <div className="space-y-5">
      {isNew && (
        <div className="rounded-2xl bg-success-50 px-5 py-4 text-success-600">
          <p className="font-semibold">Pesanan diterima. Terima kasih!</p>
          <p className="mt-0.5 text-sm">Simpan nomor pesanan ini. Konfirmasi dan {order.has_catch_weight ? "invoice final setelah penimbangan " : "status pengiriman "}dikirim via WhatsApp ke {order.phone}.</p>
        </div>
      )}

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Nomor pesanan</p>
            <p className="font-display text-2xl font-semibold text-ocean-900">{order.code}</p>
            <p className="mt-1 text-sm text-mute">{formatDate(order.delivery_date)} · {order.slot_label}</p>
          </div>
          <div className="text-right">
            <PaymentBadge status={order.payment_status} />
            <p className="mt-1 text-xs text-mute">{PAYMENT_LABEL[order.payment_method]}</p>
          </div>
        </div>

        {order.status === "cancelled" ? (
          <p className="mt-5 rounded-xl bg-sand-100 px-4 py-3 text-sm">Pesanan ini dibatalkan.</p>
        ) : (
          <ol className="mt-6 grid grid-cols-5 gap-1">
            {STEPS.map((s, i) => {
              const done = i <= idx;
              const at = order.history.filter((h) => h.status === s).at(-1)?.at;
              return (
                <li key={s} className="flex flex-col items-center text-center">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full ${done ? "bg-tide-600 text-white" : "bg-sand-200 text-mute"}`}>{done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-3 w-3" />}</div>
                  <p className={`mt-1.5 text-[11px] font-semibold ${done ? "text-ocean-900" : "text-mute"}`}>{STATUS_LABEL[s]}</p>
                  {at && <p className="text-[10px] text-mute">{formatDateTime(at)}</p>}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ocean-900">Rincian</h2>
          {order.has_catch_weight && (
            <span className="inline-flex items-center gap-1 text-xs text-mute"><Scale className="h-3.5 w-3.5" />{order.weighed_at ? "Sudah ditimbang" : "Menunggu penimbangan subuh"}</span>
          )}
        </div>
        <table className="mt-3 w-full text-sm">
          <thead className="text-xs text-mute">
            <tr><th className="pb-1 text-left font-medium">Produk</th><th className="pb-1 text-right font-medium">Dipesan</th>{order.has_catch_weight && <th className="pb-1 text-right font-medium">Ditimbang</th>}<th className="pb-1 text-right font-medium">Harga</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {order.items.map((i) => (
              <tr key={i.id}>
                <td className="py-2"><span className="font-medium">{i.product_name}</span><span className="block text-xs text-mute">{i.variant_label}{i.prep_label ? ` · ${i.prep_label}` : ""} · {rupiah(i.unit_price)}/{UNIT_LABEL[i.unit]}</span></td>
                <td className="py-2 text-right">{i.qty_ordered} {UNIT_LABEL[i.unit]}</td>
                {order.has_catch_weight && <td className="py-2 text-right">{i.qty_final !== null ? `${i.qty_final} ${UNIT_LABEL[i.unit]}` : i.is_catch_weight ? "—" : `${i.qty_ordered} ${UNIT_LABEL[i.unit]}`}</td>}
                <td className="py-2 text-right font-semibold">{rupiah(i.line_total_final ?? i.line_total_est)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-mute">Subtotal</dt><dd>{rupiah(order.subtotal_final ?? order.subtotal_est)}</dd></div>
          {order.discount > 0 && <div className="flex justify-between text-success-600"><dt>Diskon {order.promo_code}</dt><dd>−{rupiah(order.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-mute">Ongkir</dt><dd>{order.delivery_fee ? rupiah(order.delivery_fee) : "Gratis"}</dd></div>
          <div className="flex justify-between pt-1 text-base"><dt className="font-semibold">Total {finalKnown ? "" : <span className="text-xs font-normal text-mute">(perkiraan)</span>}</dt><dd className="font-display text-xl font-semibold text-ocean-900">{rupiah(total)}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-mute">Kirim ke: {order.address} ({order.area_name}){order.customer_note ? ` · Catatan: ${order.customer_note}` : ""}</p>
      </div>

      {payNow && (
        <div className="card p-5">
          <h2 className="font-semibold text-ocean-900">Pembayaran {rupiah(total)}</h2>
          {order.payment_method === "qris" ? (
            <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              {settings.qris_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.qris_image_url} alt="QRIS" className="h-48 w-48 rounded-xl border border-line object-contain" />
              ) : (
                <div className="flex h-48 w-48 items-center justify-center rounded-xl border border-dashed border-line text-center text-xs text-mute">Gambar QRIS belum diunggah di pengaturan toko</div>
              )}
              <div className="text-sm text-ink/80">
                <p>Scan QRIS a.n. <b>{settings.bank_holder}</b> dengan aplikasi bank atau e-wallet apa pun, masukkan nominal <b>{rupiah(total)}</b>, lalu tekan tombol di bawah.</p>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-xl bg-sand-100 px-4 py-3 text-sm">
              <p>Transfer <b>{rupiah(total)}</b> ke:</p>
              <p className="mt-1 font-display text-xl font-semibold text-ocean-900">{settings.bank_name} {settings.bank_account}</p>
              <p className="text-mute">a.n. {settings.bank_holder}</p>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {order.payment_status === "unpaid" && <button onClick={markPaid} disabled={pending} className="btn-primary">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Saya sudah bayar"}</button>}
            <a href={waLink(settings.whatsapp_number, msgCustomerPaid(order, settings))} target="_blank" rel="noreferrer" className="btn-secondary"><MessageCircle className="h-4 w-4" /> Kirim bukti via WhatsApp</a>
          </div>
          {msg && <p className="mt-2 text-sm text-tide-700">{msg}</p>}
        </div>
      )}
      {!finalKnown && order.status !== "cancelled" && (
        <div className="rounded-2xl bg-tide-50 px-5 py-4 text-sm text-tide-700">Pesanan ini berisi produk yang ditimbang. Invoice final dan instruksi pembayaran kami kirim via WhatsApp setelah penimbangan subuh, dan tampil di halaman ini.</div>
      )}

      <div className="flex flex-wrap gap-2">
        <a href={waLink(settings.whatsapp_number, msgCustomerAsk(order.code, settings))} target="_blank" rel="noreferrer" className="btn-secondary"><MessageCircle className="h-4 w-4" /> Tanya tentang pesanan ini</a>
        <ReorderButton order={order} label="Pesan lagi" className="btn-secondary" />
      </div>
    </div>
  );
}
