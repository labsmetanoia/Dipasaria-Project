import Link from "next/link";
import { LogOut, Store, MessageCircle } from "lucide-react";
import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/dict";
import { BusinessLogin } from "@/components/shop/BusinessLogin";
import { ReorderButton } from "@/components/shop/ReorderPanel";
import { businessLogoutAction } from "@/actions/shop";
import { formatDate, rupiah, waLink, jamRange, qtyUnit } from "@/lib/format";
import { StatusBadge, PaymentBadge, Badge } from "@/components/ui";
import { StandingOrdersPanel } from "@/components/shop/StandingOrdersPanel";
import { availableDates } from "@/lib/pricing";
import { allowedPayments } from "@/lib/standing";
import { nowJakarta } from "@/lib/format";
import { getCurrentCustomer, otpChannel } from "@/lib/customer";
import { customerLogoutAction } from "@/actions/customer";
import { CustomerLogin } from "@/components/shop/CustomerLogin";
import { AddressBook, DeleteAccount, ProfileCard } from "@/components/shop/HouseholdAccount";
import type { Order } from "@/lib/types";
import type { Locale } from "@/lib/i18n";

export const metadata = { title: "Akun" };
export const dynamic = "force-dynamic";

function OrderList({ orders, t, locale }: { orders: Order[]; t: Awaited<ReturnType<typeof getT>>["t"]; locale: Locale }) {
  if (orders.length === 0) return <p className="text-sm text-mute">{t.account.noOrders} <Link href="/belanja" className="font-bold text-gold-ink">{t.common.shopNow}</Link>.</p>;
  return (
    <ul className="space-y-2">
      {orders.map((o) => (
        <li key={o.id} className="card flex items-center justify-between gap-3 p-4">
          <Link href={`/pesanan/${o.code}?hp=${o.phone}`} className="min-w-0 flex-1">
            <p className="font-bold text-ocean-950">{o.code} <span className="ml-1 text-xs font-normal text-mute">{formatDate(o.delivery_date, "short", locale)}</span></p>
            <p className="truncate text-xs text-mute">{o.items.map((i) => `${i.product_name} ${qtyUnit(i.qty_final ?? i.qty_ordered, i.unit, locale)}`).join(" · ")}</p>
            <div className="mt-1 flex gap-1"><StatusBadge status={o.status} /><PaymentBadge status={o.payment_status} />{o.has_catch_weight && !o.weighed_at && <Badge>{t.account.awaitingWeigh}</Badge>}</div>
          </Link>
          <div className="flex flex-col items-end gap-2"><p className="text-sm font-bold">{rupiah(o.total_final ?? o.total_est)}</p><ReorderButton order={o} label={t.shop.repeat} className="btn-secondary px-3 py-1.5 text-xs" /></div>
        </li>
      ))}
    </ul>
  );
}

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ next?: string; dihapus?: string }> }) {
  const repo = await getRepo();
  const [account, { t, locale }, sp] = await Promise.all([getCurrentAccount(), getT(), searchParams]);
  const settings = await repo.getSettings();
  const en = locale === "en";
  if (!account) {
    const customer = await getCurrentCustomer();
    if (!customer) {
      return (
        <div className="container-x max-w-lg space-y-5 py-10 md:py-16">
          <h1 className="text-[2.6rem] sm:text-[3.4rem]">{en ? "Your account" : "Akun Anda"}</h1>
          {sp.dihapus === "1" && <p className="bg-success-50 px-4 py-3 text-sm text-success-600">{en ? "Your account has been deleted." : "Akun Anda sudah dihapus."}</p>}
          <CustomerLogin next={sp.next} available={otpChannel() !== null} />
          <div className="pt-2"><p className="eyebrow">{en ? "Restaurants & caterers" : "Restoran & katering"}</p><p className="mt-1 font-sans text-sm text-mute">{t.account.sub}</p></div>
          <BusinessLogin demoHint={repo.mode === "memory"} />
        </div>
      );
    }
    const [orders, addresses, areas] = await Promise.all([repo.getOrdersByPhone(customer.phone, 20), repo.listAddresses(customer.id), repo.getAreas()]);
    return (
      <div className="container-x max-w-4xl space-y-6 py-8 md:py-12">
        <div className="flex flex-wrap items-start justify-between gap-3 bg-ocean-950 p-6 text-white">
          <div><p className="eyebrow">{en ? "Your account" : "Akun Anda"}</p><h1 className="mt-1 text-[2.4rem]">{customer.name || (en ? "Welcome" : "Selamat datang")}</h1><p className="text-sm text-white/70">+{customer.phone} · {en ? "verified on WhatsApp" : "terverifikasi lewat WhatsApp"}</p></div>
          <form action={customerLogoutAction}><button className="btn text-sm text-white/80 ring-1 ring-white/20 hover:bg-white/10"><LogOut className="h-4 w-4" /> {t.account.logout}</button></form>
        </div>
        {orders[0] && <div className="card flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="font-bold text-ocean-950">{fmt(t.account.reorderLike, { date: formatDate(orders[0].delivery_date, "short", locale) })}</p><p className="text-xs text-mute">{orders[0].items.map((i) => `${i.product_name} ${i.qty_ordered} ${i.unit}`).join(" · ")}</p></div><ReorderButton order={orders[0]} /></div>}
        <div className="grid gap-4 md:grid-cols-2">
          <AddressBook addresses={addresses} areas={areas} />
          <ProfileCard name={customer.name} marketing={customer.marketing_opt_in} />
        </div>
        <section>
          <h2 className="mb-3 font-bold text-ocean-950">{t.account.history}</h2>
          <OrderList orders={orders} t={t} locale={locale} />
        </section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <a href={waLink(settings.whatsapp_number, `${en ? "Hello" : "Halo"} ${settings.store_name}, ${en ? "this is" : "saya"} ${customer.name || `+${customer.phone}`}.`)} target="_blank" rel="noreferrer" className="btn-secondary"><MessageCircle className="h-4 w-4" /> {t.account.contactUs}</a>
          <DeleteAccount />
        </div>
      </div>
    );
  }
  const [orders, slots, standing, products] = await Promise.all([repo.getOrdersForAccount(account.id, 10), repo.getSlots(), repo.listStandingOrders({ accountId: account.id }), repo.getProducts()]);
  const runs = (await Promise.all(standing.map((s) => repo.listStandingRuns({ standingOrderId: s.id, limit: 3 })))).flat();
  const businessSlots = slots.filter((s) => s.segment !== "retail");
  const firstDate = availableDates(settings, nowJakarta())[0];
  const presets = orders.slice(0, 5).map((o) => ({ label: `${o.code} · ${formatDate(o.delivery_date, "short", locale)}`, lines: o.items.map((i) => ({ variant_id: i.variant_id, qty: i.qty_ordered, prep_option_id: i.prep_option_id })) }));
  const slot = slots.find((s) => s.id === account.preferred_slot_id);
  return (
    <div className="container-x max-w-4xl space-y-6 py-8 md:py-12">
      <div className="bg-ocean-950 p-6 text-white">
        <div className="flex items-start justify-between gap-3">
          <div><p className="eyebrow"><Store className="mr-1 inline h-3 w-3" />{t.account.title}</p><h1 className="mt-1 text-[2.4rem]">{account.business_name}</h1><p className="text-sm text-white/70">{account.contact_name} · +{account.phone}</p></div>
          <form action={businessLogoutAction}><button className="btn text-sm text-white/80 ring-1 ring-white/20 hover:bg-white/10"><LogOut className="h-4 w-4" /> {t.account.logout}</button></form>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-white/50">{t.account.price}</dt><dd className="font-bold">{t.account.wholesale}{account.discount_pct ? ` −${account.discount_pct}%` : ""}</dd></div>
          <div><dt className="text-white/50">{t.account.payment}</dt><dd className="font-bold">{t.terms[account.payment_terms]}{account.allow_cod ? " · COD" : ""}</dd></div>
          <div><dt className="text-white/50">{t.account.favSlot}</dt><dd className="font-bold">{slot ? jamRange(slot.start_time, slot.end_time) : "—"}</dd></div>
          <div><dt className="text-white/50">{t.account.minOrder}</dt><dd className="font-bold">{rupiah(settings.min_order_business)}</dd></div>
        </dl>
        <p className="mt-4 text-xs text-white/50">{t.account.kitchenAddress}: {account.address}</p>
      </div>
      {orders[0] && <div className="card flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="font-bold text-ocean-950">{fmt(t.account.reorderLike, { date: formatDate(orders[0].delivery_date, "short", locale) })}</p><p className="text-xs text-mute">{orders[0].items.map((i) => `${i.product_name} ${i.qty_ordered} ${i.unit}`).join(" · ")}</p></div><ReorderButton order={orders[0]} /></div>}
      {account.status === "approved" && <StandingOrdersPanel initial={standing} runs={runs} products={products} slots={businessSlots} payments={allowedPayments(account)} account={account} firstDate={firstDate} presets={presets} />}
      <section>
        <h2 className="mb-3 font-bold text-ocean-950">{t.account.history}</h2>
        {orders.length === 0 ? <p className="text-sm text-mute">{t.account.noOrders} <Link href="/belanja" className="font-bold text-gold-ink">{t.common.shopNow}</Link>.</p> : (
          <ul className="space-y-2">
            {orders.map((o) => (
              <li key={o.id} className="card flex items-center justify-between gap-3 p-4">
                <Link href={`/pesanan/${o.code}?hp=${o.phone}`} className="min-w-0 flex-1">
                  <p className="font-bold text-ocean-950">{o.code} <span className="ml-1 text-xs font-normal text-mute">{formatDate(o.delivery_date, "short", locale)}</span></p>
                  <p className="truncate text-xs text-mute">{o.items.map((i) => `${i.product_name} ${qtyUnit(i.qty_final ?? i.qty_ordered, i.unit, locale)}`).join(" · ")}</p>
                  <div className="mt-1 flex gap-1"><StatusBadge status={o.status} /><PaymentBadge status={o.payment_status} />{o.has_catch_weight && !o.weighed_at && <Badge>{t.account.awaitingWeigh}</Badge>}</div>
                </Link>
                <div className="flex flex-col items-end gap-2"><p className="text-sm font-bold">{rupiah(o.total_final ?? o.total_est)}</p><ReorderButton order={o} label={t.shop.repeat} className="btn-secondary px-3 py-1.5 text-xs" /></div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <a href={waLink(settings.whatsapp_number, `${locale === "en" ? "Hello" : "Halo"} ${settings.store_name}, ${locale === "en" ? "this is" : "saya dari"} ${account.business_name}.`)} target="_blank" rel="noreferrer" className="btn-secondary"><MessageCircle className="h-4 w-4" /> {t.account.contactUs}</a>
    </div>
  );
}
