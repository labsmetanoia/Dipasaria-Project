// Printable quotation (penawaran harga). Server component, shown in the back-office and on the signed link; printed
// to PDF from the browser.
import type { Product, Quotation, Settings } from "@/lib/types";
import { formatDate, rupiah } from "@/lib/format";
import { UNIT_LABEL } from "@/lib/config";
import { formatNpwp, resolveQuoteLines } from "@/lib/sales";
import { Logo } from "@/components/Logo";
import { SellerTax } from "./InvoiceDoc";

const long = (d: string) => `${formatDate(d, "short")} ${d.slice(0, 4)}`;

export function QuoteDoc({ quote: q, products, settings }: { quote: Quotation; products: Product[]; settings: Settings }) {
  const lines = resolveQuoteLines(q.lines, products);
  return (
    <article className="mx-auto max-w-3xl bg-white p-5 text-sm text-ink print:max-w-none print:p-0 sm:p-8" data-quote-doc>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
        <div><Logo size="sm" /><p className="mt-2 text-xs text-mute">{settings.address_line} · WhatsApp +{settings.whatsapp_number}</p><SellerTax settings={settings} /></div>
        <div className="sm:text-right">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-ink">Penawaran harga</p>
          <h1 className="mt-1 text-[1.6rem] leading-none">{q.code}</h1>
          <p className="mt-1 text-xs text-mute">Dibuat {long(q.created_at.slice(0, 10))} · berlaku untuk diterima sampai <b className="text-ink">{long(q.valid_until)}</b></p>
        </div>
      </header>
      <div className="mt-4 grid gap-4 text-xs sm:grid-cols-2">
        <div>
          <p className="text-mute">Kepada</p>
          <p className="font-semibold">{q.business_name}</p>
          {q.contact_name && <p>{q.contact_name}</p>}
          {q.address && <p>{q.address}</p>}
          {q.phone && <p>+{q.phone}</p>}
          {q.npwp && <p className="mt-1">NPWP {formatNpwp(q.npwp)}{q.tax_name ? ` · ${q.tax_name}` : ""}</p>}
        </div>
        <div className="sm:text-right">
          <p className="text-mute">Masa harga</p>
          <p className="font-semibold">{q.price_to ? `${long(q.price_from)} – ${long(q.price_to)}` : `Mulai ${long(q.price_from)}, sampai ada perubahan tertulis`}</p>
          <p className="mt-1 text-mute">Harga berlaku sejak penawaran diterima bila tanggal itu lebih lambat.</p>
        </div>
      </div>
      <div className="overflow-x-auto"><table className="mt-5 w-full text-xs">
        <thead><tr className="border-b border-ink text-left"><th className="py-1.5 pr-2 font-semibold">Produk</th><th className="py-1.5 pr-2 font-semibold">Ukuran</th><th className="py-1.5 pr-2 text-right font-semibold">Harga grosir</th><th className="py-1.5 text-right font-semibold">Harga penawaran</th></tr></thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.variant_id} className="border-b border-line align-top">
              <td className="py-1.5 pr-2"><span className="font-semibold">{l.product.name}</span>{l.product.scientific_name ? <i className="text-mute"> {l.product.scientific_name}</i> : null}{l.note ? <span className="block text-mute">{l.note}</span> : null}</td>
              <td className="py-1.5 pr-2">{l.variant.label}</td>
              <td className="py-1.5 pr-2 text-right tabular-nums text-mute whitespace-nowrap">{l.variant.price_business > l.price ? <s>{rupiah(l.variant.price_business)}</s> : rupiah(l.variant.price_business)}</td>
              <td className="py-1.5 text-right font-semibold tabular-nums whitespace-nowrap">{rupiah(l.price)}<span className="font-normal text-mute">/{UNIT_LABEL[l.variant.unit] ?? l.variant.unit}</span></td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {q.note && <p className="mt-4 whitespace-pre-line bg-sand-50 px-3 py-2 text-xs">{q.note}</p>}
      <ul className="mt-4 list-disc space-y-1 pl-4 text-xs text-mute">
        <li>Harga dalam rupiah per satuan yang tertulis. Produk per kg ditagih sesuai berat setelah disiapkan, dengan nama jenis ikan di faktur.</li>
        <li>Pesan sebelum pukul {settings.cutoff_time.replace(":", ".")} WIB untuk pengiriman dapur keesokan harinya pukul 05.00–08.00. Minimal pesanan {rupiah(settings.min_order_business)}; gratis ongkos kirim mulai {rupiah(settings.free_delivery_business)}.</li>
        <li>Pembayaran di muka, atau tempo setelah akun berjalan lancar. Faktur dan rekening koran dikirim melalui WhatsApp{settings.npwp ? "; NPWP tercantum di setiap faktur" : ""}.</li>
      </ul>
      {q.status === "accepted" && q.accepted_at && (
        <p className="mt-5 border-2 border-success-600 px-3 py-2 text-xs font-semibold text-success-600" data-quote-accepted>Diterima oleh {q.accepted_name} pada {long(q.accepted_at.slice(0, 10))}.</p>
      )}
    </article>
  );
}
