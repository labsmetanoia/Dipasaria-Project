import { getRepo } from "@/lib/data";
import { ProductsTable } from "@/components/admin/ProductsTable";

export default async function ProductsAdmin() {
  const repo = await getRepo();
  const [products, categories] = await Promise.all([repo.getProducts({ includeInactive: true }), repo.getCategories()]);
  return (
    <div className="space-y-4">
      <div><p className="eyebrow">Katalog</p><h1 className="text-2xl font-semibold text-ocean-900">Produk & stok</h1></div>
      <ProductsTable products={products} categories={categories} />
    </div>
  );
}
