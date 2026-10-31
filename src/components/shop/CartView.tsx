"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Trash2, ArrowRight, ShoppingBag } from "lucide-react";
import type { BusinessAccount, DeliveryArea, Product, Settings } from "@/lib/types";
import { quote } from "@/lib/pricing";
import { nowJakarta, rupiah } from "@/lib/format";
import { UNIT_LABEL } from "@/lib/config";
import { useCart } from "@/store/cart";
import { QtyStepper } from "./QtyStepper";
import { ProductArt } from "@/components/ProductArt";
import { Empty } from "@/components/ui";

export function MinOrderBar({ subtotal, min }: { subtotal: number; min: number }) {
  const pct = Math.min(100, Math.round((subtotal / min) * 100));
  const left = Math.max(0, min - subtotal);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className={left > 0 ? "text-ink/70" : "font-semibold text-success-600"}>{left > 0 ? `Tambah ${rupiah(left)} lagi untuk minimum pesanan` : "Minimum pesanan terpenuhi"}</span>
        <span className="text-mute">{rupiah(min)}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sand-200">
        <div className={`h-full rounded-full transition-all ${left > 0 ? "bg-coral-500" : "bg-success-600"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function CartView({ products, settings, areas, account }: { products: Product[]; settings: Settings; areas: DeliveryArea[]; account: BusinessAccount | null }) {
  const { lines, setQty, remove } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-40 animate-pulse rounded-2xl bg-sand-100" />;

  const q = quote({ settings, products, areas, promos: [], account, now: nowJakarta() }, { lines });
  if (!lines.length) {
    return (
      <Empty title="Keranjang masih kosong" icon={<ShoppingBag className="h-8 w-8" />}>
        <Link href="/belanja" className="btn-primary mt-4">Lihat tangkapan hari ini</Link>
      </Empty>
    );
  }
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="min-w-0 space-y-3 lg:col-span-7">
        {q.errors.length > 0 && <div className="rounded-xl bg-coral-50 px-4 py-3 text-sm text-coral-700">{q.errors.map((e) => <p key={e}>{e}</p>)}</div>}
        {lines.map((l) => {
          const ql = q.lines.find((x) => x.variant.id === l.variant_id && (x.prep?.id ?? null) === (l.prep_option_id ?? null));
          const p = products.find((x) => x.id === l.product_id);
          if (!p) return null;
          const v = p.variants.find((x) => x.id === l.variant_id);
          return (
            <div key={`${l.variant_id}|${l.prep_option_id}`} className="card flex gap-3 p-3">
              <Link href={`/belanja/produk/${p.slug}`} className="h-20 w-20 flex-none overflow-hidden rounded-xl"><ProductArt icon={p.icon} storage={p.storage_class} image={p.image_url} alt={p.name} /></Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ocean-900">{p.name}</p>
                    <p className="truncate text-xs text-mute">{v?.label}{ql?.prep ? ` · ${ql.prep.label}` : ""}</p>
                  </div>
                  <button onClick={() => remove(l.variant_id, l.prep_option_id)} className="rounded-lg p-1.5 text-mute hover:bg-sand-100 hover:text-coral-600" aria-label="Hapus"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  {v && <QtyStepper size="sm" value={l.qty} min={v.min_qty} step={v.step_qty} unit={UNIT_LABEL[v.unit]} onChange={(n) => setQty(l.variant_id, l.prep_option_id, n < v.min_qty ? 0 : n)} />}
                  <p className="text-sm font-semibold">{p.is_catch_weight && <span className="text-xs font-normal text-mute">± </span>}{rupiah(ql?.line_total ?? 0)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <aside className="min-w-0 lg:col-span-5">
        <div className="card sticky top-32 p-5">
          <MinOrderBar subtotal={q.subtotal} min={q.min_order} />
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-mute">Subtotal {q.has_catch_weight && "(perkiraan)"}</dt><dd className="font-semibold">{rupiah(q.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Ongkir</dt><dd className="text-mute">dihitung saat checkout</dd></div>
          </dl>
          {q.has_catch_weight && <p className="mt-3 text-xs leading-relaxed text-mute">Produk bertanda ± ditimbang setelah disiapkan; total final dikonfirmasi via WhatsApp sebelum dikirim.</p>}
          <Link href="/checkout" aria-disabled={!q.min_order_met || q.errors.length > 0} className={`btn-accent mt-5 w-full ${!q.min_order_met || q.errors.length ? "pointer-events-none opacity-50" : ""}`}>
            Lanjut ke pengiriman <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/belanja" className="btn-ghost mt-2 w-full text-sm">Tambah produk lain</Link>
        </div>
      </aside>
    </div>
  );
}
