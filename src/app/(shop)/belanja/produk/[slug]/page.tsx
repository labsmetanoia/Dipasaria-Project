import { notFound } from "next/navigation";
import Link from "next/link";
import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
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
  const [product, account, categories, products] = await Promise.all([repo.getProductBySlug(slug), getCurrentAccount(), repo.getCategories(), repo.getProducts()]);
  if (!product) notFound();
  const cat = categories.find((c) => c.id === product.category_id);
  const related = products.filter((p) => p.category_id === product.category_id && p.id !== product.id).slice(0, 5);
  const segment = segmentOf(account);
  return (
    <div className="space-y-10">
      <div className="grid gap-6 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="aspect-square overflow-hidden rounded-2xl border border-line">
            <ProductArt icon={product.icon} storage={product.storage_class} image={product.image_url} alt={product.name} />
          </div>
        </div>
        <div className="md:col-span-7">
          <nav className="text-xs text-mute"><Link href="/belanja" className="hover:text-tide-600">Belanja</Link> / {cat && <Link href={`/belanja/kategori/${cat.slug}`} className="hover:text-tide-600">{cat.name}</Link>}</nav>
          <h1 className="mt-2 text-3xl font-semibold text-ocean-900">{product.name}</h1>
          <p className="text-sm text-mute">{[product.name_en, product.scientific_name ? <i key="s">{product.scientific_name}</i> : null].filter(Boolean).map((x, i) => <span key={i}>{i > 0 && " · "}{x}</span>)}</p>
          <p className="mt-4 text-[15px] leading-relaxed text-ink/80">{product.description}</p>
          <div className="mt-6"><ProductSheet product={product} account={account} /></div>
        </div>
      </div>
      {related.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ocean-900">Lainnya di {cat?.name}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {related.map((p) => <ProductCard key={p.id} p={p} segment={segment} discountPct={account?.discount_pct} />)}
          </div>
        </section>
      )}
    </div>
  );
}
