"use client";
import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/store/cart";
import { useT } from "@/lib/i18n/client";

/** Brief confirmation when something is added (the drawer opens too). */
export function CartToast() {
 const { t } = useT();
 const lastAdded = useCart((s) => s.lastAdded);
 const [visible, setVisible] = useState(false);
 useEffect(() => { if (!lastAdded) return; setVisible(true); const id = setTimeout(() => setVisible(false), 1800); return () => clearTimeout(id); }, [lastAdded]);
 if (!visible || !lastAdded) return null;
 return <div className="toast-in fixed bottom-8 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 bg-ocean-950 px-4 py-2.5 font-sans text-[12px] font-bold uppercase tracking-[0.12em] text-white shadow-float"><ShoppingBag className="h-4 w-4 text-coral-500" /> {lastAdded.name} · {t.shop.added}</div>;
}
