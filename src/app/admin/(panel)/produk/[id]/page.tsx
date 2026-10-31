import { notFound } from "next/navigation";
import { getRepo } from "@/lib/data";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = await getRepo();
  const [products, categories] = await Promise.all([repo.getProducts({ includeInactive: true }), repo.getCategories()]);
  const product = products.find((p) => p.id === id);
  if (!product) notFound();
  return (
    <div className="space-y-4">
      <div><p className="eyebrow">Katalog</p><h1 className="text-2xl font-semibold text-ocean-900">{product.name}</h1></div>
      <ProductForm product={product} categories={categories} />
    </div>
  );
}
