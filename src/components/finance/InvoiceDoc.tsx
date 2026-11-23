// Printable invoice (faktur) for one order. Server component, used by the back-office and the restaurant's signed link.
import type { BusinessAccount, Order, Settings } from "@/lib/types";
import { amountOf } from "@/lib/receivables";
import { formatDate, qtyUnit, rupiah } from "@/lib/format";
import { PAYMENT_LABEL } from "@/lib/config";
import { Logo } from "@/components/Logo";

export function InvoiceDoc({ order: o, account, settings, settled }: { order: Order; account: BusinessAccount | null; settings: Settings; settled: number }) {
  const total = amountOf(o);
  const estimate = o.total_final === null;
  const paid = o.payment_status === "paid";
  const remaining = paid ? 0 : Math.max(0, total - settled);
  return (
    <article className="mx-auto max-w-3xl bg-white p-5 text-sm text-ink print:max-w-none print:p-0 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
        <div><Logo size="sm" /><p className="mt-2 text-xs text-mute">{settings.address_line} · WhatsApp +{settings.whatsapp_number}</p></div>
        <div className="sm:text-right">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-ink">{estimate ? "Faktur sementara" : "Faktur"}</p>
          <h1 className="mt-1 text-[1.6rem] leading-none">{o.code}</h1>
          <p className="mt-1 text-xs text-mute">Tanggal kirim {formatDate(o.delivery_date, "short")} {o.delivery_date.slice(0, 4)}{o.due_date ? ` · jatuh tempo ${formatDate(o.due_date, "short")} ${o.due_date.slice(0, 4)}` : ""}</p>
        </div>
      </header>
      <div className="mt-4 grid gap-4 text-xs sm:grid-cols-2">
        <div><p className="text-mute">Ditagihkan kepada</p><p className="font-semibold">{account?.business_name ?? o.customer_name}</p><p>{o.address}</p><p>+{o.phone}</p></div>
        <div className="sm:text-right"><p className="text-mute">Pembayaran</p><p className="font-semibold">{PAYMENT_LABEL[o.payment_method] ?? o.payment_method}</p><p className={paid ? "font-semibold text-success-600" : ""}>{paid ? "Lunas" : o.status === "cancelled" ? "Dibatalkan" : settled > 0 ? `Dibayar sebagian ${rupiah(settled)}` : "Belum dibayar"}</p></div>
      </div>
      <div className="overflow-x-auto"><table className="mt-5 w-full text-xs">
        <thead><tr className="border-b border-ink text-left"><th className="py-1.5 pr-2 font-semibold">Produk</th><th className="py-1.5 pr-2 text-right font-semibold">Jumlah</th><th className="py-1.5 pr-2 text-right font-semibold">Harga</th><th className="py-1.5 text-right font-semibold">Total</th></tr></thead>
        <tbody>
          {o.items.map((i) => (
            <tr key={i.id} className="border-b border-line align-top">
              <td className="py-1.5 pr-2"><span className="font-semibold">{i.product_name}</span> {i.variant_label}{i.prep_label ? <span className="text-mute"> · {i.prep_label}</span> : null}</td>
              <td className="py-1.5 pr-2 text-right whitespace-nowrap">{qtyUnit(i.qty_final ?? i.qty_ordered, i.unit)}{i.is_catch_weight && i.qty_final === null ? " ±" : ""}</td>
              <td className="py-1.5 pr-2 text-right tabular-nums whitespace-nowrap">{rupiah(i.unit_price)}</td>
              <td className="py-1.5 text-right tabular-nums">{rupiah(i.line_total_final ?? i.line_total_est)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="text-xs">
          <tr><td colSpan={3} className="pt-2 pr-2 text-right text-mute">Subtotal</td><td className="pt-2 text-right tabular-nums">{rupiah(o.subtotal_final ?? o.subtotal_est)}</td></tr>
          {o.discount > 0 && <tr><td colSpan={3} className="pr-2 text-right text-mute">Potongan{o.promo_code ? ` (${o.promo_code})` : ""}</td><td className="text-right tabular-nums">−{rupiah(o.discount)}</td></tr>}
          <tr><td colSpan={3} className="pr-2 text-right text-mute">Ongkos kirim</td><td className="text-right tabular-nums">{o.delivery_fee ? rupiah(o.delivery_fee) : "Gratis"}</td></tr>
          <tr className="text-sm font-bold"><td colSpan={3} className="border-t border-ink pt-1.5 pr-2 text-right">Total</td><td className="border-t border-ink pt-1.5 text-right tabular-nums">{rupiah(total)}</td></tr>
          {!paid && settled > 0 && <tr className="font-semibold"><td colSpan={3} className="pr-2 text-right">Sisa tagihan</td><td className="text-right tabular-nums">{rupiah(remaining)}</td></tr>}
        </tfoot>
      </table></div>
      {estimate && <p className="mt-3 bg-sand-100 px-3 py-2 text-xs">Produk bertanda ± ditimbang subuh sebelum dikirim. Total akhir mengikuti hasil timbang.</p>}
      <footer className="mt-6 border-t border-line pt-3 text-xs text-mute">
        {!paid && <p>Pembayaran ke <b className="text-ink">{settings.bank_name} {settings.bank_account}</b> a.n. {settings.bank_holder}, dengan berita transfer <b className="text-ink">{o.code}</b>.</p>}
        <p className="mt-1">Terima kasih atas kepercayaan Anda.</p>
      </footer>
    </article>
  );
}
