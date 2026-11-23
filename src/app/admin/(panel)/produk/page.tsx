import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { ProductsTable } from "@/components/admin/ProductsTable";

export default async function ProductsAdmin() {
  await requireAdmin();
  const repo = await getRepo();
  const [products, categories, waiting] = await Promise.all([repo.getProducts({ includeInactive: true, includeCost: true }), repo.getCategories(), repo.stockAlertCounts()]);
  return (
    <div className="space-y-4">
      <div><p className="eyebrow">Katalog</p><h1 className="text-2xl text-ocean-900">Produk dan stok</h1></div>
      <ProductsTable products={products} categories={categories} waiting={waiting} />
    </div>
  );
}
