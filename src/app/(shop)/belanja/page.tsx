import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { segmentOf } from "@/lib/pricing";
import { ProductCard } from "@/components/shop/ProductCard";
import { CategoryChips } from "@/components/shop/CategoryChips";
import { ReorderPanel } from "@/components/shop/ReorderPanel";
import { ProductIcon } from "@/components/Icons";
import { rupiah } from "@/lib/format";

export const metadata = { title: "Belanja" };

export default async function ShopHome() {
  const repo = await getRepo();
  const account = await getCurrentAccount();
  const segment = segmentOf(account);
  const [settings, categories, products, orders] = await Promise.all([
    repo.getSettings(),
    repo.getCategories(),
    repo.getProducts(),
    account ? repo.getOrdersForAccount(account.id, 3) : Promise.resolve([]),
  ]);
  const catchToday = products.filter((p) => p.storage_class === "chilled" && p.is_catch_weight && categories.find((c) => c.id === p.category_id)?.is_seafood);
  const featured = products.filter((p) => p.is_featured && p.available_today);
  const minOrder = segment === "business" ? settings.min_order_business : settings.min_order_retail;

  return (
    <div className="space-y-8">
      {settings.announcement && <div className="rounded-xl bg-tide-100 px-4 py-2.5 text-sm font-medium text-tide-700">{settings.announcement}</div>}

      {account && orders.length > 0 ? (
        <ReorderPanel orders={orders} accountName={account.business_name} />
      ) : (
        <section className="wave-bg grain relative overflow-hidden rounded-2xl p-6 text-white shadow-soft sm:p-8">
          <p className="eyebrow text-tide-400">Dipasaria · {segment === "business" ? "Harga grosir" : "Belanja rumah tangga"}</p>
          <h1 className="mt-2 max-w-md text-2xl font-semibold leading-tight sm:text-3xl">Ikan bernama dan bergrade, diantar dingin besok pagi.</h1>
          <p className="mt-2 max-w-md text-sm text-white/70">Minimum pesanan {rupiah(minOrder)}. Gratis ongkir dari {rupiah(segment === "business" ? settings.free_delivery_business : settings.free_delivery_retail)}.</p>
          {!account && (
            <Link href="/akun" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-tide-400 hover:text-white">Punya restoran? Masuk untuk harga grosir <ArrowRight className="h-4 w-4" /></Link>
          )}
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ocean-900">Kategori</h2>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {categories.map((c) => (
            <Link key={c.id} href={`/belanja/kategori/${c.slug}`} className="card flex flex-col items-center gap-1.5 px-1 py-3 text-center hover:border-tide-500">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tide-50 text-tide-600"><ProductIcon name={c.icon} className="h-6 w-6" /></span>
              <span className="text-[11px] font-semibold leading-tight text-ink">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="eyebrow">Tangkapan hari ini</p>
            <h2 className="text-lg font-semibold text-ocean-900">Dilelang subuh, ditimbang sebelum dikirim</h2>
          </div>
          <Link href="/belanja/kategori/ikan-segar" className="text-sm font-semibold text-tide-600">Semua</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {catchToday.map((p) => <ProductCard key={p.id} p={p} segment={segment} discountPct={account?.discount_pct} />)}
        </div>
      </section>

      {featured.length > 0 && (
        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="eyebrow"><Sparkles className="mr-1 inline h-3 w-3" />Pilihan dapur</p>
              <h2 className="text-lg font-semibold text-ocean-900">Paling sering dipesan ulang</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {featured.map((p) => <ProductCard key={p.id} p={p} segment={segment} discountPct={account?.discount_pct} />)}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ocean-900">Semua produk</h2>
        <CategoryChips categories={categories} />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {products.map((p) => <ProductCard key={p.id} p={p} segment={segment} discountPct={account?.discount_pct} />)}
        </div>
      </section>
    </div>
  );
}
