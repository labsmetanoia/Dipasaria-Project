import Link from "next/link";
import { LogOut, Store, MessageCircle } from "lucide-react";
import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { fmt } from "@/lib/i18n/dict";
import { BusinessLogin } from "@/components/shop/BusinessLogin";
import { ReorderButton } from "@/components/shop/ReorderPanel";
import { businessLogoutAction } from "@/actions/shop";
import { formatDate, rupiah, waLink } from "@/lib/format";
import { StatusBadge, PaymentBadge, Badge } from "@/components/ui";

export const metadata = { title: "Akun" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const repo = await getRepo();
  const [account, { t, locale }] = await Promise.all([getCurrentAccount(), getT()]);
  const settings = await repo.getSettings();
  if (!account) return <div className="mx-auto max-w-lg space-y-4"><h1 className="text-2xl text-ocean-950">{t.account.title}</h1><p className="text-sm text-mute">{t.account.sub}</p><BusinessLogin demoHint={repo.mode === "memory"} /></div>;
  const [orders, slots] = await Promise.all([repo.getOrdersForAccount(account.id, 10), repo.getSlots()]);
  const slot = slots.find((s) => s.id === account.preferred_slot_id);
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-ocean-950 p-6 text-white">
        <div className="flex items-start justify-between gap-3">
          <div><p className="eyebrow"><Store className="mr-1 inline h-3 w-3" />{t.account.title}</p><h1 className="mt-1 text-2xl">{account.business_name}</h1><p className="text-sm text-white/70">{account.contact_name} · +{account.phone}</p></div>
          <form action={businessLogoutAction}><button className="btn text-sm text-white/80 ring-1 ring-white/20 hover:bg-white/10"><LogOut className="h-4 w-4" /> {t.account.logout}</button></form>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-white/50">{t.account.price}</dt><dd className="font-bold">{t.account.wholesale}{account.discount_pct ? ` −${account.discount_pct}%` : ""}</dd></div>
          <div><dt className="text-white/50">{t.account.payment}</dt><dd className="font-bold">{t.terms[account.payment_terms]}{account.allow_cod ? " · COD" : ""}</dd></div>
          <div><dt className="text-white/50">{t.account.favSlot}</dt><dd className="font-bold">{slot ? `${slot.start_time}–${slot.end_time}` : "—"}</dd></div>
          <div><dt className="text-white/50">{t.account.minOrder}</dt><dd className="font-bold">{rupiah(settings.min_order_business)}</dd></div>
        </dl>
        <p className="mt-4 text-xs text-white/50">{t.account.kitchenAddress}: {account.address}</p>
      </div>
      {orders[0] && <div className="card flex flex-wrap items-center justify-between gap-3 p-5"><div><p className="font-bold text-ocean-950">{fmt(t.account.reorderLike, { date: formatDate(orders[0].delivery_date, "short", locale) })}</p><p className="text-xs text-mute">{orders[0].items.map((i) => `${i.product_name} ${i.qty_ordered} ${i.unit}`).join(" · ")}</p></div><ReorderButton order={orders[0]} /></div>}
      <section>
        <h2 className="mb-3 font-bold text-ocean-950">{t.account.history}</h2>
        {orders.length === 0 ? <p className="text-sm text-mute">{t.account.noOrders} <Link href="/belanja" className="font-bold text-coral-600">{t.common.shopNow}</Link>.</p> : (
          <ul className="space-y-2">
            {orders.map((o) => (
              <li key={o.id} className="card flex items-center justify-between gap-3 p-4">
                <Link href={`/pesanan/${o.code}?hp=${o.phone}`} className="min-w-0 flex-1">
                  <p className="font-bold text-ocean-950">{o.code} <span className="ml-1 text-xs font-normal text-mute">{formatDate(o.delivery_date, "short", locale)}</span></p>
                  <p className="truncate text-xs text-mute">{o.items.map((i) => `${i.product_name} ${i.qty_final ?? i.qty_ordered} ${i.unit}`).join(" · ")}</p>
                  <div className="mt-1 flex gap-1"><StatusBadge status={o.status} /><PaymentBadge status={o.payment_status} />{o.has_catch_weight && !o.weighed_at && <Badge>{t.account.awaitingWeigh}</Badge>}</div>
                </Link>
                <div className="flex flex-col items-end gap-2"><p className="text-sm font-bold">{rupiah(o.total_final ?? o.total_est)}</p><ReorderButton order={o} label={t.shop.repeat} className="btn-secondary px-3 py-1.5 text-xs" /></div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <a href={waLink(settings.whatsapp_number, `${locale === "en" ? "Hello" : "Halo"} ${settings.store_name}, ${account.business_name}.`)} target="_blank" rel="noreferrer" className="btn-secondary"><MessageCircle className="h-4 w-4" /> {t.account.contactUs}</a>
    </div>
  );
}
