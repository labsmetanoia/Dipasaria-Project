import { getRepo } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import { OrderTracking } from "@/components/shop/OrderTracking";
import { OrderLookup } from "@/components/shop/OrderLookup";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ hp?: string; baru?: string }> }) {
  const { code } = await params;
  const { hp, baru } = await searchParams;
  const repo = await getRepo();
  const [order, settings, { t }] = await Promise.all([hp ? repo.lookupOrder(code, hp) : Promise.resolve(null), repo.getSettings(), getT()]);
  if (!order) return <div className="space-y-4"><h1 className="text-2xl text-ocean-950">{t.tracking.title} {code}</h1><p className="text-sm text-mute">{t.tracking.enterPhone}</p><OrderLookup initialCode={code} /></div>;
  return <OrderTracking order={order} settings={settings} isNew={baru === "1"} />;
}
