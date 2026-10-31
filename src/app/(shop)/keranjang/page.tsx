import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { CartView } from "@/components/shop/CartView";

export const metadata = { title: "Keranjang" };

export default async function CartPage() {
  const repo = await getRepo();
  const [products, settings, areas, account] = await Promise.all([repo.getProducts(), repo.getSettings(), repo.getAreas(), getCurrentAccount()]);
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-ocean-900">Keranjang</h1>
      <CartView products={products} settings={settings} areas={areas} account={account} />
    </div>
  );
}
