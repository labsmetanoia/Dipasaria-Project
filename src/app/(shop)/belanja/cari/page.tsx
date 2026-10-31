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
    <>
      <section className="bg-sand-100"><div className="container-x py-10 md:py-14"><p className="eyebrow">{t.common.search}</p><h1 className="mt-2 text-[3rem] sm:text-[4rem]">{t.shop.search}</h1></div></section>
      <div className="container-x py-8"><SearchBox products={products} segment={segmentOf(account)} discountPct={account?.discount_pct} /></div>
    </>
  );
}
