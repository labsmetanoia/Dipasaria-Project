import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import { fmt } from "@/lib/i18n/dict";
import { segmentOf } from "@/lib/pricing";
import { ProductCard } from "@/components/shop/ProductCard";
import { ReorderPanel } from "@/components/shop/ReorderPanel";
import { ProductIcon } from "@/components/Icons";
import { ImageSlot } from "@/components/site/Decor";
import { rupiah } from "@/lib/format";

export const metadata = { title: "Belanja" };

export default async function ShopHome() {
  const repo = await getRepo();
  const [account, { locale, t }] = await Promise.all([getCurrentAccount(), getT()]);
  const segment = segmentOf(account);
  const [settings, categories, products, orders] = await Promise.all([repo.getSettings(), repo.getCategories(), repo.getProducts(), account ? repo.getOrdersForAccount(account.id, 3) : Promise.resolve([])]);
  const seafood = new Set(categories.filter((c) => c.is_seafood).map((c) => c.id));
  const catchToday = products.filter((p) => p.storage_class === "chilled" && p.is_catch_weight && seafood.has(p.category_id));
  const freezer = products.filter((p) => p.storage_class === "frozen" && p.available_today).slice(0, 10);
  const featured = products.filter((p) => p.is_featured && p.available_today);
  const minOrder = segment === "business" ? settings.min_order_business : settings.min_order_retail;
  const free = segment === "business" ? settings.free_delivery_business : settings.free_delivery_retail;
  const ann = pick(locale, settings.announcement, settings.announcement_en);
  const Section = ({ eyebrow, title, href, children }: { eyebrow: string; title: string; href?: string; children: React.ReactNode }) => (
    <section>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div><p className="eyebrow">{eyebrow}</p><h2 className="mt-1 text-[20px] font-bold text-ocean-950 sm:text-2xl">{title}</h2></div>
        {href && <Link href={href} className="flex-none text-[13.5px] font-bold text-coral-600">{t.common.viewAll} →</Link>}
      </div>
      {children}
    </section>
  );
  const grid = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5";

  return (
    <div className="space-y-10">
      {ann && <div className="rounded-xl bg-coral-50 px-4 py-2.5 text-sm font-semibold text-coral-700">{ann}</div>}

      {account && orders.length > 0 ? (
        <ReorderPanel orders={orders} accountName={account.business_name} />
      ) : (
        <ImageSlot src={settings.hero_image_url} alt={t.shop.heroTitle} icon="fish" className="rounded-3xl p-6 text-white shadow-soft sm:p-10">
          <div className="photo-fade absolute inset-0 rounded-3xl" />
          <div className="relative">
            <p className="eyebrow">{segment === "business" ? t.shop.heroEyebrowBusiness : t.shop.heroEyebrowRetail}</p>
            <h1 className="mt-2 max-w-lg text-[1.65rem] leading-[1.1] sm:text-4xl">{t.shop.heroTitle}</h1>
            <p className="mt-3 max-w-md text-[14px] text-white/75">{fmt(t.shop.heroSub, { min: rupiah(minOrder), free: rupiah(free) })}</p>
            {!account && <Link href="/akun" className="mt-5 inline-flex items-center gap-1 text-[13.5px] font-bold text-coral-500 hover:text-white">{t.shop.heroLogin} <ArrowRight className="h-4 w-4" /></Link>}
          </div>
        </ImageSlot>
      )}

      <section>
        <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 lg:grid-cols-8">
          {categories.map((c) => (
            <Link key={c.id} href={`/belanja/kategori/${c.slug}`} className="flex w-[5.4rem] flex-none flex-col items-center gap-2 rounded-2xl border border-line bg-white px-1 py-3 text-center transition hover:border-coral-500 sm:w-auto">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-tide-50 text-tide-600"><ProductIcon name={c.icon} className="h-6 w-6" /></span>
              <span className="text-[11px] font-bold leading-tight text-ink">{pick(locale, c.name, c.name_en)}</span>
            </Link>
          ))}
        </div>
      </section>

      <Section eyebrow={t.shop.todaysCatch} title={t.shop.todaysCatchSub} href="/belanja/kategori/ikan-segar">
        <div className={grid}>{catchToday.map((p) => <ProductCard key={p.id} p={p} segment={segment} discountPct={account?.discount_pct} locale={locale} quickAdd />)}</div>
      </Section>

      {featured.length > 0 && (
        <Section eyebrow={t.shop.kitchenPicks} title={t.shop.kitchenPicksSub}>
          <div className={grid}>{featured.map((p) => <ProductCard key={p.id} p={p} segment={segment} discountPct={account?.discount_pct} locale={locale} quickAdd />)}</div>
        </Section>
      )}

      <Section eyebrow={t.shop.fillFreezer} title={t.shop.fillFreezerSub} href="/belanja/kategori/seafood-beku">
        <div className={grid}>{freezer.map((p) => <ProductCard key={p.id} p={p} segment={segment} discountPct={account?.discount_pct} locale={locale} quickAdd />)}</div>
      </Section>

      <Section eyebrow={t.shop.categories} title={t.shop.allProducts}>
        <div className="space-y-8">
          {categories.map((c) => {
            const list = products.filter((p) => p.category_id === c.id);
            if (!list.length) return null;
            return (
              <div key={c.id}>
                <div className="mb-3 flex items-center justify-between"><h3 className="text-[16px] font-bold text-ocean-950">{pick(locale, c.name, c.name_en)}</h3><Link href={`/belanja/kategori/${c.slug}`} className="text-[12.5px] font-bold text-coral-600">{t.common.viewAll} →</Link></div>
                <div className={grid}>{list.slice(0, 5).map((p) => <ProductCard key={p.id} p={p} segment={segment} discountPct={account?.discount_pct} locale={locale} quickAdd />)}</div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
