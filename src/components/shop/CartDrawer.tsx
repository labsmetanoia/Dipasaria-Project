"use client";
import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { X, Trash2, ArrowRight, ShoppingBag } from "lucide-react";
import type { BusinessAccount, DeliveryArea, Product, Settings } from "@/lib/types";
import { quote } from "@/lib/pricing";
import { nowJakarta, rupiah } from "@/lib/format";
import { pick } from "@/lib/i18n";
import { fmt } from "@/lib/i18n/dict";
import { useT } from "@/lib/i18n/client";
import { useCart } from "@/store/cart";
import { QtyStepper } from "./QtyStepper";
import { ProductArt } from "@/components/ProductArt";
import { MinOrderBar } from "./CartView";

export function CartDrawer({ products, settings, areas, account }: { products: Product[]; settings: Settings; areas: DeliveryArea[]; account: BusinessAccount | null }) {
 const { t, locale } = useT();
 const { lines, drawerOpen, closeDrawer, setQty, remove } = useCart();
 const pathname = usePathname();
 useEffect(() => { closeDrawer(); }, [pathname, closeDrawer]);
 useEffect(() => {
 if (!drawerOpen) return;
 const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
 window.addEventListener("keydown", onKey);
 document.body.style.overflow = "hidden";
 return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [drawerOpen, closeDrawer]);
 if (!drawerOpen) return null;
 const q = quote({ settings, products, areas, promos: [], account, now: nowJakarta() }, { lines });
 return (
    <div className="fixed inset-0 z-[60]">
      <button className="absolute inset-0 bg-black/50" onClick={closeDrawer} aria-label={t.common.close} />
      <aside className="slide-in absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-sand-50 shadow-float">
        <div className="flex items-center justify-between border-b border-line bg-white px-5 py-4">
          <h2 className="text-2xl">{t.cart.title} <span className="font-sans text-sm font-bold text-mute">({lines.length})</span></h2>
          <button onClick={closeDrawer} className="p-1.5 hover:text-coral-600" aria-label={t.common.close}><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {lines.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center"><ShoppingBag className="h-8 w-8 text-coral-500" /><p className="mt-3 font-display text-2xl font-bold uppercase">{t.cart.empty}</p><Link href="/belanja" onClick={closeDrawer} className="btn-accent mt-5">{t.cart.emptyCta}</Link></div>
          ) : (
            <ul className="divide-y divide-line">
              {lines.map((l) => {
 const ql = q.lines.find((x) => x.variant.id === l.variant_id && (x.prep?.id ?? null) === (l.prep_option_id ?? null));
 const p = products.find((x) => x.id === l.product_id);
 const v = p?.variants.find((x) => x.id === l.variant_id);
 if (!p || !v) return null;
 return (
                  <li key={`${l.variant_id}|${l.prep_option_id}`} className="flex gap-3 py-3">
                    <div className="tile-bg h-20 w-20 flex-none"><ProductArt icon={p.icon} storage={p.storage_class} image={p.image_url} alt={p.name} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0"><p className="truncate font-display text-[17px] font-bold uppercase leading-tight">{locale === "en" && p.name_en ? p.name_en : p.name}</p><p className="truncate font-sans text-xs text-mute">{pick(locale, v.label, v.label_en)}{ql?.prep ? ` · ${pick(locale, ql.prep.label, ql.prep.label_en)}` : ""}</p></div>
                        <button onClick={() => remove(l.variant_id, l.prep_option_id)} className="p-1 text-mute hover:text-coral-600" aria-label={t.cart.remove}><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <QtyStepper size="sm" value={l.qty} min={v.min_qty} step={v.step_qty} unit={t.unit[v.unit]} onChange={(n) => setQty(l.variant_id, l.prep_option_id, n < v.min_qty ? 0 : n)} />
                        <p className="font-sans text-sm font-bold">{p.is_catch_weight && <span className="font-normal text-mute">± </span>}{rupiah(ql?.line_total ?? 0)}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {lines.length > 0 && (
          <div className="border-t border-line bg-white px-5 py-4">
            <MinOrderBar subtotal={q.subtotal} min={q.min_order} />
            <div className="mt-4 flex items-baseline justify-between"><span className="font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-mute">{t.cart.subtotal}{q.has_catch_weight ? ` (${t.common.estimated})` : ""}</span><span className="font-display text-3xl font-bold">{rupiah(q.subtotal)}</span></div>
            <p className="mt-1 font-sans text-[11.5px] text-mute">{t.cart.shipping}: {t.cart.shippingAtCheckout}</p>
            {q.errors.length > 0 && <p className="mt-2 font-sans text-xs text-coral-700">{q.errors[0]}</p>}
            <Link href="/checkout" onClick={closeDrawer} aria-disabled={!q.min_order_met || q.errors.length > 0} className={`btn-accent mt-4 w-full py-3.5 text-[13px] ${!q.min_order_met || q.errors.length ? "pointer-events-none opacity-50" : ""}`}>{t.cart.toDelivery} <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/keranjang" onClick={closeDrawer} className="btn-link mt-3 w-full justify-center">{fmt(t.shop.viewCart, {})}</Link>
          </div>
        )}
      </aside>
    </div>
  );
}
