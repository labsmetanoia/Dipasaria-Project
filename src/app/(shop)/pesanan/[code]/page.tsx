import { getRepo } from "@/lib/data";
import { OrderTracking } from "@/components/shop/OrderTracking";
import { OrderLookup } from "@/components/shop/OrderLookup";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ hp?: string; baru?: string }> }) {
  const { code } = await params;
  const { hp, baru } = await searchParams;
  const repo = await getRepo();
  const [order, settings] = await Promise.all([hp ? repo.lookupOrder(code, hp) : Promise.resolve(null), repo.getSettings()]);
  if (!order) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-ocean-900">Pesanan {code}</h1>
        <p className="text-sm text-mute">Masukkan nomor WhatsApp yang dipakai saat memesan untuk membuka pesanan ini.</p>
        <OrderLookup initialCode={code} />
      </div>
    );
  }
  return <OrderTracking order={order} settings={settings} isNew={baru === "1"} />;
}
