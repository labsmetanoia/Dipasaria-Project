import { getRepo } from "@/lib/data";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  const categories = await (await getRepo()).getCategories();
  return (
    <div className="space-y-4">
      <div><p className="eyebrow">Katalog</p><h1 className="text-2xl text-ocean-900">Produk baru</h1><p className="text-sm text-mute">Setelah disimpan, tambahkan varian (ukuran, harga) dan opsi penyiapan.</p></div>
      <ProductForm product={null} categories={categories} />
    </div>
  );
}
