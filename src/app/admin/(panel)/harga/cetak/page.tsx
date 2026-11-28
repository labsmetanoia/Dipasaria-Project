// Printable daily price list (A4, print to PDF) for restaurants or households: the same sizes as the price card.
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { formatDate, nowJakarta, rupiah } from "@/lib/format";
import { cardRows, parseIds } from "@/lib/priceCard";
import { PrintButton } from "@/components/admin/PrintButton";
import { Logo } from "@/components/Logo";
import { SellerTax } from "@/components/finance/InvoiceDoc";

export const metadata = { title: "Daftar harga" };
export const dynamic = "force-dynamic";

export default async function PriceListPage({ searchParams }: { searchParams: Promise<{ v?: string; ids?: string; note?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const version = sp.v === "business" ? "business" : "retail";
  const repo = await getRepo();
  const [products, categories, settings] = await Promise.all([repo.getProducts(), repo.getCategories(), repo.getSettings()]);
  const { groups } = cardRows(products, categories, parseIds(sp.ids ?? null), version);
  const today = nowJakarta().date;
  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/harga" className="text-sm font-semibold text-ocean-900">← Harga hari ini</Link>
        <PrintButton />
      </div>
      <article className="mx-auto max-w-3xl border border-line bg-white p-6 text-sm print:max-w-none print:border-0 print:p-0" data-price-list>
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
          <div><Logo size="sm" /><p className="mt-2 text-xs text-mute">{settings.address_line} · WhatsApp +{settings.whatsapp_number}</p><SellerTax settings={settings} /></div>
          <div className="sm:text-right"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-ink">{version === "business" ? "Daftar harga grosir" : "Daftar harga"}</p><h1 className="mt-1 text-[1.6rem] leading-none">{formatDate(today, "long")}</h1></div>
        </header>
        {groups.length === 0 ? <p className="mt-4 text-mute">Belum ada produk yang dipilih.</p> : groups.map((g) => (
          <section key={g.category} className="mt-4">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-ink">{g.category}</h2>
            <table className="mt-1 w-full text-sm">
              <tbody>{g.rows.map((r) => <tr key={r.variant_id} className="border-b border-line"><td className="py-1.5 pr-2"><b>{r.name}</b> <span className="text-mute">{r.label}</span></td><td className="py-1.5 text-right tabular-nums whitespace-nowrap"><b>{rupiah(r.price)}</b><span className="text-mute">/{r.unit}{r.weighed ? " (ditimbang)" : ""}</span></td></tr>)}</tbody>
            </table>
          </section>
        ))}
        {sp.note && <p className="mt-4 bg-sand-50 px-3 py-2">{String(sp.note).slice(0, 200)}</p>}
        <footer className="mt-5 border-t border-line pt-3 text-xs text-mute">
          {version === "business"
            ? <p>Harga grosir untuk akun bisnis, berlaku hari ini; harga kontrak Anda tetap berlaku bila ada. Pesan sebelum pukul {settings.cutoff_time.replace(":", ".")} WIB untuk pengiriman dapur 05.00–08.00 besok. Minimal pesanan {rupiah(settings.min_order_business)}.</p>
            : <p>Harga berlaku hari ini. Pesan sebelum pukul {settings.cutoff_time.replace(":", ".")} WIB, diantar besok. Gratis ongkos kirim mulai {rupiah(settings.free_delivery_retail)}.</p>}
          <p className="mt-1">Produk ditimbang ditagih sesuai berat setelah disiapkan.</p>
        </footer>
      </article>
    </div>
  );
}
