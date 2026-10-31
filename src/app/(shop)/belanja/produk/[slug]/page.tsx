import { notFound } from "next/navigation";
import Link from "next/link";
import { ClipboardList, CalendarDays, Fish, Truck } from "lucide-react";
import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import { fmt } from "@/lib/i18n/dict";
import { ProductArt } from "@/components/ProductArt";
import { ProductSheet } from "@/components/shop/ProductSheet";
import { ProductCard, defaultVariant } from "@/components/shop/ProductCard";
import { QuickAdd } from "@/components/shop/QuickAdd";
import { SectionHead, StepsStrip, Band } from "@/components/site/Sections";
import { MarqueeBand } from "@/components/site/Decor";
import { segmentOf } from "@/lib/pricing";
import { rupiah } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await (await getRepo()).getProductBySlug(slug);
  return { title: p ? `${p.name}${p.name_en ? ` (${p.name_en})` : ""}` : "Produk", description: p?.description };
}

const FAQ = {
  id: [["Bagaimana cara menyimpannya?", "Ikan segar: 0–4 °C, masak dalam 24 jam atau bekukan segera. Produk beku: −18 °C, cairkan di kulkas bawah semalaman, bukan di suhu ruang."], ["Mengapa total pesanan “perkiraan”?", "Produk bertanda ditimbang dijual per kg dan ditimbang setelah disiapkan. Invoice final dikirim via WhatsApp sebelum pengiriman; Anda membayar berat final."], ["Bisa pilih hari pengiriman?", "Ya. Pesan sebelum 20.00 WIB untuk besok, atau pilih hingga 6 hari ke depan. Slot pagi 10.00–13.00, sore 15.00–18.00, dan slot dapur 05.00–08.00 untuk akun bisnis."], ["Bagaimana jika tidak segar?", "Kirim foto via WhatsApp dalam 2 jam setelah diterima. Kami ganti pada pengiriman berikutnya atau kembalikan uangnya."]],
  en: [["How should I store it?", "Fresh fish: 0–4 °C, cook within 24 hours or freeze right away. Frozen products: −18 °C, thaw overnight in the fridge, never at room temperature."], ["Why is my order total “estimated”?", "Weighed items are sold per kg and weighed after preparation. The final invoice is sent on WhatsApp before dispatch; you pay the final weight."], ["Can I choose my delivery day?", "Yes. Order before 20:00 WIB for tomorrow, or pick up to 6 days ahead. Morning 10:00–13:00, afternoon 15:00–18:00, and the 05:00–08:00 kitchen slot for business accounts."], ["What if it isn't fresh?", "Send a photo on WhatsApp within 2 hours of delivery. We replace on the next delivery or refund."]],
};

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const repo = await getRepo();
  const [product, account, categories, products, { locale, t }] = await Promise.all([repo.getProductBySlug(slug), getCurrentAccount(), repo.getCategories(), repo.getProducts(), getT()]);
  if (!product) notFound();
  const cat = categories.find((c) => c.id === product.category_id);
  const segment = segmentOf(account);
  const related = products.filter((p) => p.category_id === product.category_id && p.id !== product.id && p.available_today).slice(0, 4);
  const pairs = products.filter((p) => p.category_id !== product.category_id && p.is_featured && p.available_today && !p.variants[0]?.business_only).slice(0, 3);
  const catName = cat ? pick(locale, cat.name, cat.name_en) : "";
  const en = locale === "en";
  const name = en && product.name_en ? product.name_en : product.name;
  const stepIcons = [<ClipboardList key="a" className="h-5 w-5" />, <CalendarDays key="b" className="h-5 w-5" />, <Fish key="c" className="h-5 w-5" />, <Truck key="d" className="h-5 w-5" />];
  const steps = en ? ["Choose products, sizes and preparation", "Pick a delivery day and slot", "We auction, weigh and prepare at dawn", "Delivered cold to your door"] : ["Pilih produk, ukuran dan cara penyiapannya", "Pilih hari dan slot pengiriman", "Kami lelang, timbang dan siapkan subuh", "Diantar dingin ke pintu Anda"];
  return (
    <>
      <section className="bg-white">
        <div className="grid lg:grid-cols-2">
          <div className="relative aspect-square lg:aspect-auto lg:min-h-[640px]">
            <div className="absolute inset-0"><ProductArt icon={product.icon} storage={product.storage_class} image={product.image_url} alt={name} /></div>
            {product.is_catch_weight && <span className="absolute left-5 top-5 bg-ocean-950 px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-coral-500">± {t.shop.weighed}</span>}
          </div>
          <div className="px-5 py-8 sm:px-10 lg:px-14 lg:py-14">
            <nav className="font-sans text-[10.5px] font-bold uppercase tracking-[0.18em] text-mute"><Link href="/belanja" className="hover:text-coral-600">{t.common.shop}</Link> / {cat && <Link href={`/belanja/kategori/${cat.slug}`} className="hover:text-coral-600">{catName}</Link>}</nav>
            <h1 className="mt-3 text-[2.6rem] sm:text-[3.4rem]">{name}</h1>
            <p className="mt-1 font-sans text-[13px] text-mute">{en ? product.name : product.name_en}{product.scientific_name && <i> · {product.scientific_name}</i>}</p>
            <div className="mt-6"><ProductSheet product={product} account={account} /></div>
            {pairs.length > 0 && (
              <div className="mt-8">
                <p className="eyebrow">{en ? "Often bought together" : "Sering dibeli bersama"}</p>
                <ul className="mt-3 divide-y divide-line border border-line bg-sand-50">
                  {pairs.map((p) => { const v = defaultVariant(p, segment)!; return (
                    <li key={p.id} className="flex items-center gap-3 p-2.5">
                      <Link href={`/belanja/produk/${p.slug}`} className="h-12 w-12 flex-none overflow-hidden tile-bg"><ProductArt icon={p.icon} storage={p.storage_class} image={p.image_url} alt={p.name} /></Link>
                      <div className="min-w-0 flex-1"><Link href={`/belanja/produk/${p.slug}`} className="block truncate font-display text-[16px] font-bold uppercase leading-none hover:text-coral-600">{en && p.name_en ? p.name_en : p.name}</Link><p className="font-sans text-[12px] text-mute">{rupiah(segment === "business" ? v.price_business : v.price_retail)}/{t.unit[v.unit]}</p></div>
                      <QuickAdd product={p} variant={v} />
                    </li>); })}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      <StepsStrip title={en ? "How's it work?" : "Bagaimana caranya?"} steps={steps.map((s, i) => ({ icon: stepIcons[i], text: s }))} />

      {related.length > 0 && (
        <Band tone="cream">
          <SectionHead eyebrow={en ? "Complete the order" : "Lengkapi pesanan"} title={fmt(t.shop.moreIn, { cat: catName })} action={{ href: cat ? `/belanja/kategori/${cat.slug}` : "/belanja/semua", label: t.common.viewAll }} />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{related.map((p) => <ProductCard key={p.id} p={p} segment={segment} discountPct={account?.discount_pct} locale={locale} />)}</div>
        </Band>
      )}

      <Band>
        <div className="mx-auto max-w-3xl">
          <div className="text-center"><p className="eyebrow">{en ? "Good to know" : "Perlu diketahui"}</p><h2 className="mt-2 text-[2.2rem] sm:text-[3rem]">{en ? "Frequently asked questions" : "Pertanyaan umum"}</h2></div>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {FAQ[locale].map(([q, a], i) => (
              <details key={q} open={i === 0} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-display text-[18px] font-bold uppercase marker:content-none group-open:text-coral-600">{q}<span className="font-sans text-xl font-light">+</span></summary>
                <p className="mt-3 font-sans text-[14px] leading-relaxed text-mute">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </Band>
      <MarqueeBand text={en ? "The chef's fishmonger" : "Pemasok ikan para chef"} />
    </>
  );
}
