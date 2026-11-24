// A seasonal pre-order page (New Year's Eve, Chinese New Year, Lebaran): its own products, delivery days and deadline.
// Public while the campaign is switched on and not over; before it opens it shows the opening date, after it closes
// it says so (orders already paid are still delivered).
import { notFound } from "next/navigation";
import Link from "next/link";
import { ClipboardList, CalendarDays, Wallet, Truck } from "lucide-react";
import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import { segmentOf } from "@/lib/pricing";
import { formatDate, jam, nowJakarta } from "@/lib/format";
import { campaignState, dayRange, isListed, preorderBadge, preorderFacts } from "@/lib/campaigns";
import { ProductCard } from "@/components/shop/ProductCard";
import { ImageSlot } from "@/components/site/Decor";
import { Band, StepsStrip } from "@/components/site/Sections";
import { NOINDEX, breadcrumbLd, pageMeta, shopTitle } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";

async function load(slug: string) {
  const repo = await getRepo();
  const [campaigns, settings] = await Promise.all([repo.getCampaigns(), repo.getSettings()]);
  const c = campaigns.find((x) => x.slug === slug);
  return c && isListed(c, nowJakarta(), settings.cutoff_time) ? { c, settings, repo } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await load(slug);
  if (!found) return { title: "Pre-order tidak ditemukan", robots: NOINDEX };
  const { c } = found;
  return pageMeta({
    title: shopTitle(`Pre-order ${c.name}`),
    description: `${c.intro || `Pre-order ${c.name} dari Dipasaria.`} Pesan paling lambat ${formatDate(c.order_by, "short")}, dikirim ${dayRange(c.deliver_from, c.deliver_to)}.`.slice(0, 300),
    path: `/belanja/musim/${c.slug}`, image: c.image_url,
  });
}

export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await load(slug);
  if (!found) notFound();
  const { c, settings, repo } = found;
  const [all, account, { locale }] = await Promise.all([repo.getProducts(), getCurrentAccount(), getT()]);
  const en = locale === "en";
  const segment = segmentOf(account);
  const state = campaignState(c, nowJakarta(), settings.cutoff_time);
  const badge = preorderBadge(c, state, en);
  const products = all.filter((p) => p.campaign_id === c.id);
  const name = pick(locale, c.name, c.name_en);
  const notice = state === "upcoming"
    ? (en ? `Orders open on ${formatDate(c.opens_on, "long", "en")}.` : `Pemesanan dibuka ${formatDate(c.opens_on, "long")}.`)
    : state === "closed"
      ? (en ? "Orders for this pre-order have closed. Orders already paid are delivered on the days chosen." : "Pemesanan pre-order ini sudah ditutup. Pesanan yang sudah dibayar tetap kami antar pada hari yang dipilih.")
      : null;
  const steps = en
    ? ["Choose boxes and quantities", `Pick a delivery day, ${dayRange(c.deliver_from, c.deliver_to, "en")}`, "Pay in advance by QRIS or transfer", "We buy to order at the dawn auction and deliver cold"]
    : ["Pilih paket dan jumlahnya", `Pilih hari kirim, ${dayRange(c.deliver_from, c.deliver_to)}`, "Bayar di muka dengan QRIS atau transfer", "Kami beli sesuai pesanan di lelang subuh dan antar dingin"];
  const icons = [<ClipboardList key="a" className="h-5 w-5" />, <CalendarDays key="b" className="h-5 w-5" />, <Wallet key="c" className="h-5 w-5" />, <Truck key="d" className="h-5 w-5" />];
  return (
    <>
      <JsonLd data={breadcrumbLd([["Belanja", "/belanja"], [`Pre-order ${c.name}`, `/belanja/musim/${c.slug}`]])} />
      <section className="bg-sand-100">
        <div className="grid md:grid-cols-12">
          <div className="container-x py-12 md:col-span-7 md:py-16 md:pr-10 lg:pl-[max(2.5rem,calc((100vw-1320px)/2+2.5rem))]">
            <p className="eyebrow">{en ? "Seasonal pre-order" : "Pre-order musiman"}</p>
            <h1 className="mt-2 text-[3rem] sm:text-[4.2rem] lg:text-[5rem]">{name}</h1>
            {pick(locale, c.intro, c.intro_en) && <p className="mt-4 max-w-xl font-sans text-[14.5px] leading-relaxed text-mute">{pick(locale, c.intro, c.intro_en)}</p>}
            <dl className="mt-8 grid max-w-xl gap-5 sm:grid-cols-3">
              {preorderFacts(c, settings.cutoff_time, en).map(([k, v]) => (
                <div key={k} className="border-l-2 border-ocean-950 pl-4"><dt className="font-sans text-[10.5px] font-bold uppercase tracking-[0.18em] text-mute">{k}</dt><dd className="mt-1 font-display text-[1.35rem] font-bold leading-tight">{v}</dd></div>
              ))}
            </dl>
            {notice && <p className="mt-6 max-w-xl border-l-4 border-coral-500 bg-white px-4 py-3 font-sans text-[13px] font-semibold" role="status">{notice}</p>}
          </div>
          <div className="relative min-h-[220px] md:col-span-5">
            <ImageSlot src={c.image_url ?? products[0]?.image_url ?? null} alt={name} icon="box" className="absolute inset-0" />
          </div>
        </div>
      </section>
      <Band>
        {products.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{products.map((p) => <ProductCard key={p.id} p={p} segment={segment} discountPct={account?.discount_pct} locale={locale} preorder={badge} size="lg" />)}</div>
        ) : <p className="font-sans text-sm text-mute">{en ? "Products for this pre-order will appear here soon." : "Produk untuk pre-order ini segera tersedia."}</p>}
        <p className="mt-8 max-w-2xl font-sans text-[12.5px] leading-relaxed text-mute">
          {en
            ? `Quantities are limited: when a size is gone it is gone. A pre-order can include everyday products with a fixed price for the same delivery; weighed fresh fish is ordered separately. Unpaid orders are cancelled automatically after the payment window. Order by ${jam(settings.cutoff_time)} on ${formatDate(c.order_by, "long", "en")}.`
            : `Jumlahnya terbatas: ukuran yang habis tidak kami tambah. Pre-order dapat digabung dengan produk harian berharga tetap untuk pengiriman yang sama; ikan segar yang ditimbang dipesan terpisah. Pesanan yang belum dibayar dibatalkan otomatis setelah batas waktu pembayaran. Pesan paling lambat ${formatDate(c.order_by, "long")} pukul ${jam(settings.cutoff_time)} WIB.`}
        </p>
        <Link href="/belanja" className="btn-outline mt-6">{en ? "Back to the shop" : "Kembali ke belanja"}</Link>
      </Band>
      <StepsStrip title={en ? "How a pre-order works" : "Cara kerja pre-order"} steps={steps.map((s, i) => ({ icon: icons[i], text: s }))} />
    </>
  );
}
