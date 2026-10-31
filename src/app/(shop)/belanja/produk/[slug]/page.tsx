import { notFound } from "next/navigation";
import Link from "next/link";
import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import { fmt } from "@/lib/i18n/dict";
import { ProductArt } from "@/components/ProductArt";
import { ProductSheet } from "@/components/shop/ProductSheet";
import { ProductCard } from "@/components/shop/ProductCard";
import { segmentOf } from "@/lib/pricing";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await (await getRepo()).getProductBySlug(slug);
  return { title: p ? `${p.name}${p.name_en ? ` (${p.name_en})` : ""}` : "Produk", description: p?.description };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const repo = await getRepo();
  const [product, account, categories, products, { locale, t }] = await Promise.all([repo.getProductBySlug(slug), getCurrentAccount(), repo.getCategories(), repo.getProducts(), getT()]);
  if (!product) notFound();
  const cat = categories.find((c) => c.id === product.category_id);
  const related = products.filter((p) => p.category_id === product.category_id && p.id !== product.id).slice(0, 5);
  const segment = segmentOf(account);
  const catName = cat ? pick(locale, cat.name, cat.name_en) : "";
  return (
    <div className="space-y-10">
      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-5"><div className="aspect-square overflow-hidden rounded-3xl border border-line"><ProductArt icon={product.icon} storage={product.storage_class} image={product.image_url} alt={product.name} /></div></div>
        <div className="md:col-span-7">
          <nav className="text-xs text-mute"><Link href="/belanja" className="hover:text-coral-600">{t.common.shop}</Link> / {cat && <Link href={`/belanja/kategori/${cat.slug}`} className="hover:text-coral-600">{catName}</Link>}</nav>
          <h1 className="mt-2 text-3xl text-ocean-950">{locale === "en" && product.name_en ? product.name_en : product.name}</h1>
          <p className="text-sm text-mute">{locale === "en" ? product.name : product.name_en}{product.scientific_name && <i> · {product.scientific_name}</i>}</p>
          <p className="mt-4 text-[15px] leading-relaxed text-ink/80">{pick(locale, product.description, product.description_en)}</p>
          <div className="mt-6"><ProductSheet product={product} account={account} /></div>
        </div>
      </div>
      {related.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg text-ocean-950">{fmt(t.shop.moreIn, { cat: catName })}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{related.map((p) => <ProductCard key={p.id} p={p} segment={segment} discountPct={account?.discount_pct} locale={locale} quickAdd />)}</div>
        </section>
      )}
    </div>
  );
}
