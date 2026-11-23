import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { getCurrentCustomer } from "@/lib/customer";
import { getT } from "@/lib/i18n/server";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
import { availableDates } from "@/lib/pricing";
import { nowJakarta } from "@/lib/format";
import { buildLedger, termsBlock } from "@/lib/receivables";

export const metadata = { title: "Pengiriman dan pembayaran" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const repo = await getRepo();
  const [products, settings, areas, slots, account, { t }] = await Promise.all([repo.getProducts(), repo.getSettings(), repo.getAreas(), repo.getSlots(), getCurrentAccount(), getT()]);
  const slotUsage = await repo.getSlotUsage(availableDates(settings, nowJakarta()));
  const customer = account ? null : await getCurrentCustomer();
  const household = customer ? { phone: customer.phone, name: customer.name, addresses: await repo.listAddresses(customer.id) } : null;
  let termsInfo = null;
  if (account && account.payment_terms !== "prepaid") {
    const r = await repo.listReceivables({ accountId: account.id });
    const l = buildLedger(account, r.orders, r.payments, r.allocations);
    termsInfo = { balance: l.balance, limit: account.credit_limit, overdue: termsBlock(l, { credit_limit: null }, settings, 0) };
  }
  return <div className="container-x py-8 md:py-12"><h1 className="mb-6 text-[2.6rem] sm:text-[3.4rem]">{t.checkout.title}</h1><CheckoutForm products={products} settings={settings} areas={areas} slots={slots} slotUsage={slotUsage} account={account} household={household} termsInfo={termsInfo} /></div>;
}
