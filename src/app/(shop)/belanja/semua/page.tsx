import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { segmentOf } from "@/lib/pricing";
import { CollectionView } from "@/components/shop/CollectionView";
import { IMAGES } from "@/lib/content/images";

export const metadata = { title: "Semua produk" };

export default async function AllProductsPage() {
  const repo = await getRepo();
  const [categories, products, account, { locale, t }] = await Promise.all([repo.getCategories(), repo.getProducts(), getCurrentAccount(), getT()]);
  const en = locale === "en";
  return (
    <>
      <section className="bg-sand-100">
        <div className="container-x grid gap-8 py-12 md:grid-cols-12 md:items-end md:py-16">
          <div className="md:col-span-8"><p className="eyebrow">{en ? "The collections" : "Katalog"}</p><h1 className="mt-2 text-[3rem] sm:text-[4.2rem] lg:text-[5rem]">{t.shop.allProducts}</h1><p className="mt-4 max-w-xl font-sans text-[14.5px] text-mute">{en ? "Seafood at the core, halal chicken, eggs and pantry staples. One delivery, one invoice." : "Seafood sebagai inti, ayam halal, telur dan kebutuhan dapur. Satu pengiriman, satu invoice."}</p></div>
          <div className="flex gap-8 md:col-span-4 md:justify-end"><div className="border-l-2 border-ocean-950 pl-6"><p className="font-display text-[2.4rem] font-bold leading-none">{products.length}</p><p className="font-sans text-[10.5px] font-bold uppercase tracking-[0.18em] text-mute">{en ? "products" : "produk"}</p></div><div><p className="font-display text-[2.4rem] font-bold leading-none">{categories.length}</p><p className="font-sans text-[10.5px] font-bold uppercase tracking-[0.18em] text-mute">{en ? "categories" : "kategori"}</p></div></div>
        </div>
      </section>
      <CollectionView products={products} categories={categories} segment={segmentOf(account)} discountPct={account?.discount_pct} promo={{ eyebrow: en ? "Value boxes" : "Paket hemat", title: en ? "Stock the freezer in one order" : "Isi freezer sekali pesan", body: en ? "Freezer-ready boxes below the price of buying separately." : "Kotak siap kirim, lebih murah dari membeli satuan.", cta: en ? "Shop boxes" : "Lihat paket", href: "/belanja/kategori/paket-hemat", image: IMAGES.box }} />
    </>
  );
}
