import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { segmentOf } from "@/lib/pricing";
import { SearchBox } from "@/components/shop/SearchBox";

export const metadata = { title: "Cari" };

export default async function SearchPage() {
  const repo = await getRepo();
  const [products, account, { t }] = await Promise.all([repo.getProducts(), getCurrentAccount(), getT()]);
  return (
    <div>
      <h1 className="mb-3 text-2xl text-ocean-950">{t.shop.search}</h1>
      <SearchBox products={products} segment={segmentOf(account)} discountPct={account?.discount_pct} />
    </div>
  );
}
