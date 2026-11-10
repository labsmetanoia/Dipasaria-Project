import { notFound } from "next/navigation";
import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import { segmentOf } from "@/lib/pricing";
import { CollectionView } from "@/components/shop/CollectionView";
import { IMAGES } from "@/lib/content/images";
import { ImageSlot } from "@/components/site/Decor";
import { CategoryRail } from "@/components/site/Sections";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = (await (await getRepo()).getCategories()).find((c) => c.slug === slug);
  return { title: cat?.name ?? "Kategori" };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const repo = await getRepo();
  const [categories, products, account, { locale }] = await Promise.all([repo.getCategories(), repo.getProducts(), getCurrentAccount(), getT()]);
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) notFound();
  const list = products.filter((p) => p.category_id === cat.id);
  const storages = [...new Set(list.map((p) => p.storage_class))].length;
  const en = locale === "en";
  const promo = slug === "paket-hemat" ? undefined : { eyebrow: en ? "Value boxes" : "Paket hemat", title: en ? "Stock the freezer in one order" : "Isi freezer dalam sekali pesan", body: en ? "Freezer-ready boxes below the price of buying separately." : "Paket beku siap simpan, lebih hemat daripada membeli satuan.", cta: en ? "Shop boxes" : "Lihat paket", href: "/belanja/kategori/paket-hemat", image: IMAGES.box };
  return (
    <>
      <section className="bg-sand-100">
        <div className="grid md:grid-cols-12">
          <div className="container-x py-12 md:col-span-7 md:py-16 md:pr-10 lg:pl-[max(2.5rem,calc((100vw-1320px)/2+2.5rem))]">
            <p className="eyebrow">{en ? "The collections" : "Katalog"}</p>
            <h1 className="mt-2 text-[3rem] sm:text-[4.2rem] lg:text-[5rem]">{pick(locale, cat.name, cat.name_en)}</h1>
            <p className="mt-4 max-w-xl font-sans text-[14.5px] leading-relaxed text-mute">{pick(locale, cat.description, cat.description_en)}</p>
            <div className="mt-8 flex gap-8">
              <div className="border-l-2 border-ocean-950 pl-5"><p className="font-display text-[2.4rem] font-bold leading-none">{list.length}</p><p className="font-sans text-[10.5px] font-bold uppercase tracking-[0.18em] text-mute">{en ? "products" : "produk"}</p></div>
              <div className="border-l-2 border-ocean-950 pl-5"><p className="font-display text-[2.4rem] font-bold leading-none">{list.filter((p) => p.available_today).length}</p><p className="font-sans text-[10.5px] font-bold uppercase tracking-[0.18em] text-mute">{en ? "available today" : "tersedia hari ini"}</p></div>
              <div className="border-l-2 border-ocean-950 pl-5"><p className="font-display text-[2.4rem] font-bold leading-none">{storages}</p><p className="font-sans text-[10.5px] font-bold uppercase tracking-[0.18em] text-mute">{en ? "storage zones" : "zona suhu"}</p></div>
            </div>
          </div>
          <div className="relative min-h-[220px] md:col-span-5">
            <ImageSlot src={IMAGES.category[slug] ?? cat.image_url} alt={pick(locale, cat.name, cat.name_en)} icon={cat.icon} className="absolute inset-0" />
          </div>
        </div>
      </section>
      <CategoryRail categories={categories.map((c) => ({ id: c.id, slug: c.slug, label: pick(locale, c.name, c.name_en) }))} counts={Object.fromEntries(categories.map((c) => [c.id, products.filter((p) => p.category_id === c.id).length]))} active={slug} allLabel={en ? "All products" : "Semua produk"} />
      <CollectionView products={list} categories={categories} segment={segmentOf(account)} discountPct={account?.discount_pct} activeSlug={slug} promo={promo} />
    </>
  );
}
