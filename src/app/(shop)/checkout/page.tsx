import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
import { availableDates } from "@/lib/pricing";
import { nowJakarta } from "@/lib/format";

export const metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const repo = await getRepo();
  const [products, settings, areas, slots, account, { t }] = await Promise.all([repo.getProducts(), repo.getSettings(), repo.getAreas(), repo.getSlots(), getCurrentAccount(), getT()]);
  const slotUsage = await repo.getSlotUsage(availableDates(settings, nowJakarta()));
  return <div><h1 className="mb-4 text-2xl text-ocean-950">{t.checkout.title}</h1><CheckoutForm products={products} settings={settings} areas={areas} slots={slots} slotUsage={slotUsage} account={account} /></div>;
}
