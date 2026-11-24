import { getRepo } from "@/lib/data";
import { expireIfDue } from "@/lib/expiry";
import { getT } from "@/lib/i18n/server";
import { OrderTracking } from "@/components/shop/OrderTracking";
import { OrderLookup } from "@/components/shop/OrderLookup";
import { availableVaBanks, qrisAutoEnabled } from "@/lib/payments/service";
import { CLAIM_WINDOW_HOURS, RATING_WINDOW_DAYS } from "@/lib/config";
import { boxSkippable } from "@/lib/standing";
import { availableDates } from "@/lib/pricing";
import { nowJakarta } from "@/lib/format";
import { NOINDEX } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pesanan", robots: NOINDEX };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ hp?: string; baru?: string }> }) {
  const { code } = await params;
  const { hp, baru } = await searchParams;
  const repo = await getRepo();
  if (hp) await expireIfDue();
  const [order, settings, { t }] = await Promise.all([hp ? repo.lookupOrder(code, hp) : Promise.resolve(null), repo.getSettings(), getT()]);
  if (!order) return <div className="container-x max-w-3xl space-y-4 py-8 md:py-12"><h1 className="text-[2.6rem]">{t.tracking.title} {code}</h1><p className="text-sm text-mute">{t.tracking.enterPhone}</p><OrderLookup initialCode={code} /></div>;
  const claims = (await repo.listClaims({ orderId: order.id })).map((c) => ({ id: c.id, status: c.status, resolution_note: c.resolution_note, refund_amount: c.refund_amount, created_at: c.created_at }));
  // the guarantee window runs from the moment of delivery (recorded in delivery mode)
  const until = order.delivered_at ? new Date(Date.parse(order.delivered_at) + CLAIM_WINDOW_HOURS * 3600_000) : null;
  const claimUntil = until && until.getTime() > Date.now() ? until.toISOString() : null;
  // a delivered order can be rated once, for two weeks; an existing rating is always shown
  const given = order.status === "completed" ? await repo.getRatingForOrder(order.id) : null;
  const deliveredAt = order.delivered_at ? Date.parse(order.delivered_at) : Date.parse(`${order.delivery_date}T12:00:00+07:00`);
  const rating = given ? { stars: given.stars, comment: given.comment } : order.status === "completed" && Date.now() < deliveredAt + RATING_WINDOW_DAYS * 86400_000 ? ("open" as const) : null;
  // an order created from a household's weekly box can be skipped by the customer until the cut-off for its delivery day
  const box = order.segment === "retail" && order.client_ref?.startsWith("so:") ? { skippable: boxSkippable(order, availableDates(settings, nowJakarta())) } : null;
  return <div className="container-x max-w-3xl py-8 md:py-12"><OrderTracking order={order} settings={settings} isNew={baru === "1"} qrisAuto={qrisAutoEnabled()} vaBanks={availableVaBanks()} claims={claims} claimUntil={claimUntil} box={box} rating={rating} /></div>;
}
