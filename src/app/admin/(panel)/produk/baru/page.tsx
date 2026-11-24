import { requireAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/data";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  await requireAdmin();
  const repo = await getRepo();
  const [categories, campaigns] = await Promise.all([repo.getCategories(), repo.getCampaigns({ includeInactive: true })]);
  return (
    <div className="space-y-4">
      <div><p className="eyebrow">Katalog</p><h1 className="text-2xl text-ocean-900">Produk baru</h1><p className="text-sm text-mute">Setelah disimpan, tambahkan varian (ukuran, harga) dan opsi penyiapan.</p></div>
      <ProductForm product={null} categories={categories} campaigns={campaigns} />
    </div>
  );
}
