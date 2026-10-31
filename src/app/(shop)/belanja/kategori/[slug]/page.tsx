import { notFound } from "next/navigation";
import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import { segmentOf } from "@/lib/pricing";
import { ProductCard } from "@/components/shop/ProductCard";
import { CategoryChips } from "@/components/shop/CategoryChips";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const repo = await getRepo();
  const [categories, products, account, { locale }] = await Promise.all([repo.getCategories(), repo.getProducts(), getCurrentAccount(), getT()]);
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) notFound();
  const segment = segmentOf(account);
  const list = products.filter((p) => p.category_id === cat.id).sort((a, b) => Number(b.available_today) - Number(a.available_today) || a.sort - b.sort);
  return (
    <div className="space-y-5">
      <CategoryChips categories={categories} active={slug} locale={locale} />
      <div><h1 className="text-2xl text-ocean-950">{pick(locale, cat.name, cat.name_en)}</h1><p className="mt-1 text-sm text-mute">{pick(locale, cat.description, cat.description_en)}</p></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{list.map((p) => <ProductCard key={p.id} p={p} segment={segment} discountPct={account?.discount_pct} locale={locale} quickAdd />)}</div>
    </div>
  );
}
