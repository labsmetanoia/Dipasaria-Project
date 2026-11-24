import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { segmentOf } from "@/lib/pricing";
import { SearchBox } from "@/components/shop/SearchBox";
import { NOINDEX } from "@/lib/seo";
import { campaignState, preorderBadge } from "@/lib/campaigns";
import { nowJakarta } from "@/lib/format";

export const metadata = { title: "Cari produk", robots: NOINDEX };

export default async function SearchPage() {
  const repo = await getRepo();
  const [all, account, { t, locale }, campaigns, settings] = await Promise.all([repo.getProducts(), getCurrentAccount(), getT(), repo.getCampaigns(), repo.getSettings()]);
  // pre-order products are found while their campaign takes orders, marked with their delivery days
  const open = new Map(campaigns.filter((c) => campaignState(c, nowJakarta(), settings.cutoff_time) === "open").map((c) => [c.id, preorderBadge(c, "open", locale === "en")]));
  const products = all.filter((p) => !p.campaign_id || open.has(p.campaign_id));
  const preorders = Object.fromEntries(products.filter((p) => p.campaign_id).map((p) => [p.id, open.get(p.campaign_id!)!]));
  return (
    <>
      <section className="bg-sand-100"><div className="container-x py-10 md:py-14"><p className="eyebrow">{t.common.search}</p><h1 className="mt-2 text-[3rem] sm:text-[4rem]">{t.shop.search}</h1></div></section>
      <div className="container-x py-8"><SearchBox products={products} segment={segmentOf(account)} discountPct={account?.discount_pct} preorders={preorders} /></div>
    </>
  );
}
