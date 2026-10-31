import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { CartView } from "@/components/shop/CartView";

export const metadata = { title: "Keranjang" };

export default async function CartPage() {
  const repo = await getRepo();
  const [products, settings, areas, account, { t }] = await Promise.all([repo.getProducts(), repo.getSettings(), repo.getAreas(), getCurrentAccount(), getT()]);
  return <div><h1 className="mb-4 text-2xl text-ocean-950">{t.cart.title}</h1><CartView products={products} settings={settings} areas={areas} account={account} /></div>;
}
