"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/store/cart";
import { useT } from "@/lib/i18n/client";
import { fmt } from "@/lib/i18n/dict";

/** Toast on add-to-cart plus a sticky "view cart" bar on catalogue pages (mobile). */
export function CartToast() {
  const { t } = useT();
  const { lastAdded, lines } = useCart();
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!lastAdded) return;
    setVisible(true);
    const id = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(id);
  }, [lastAdded]);
  const onCatalogue = pathname.startsWith("/belanja");
  const n = mounted ? lines.length : 0;
  return (
    <>
      {visible && lastAdded && (
        <div className="toast-in fixed bottom-36 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ocean-950 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-float md:bottom-10">
          <ShoppingBag className="h-4 w-4 text-coral-500" /> {lastAdded.name} · {t.shop.added}
        </div>
      )}
      {onCatalogue && n > 0 && (
        <div className="fixed inset-x-4 bottom-[4.6rem] z-30 md:hidden">
          <Link href="/keranjang" className="flex items-center justify-between rounded-2xl bg-coral-500 px-4 py-3 text-white shadow-float">
            <span className="flex items-center gap-2 text-[14px] font-bold"><span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/20 px-1.5 text-[12px]">{n}</span>{fmt(t.shop.items, { n })}</span>
            <span className="flex items-center gap-1 text-[14px] font-bold">{t.shop.viewCart} <ArrowRight className="h-4 w-4" /></span>
          </Link>
        </div>
      )}
    </>
  );
}
