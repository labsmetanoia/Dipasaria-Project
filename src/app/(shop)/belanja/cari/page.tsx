import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { segmentOf } from "@/lib/pricing";
import { SearchBox } from "@/components/shop/SearchBox";

export const metadata = { title: "Cari" };

export default async function SearchPage() {
  const repo = await getRepo();
  const [products, account] = await Promise.all([repo.getProducts(), getCurrentAccount()]);
  return (
    <div>
      <h1 className="mb-3 text-2xl font-semibold text-ocean-900">Cari produk</h1>
      <SearchBox products={products} segment={segmentOf(account)} discountPct={account?.discount_pct} />
    </div>
  );
}
