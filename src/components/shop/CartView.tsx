"use client";
import Link from "next/link";
import { Emblem } from "@/components/Logo";
import { useEffect, useState } from "react";
import { Trash2, ArrowRight } from "lucide-react";
import type { BusinessAccount, DeliveryArea, Product, Settings } from "@/lib/types";
import { quote } from "@/lib/pricing";
import { nowJakarta, rupiah } from "@/lib/format";
import { pick } from "@/lib/i18n";
import { fmt } from "@/lib/i18n/dict";
import { useT } from "@/lib/i18n/client";
import { useCart } from "@/store/cart";
import { QtyStepper } from "./QtyStepper";
import { ProductArt } from "@/components/ProductArt";
import { Empty } from "@/components/ui";

/** Two-stage progress: first to the minimum order, then on to the free-delivery threshold. */
export function MinOrderBar({ subtotal, min, free }: { subtotal: number; min: number; free?: number }) {
 const { t } = useT();
 const minMet = subtotal >= min;
 if (minMet && free && free > min) {
 const leftFree = Math.max(0, free - subtotal);
 const pctFree = Math.min(100, Math.round((subtotal / free) * 100));
 return (
      <div>
        <div className="flex items-center justify-between text-xs">
          <span className={leftFree > 0 ? "text-ink/70" : "font-bold text-success-600"}>{leftFree > 0 ? fmt(t.cart.freeMore, { amount: rupiah(leftFree) }) : t.cart.freeMet}</span>
          <span className="text-mute">{rupiah(free)}</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sand-200"><div className={`h-full rounded-full transition-all ${leftFree > 0 ? "bg-ocean-950" : "bg-success-600"}`} style={{ width: `${pctFree}%` }} /></div>
        {leftFree > 0 && <p className="mt-1 text-[11px] font-semibold text-success-600">✓ {t.cart.minMet}</p>}
      </div>
    );
  }
 const pct = Math.min(100, Math.round((subtotal / min) * 100));
 const left = Math.max(0, min - subtotal);
 return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className={left > 0 ? "text-ink/70" : "font-bold text-success-600"}>{left > 0 ? fmt(t.cart.addMore, { amount: rupiah(left) }) : t.cart.minMet}</span>
        <span className="text-mute">{rupiah(min)}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sand-200"><div className={`h-full rounded-full transition-all ${left > 0 ? "bg-coral-500" : "bg-success-600"}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function CartView({ products, settings, areas, account }: { products: Product[]; settings: Settings; areas: DeliveryArea[]; account: BusinessAccount | null }) {
 const { t, locale } = useT();
 const { lines, setQty, remove } = useCart();
 const [mounted, setMounted] = useState(false);
 useEffect(() => setMounted(true), []);
 if (!mounted) return <div className="h-40 animate-pulse bg-sand-100" />;
 const q = quote({ settings, products, areas, promos: [], account, now: nowJakarta() }, { lines });
 if (!lines.length) {
 return <Empty title={t.cart.empty} icon={<Emblem className="h-20 w-20" />}><Link href="/belanja" className="btn-primary mt-4">{t.cart.emptyCta}</Link></Empty>;
  }
 return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="min-w-0 space-y-3 lg:col-span-7">
        {q.errors.length > 0 && <div className=" bg-coral-50 px-4 py-3 text-sm text-gold-ink">{q.errors.map((e) => <p key={e}>{e}</p>)}</div>}
        {lines.map((l) => {
 const ql = q.lines.find((x) => x.variant.id === l.variant_id && (x.prep?.id ?? null) === (l.prep_option_id ?? null));
 const p = products.find((x) => x.id === l.product_id);
 if (!p) return null;
 const v = p.variants.find((x) => x.id === l.variant_id);
 return (
            <div key={`${l.variant_id}|${l.prep_option_id}`} className="card flex gap-3 p-3">
              <Link href={`/belanja/produk/${p.slug}`} className="h-20 w-20 flex-none overflow-hidden "><ProductArt icon={p.icon} storage={p.storage_class} image={p.image_url} alt={p.name} /></Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="truncate font-bold text-ocean-950">{locale === "en" && p.name_en ? p.name_en : p.name}</p><p className="truncate text-xs text-mute">{v && pick(locale, v.label, v.label_en)}{ql?.prep ? ` · ${pick(locale, ql.prep.label, ql.prep.label_en)}` : ""}</p></div>
                  <button onClick={() => remove(l.variant_id, l.prep_option_id)} className=" p-1.5 text-mute hover:bg-sand-100 hover:text-gold-ink" aria-label={t.cart.remove}><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  {v && <QtyStepper size="sm" value={l.qty} min={v.min_qty} step={v.step_qty} unit={t.unit[v.unit]} onChange={(n) => setQty(l.variant_id, l.prep_option_id, n < v.min_qty ? 0 : n)} />}
                  <p className="text-sm font-bold">{p.is_catch_weight && <span className="text-xs font-normal text-mute">± </span>}{rupiah(ql?.line_total ?? 0)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <aside className="min-w-0 lg:col-span-5">
        <div className="card sticky top-32 p-5">
          <MinOrderBar subtotal={q.subtotal} min={q.min_order} free={account?.status === "approved" ? settings.free_delivery_business : settings.free_delivery_retail} />
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-mute">{t.cart.subtotal} {q.has_catch_weight && `(${t.common.estimated})`}</dt><dd className="font-bold">{rupiah(q.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-mute">{t.cart.shipping}</dt><dd className="text-mute">{t.cart.shippingAtCheckout}</dd></div>
          </dl>
          {q.has_catch_weight && <p className="mt-3 text-xs leading-relaxed text-mute">{t.cart.catchNote}</p>}
          <Link href="/checkout" aria-disabled={!q.min_order_met || q.errors.length > 0} className={`btn-accent mt-5 w-full ${!q.min_order_met || q.errors.length ? "pointer-events-none opacity-50" : ""}`}>{t.cart.toDelivery} <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/belanja" className="btn-ghost mt-2 w-full text-sm">{t.cart.addOther}</Link>
        </div>
      </aside>
    </div>
  );
}
