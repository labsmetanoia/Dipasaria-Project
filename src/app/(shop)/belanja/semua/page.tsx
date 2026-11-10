import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import { segmentOf } from "@/lib/pricing";
import { CollectionView } from "@/components/shop/CollectionView";
import { IMAGES } from "@/lib/content/images";
import { ImageSlot } from "@/components/site/Decor";
import { CategoryRail } from "@/components/site/Sections";

export const metadata = { title: "Semua produk" };

export default async function AllProductsPage() {
  const repo = await getRepo();
  const [categories, products, account, { locale, t }] = await Promise.all([repo.getCategories(), repo.getProducts(), getCurrentAccount(), getT()]);
  const en = locale === "en";
  return (
    <>
      <section className="bg-sand-100">
        <div className="grid md:grid-cols-12">
          <div className="container-x py-12 md:col-span-7 md:py-16 md:pr-10 lg:pl-[max(2.5rem,calc((100vw-1320px)/2+2.5rem))]">
            <p className="eyebrow">{en ? "The collections" : "Katalog"}</p><h1 className="mt-2 text-[3rem] sm:text-[4.2rem] lg:text-[5rem]">{t.shop.allProducts}</h1>
            <p className="mt-4 max-w-xl font-sans text-[14.5px] text-mute">{en ? "Seafood at the core, halal chicken, eggs and pantry staples. One delivery, one invoice." : "Seafood sebagai inti, dilengkapi ayam halal, telur, dan kebutuhan dapur. Satu pengiriman, satu tagihan."}</p>
            <div className="mt-8 flex gap-8"><div className="border-l-2 border-ocean-950 pl-5"><p className="font-display text-[2.4rem] font-bold leading-none">{products.length}</p><p className="font-sans text-[10.5px] font-bold uppercase tracking-[0.18em] text-mute">{en ? "products" : "produk"}</p></div><div className="border-l-2 border-ocean-950 pl-5"><p className="font-display text-[2.4rem] font-bold leading-none">{categories.length}</p><p className="font-sans text-[10.5px] font-bold uppercase tracking-[0.18em] text-mute">{en ? "categories" : "kategori"}</p></div></div>
          </div>
          <div className="relative min-h-[220px] md:col-span-5"><ImageSlot src={IMAGES.display} alt={t.shop.allProducts} icon="fish" className="absolute inset-0" /></div>
        </div>
      </section>
      <CategoryRail categories={categories.map((c) => ({ id: c.id, slug: c.slug, label: pick(locale, c.name, c.name_en) }))} counts={Object.fromEntries(categories.map((c) => [c.id, products.filter((p) => p.category_id === c.id).length]))} active={undefined} allLabel={en ? "All products" : "Semua produk"} />
      <CollectionView products={products} categories={categories} segment={segmentOf(account)} discountPct={account?.discount_pct} promo={{ eyebrow: en ? "Value boxes" : "Paket hemat", title: en ? "Stock the freezer in one order" : "Isi freezer dalam sekali pesan", body: en ? "Freezer-ready boxes below the price of buying separately." : "Paket beku siap simpan, lebih hemat daripada membeli satuan.", cta: en ? "Shop boxes" : "Lihat paket", href: "/belanja/kategori/paket-hemat", image: IMAGES.box }} />
    </>
  );
}
