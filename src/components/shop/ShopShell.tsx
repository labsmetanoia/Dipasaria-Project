"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Search, ShoppingBag, ClipboardList, UserRound, ChevronLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useCart } from "@/store/cart";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";
import { LanguageToggle } from "@/components/site/LanguageToggle";

function useTabs() {
  const { t } = useT();
  return [
    { href: "/belanja", label: t.shop.home, Icon: Home, match: (p: string) => p === "/belanja" },
    { href: "/belanja/kategori/ikan-segar", label: t.shop.categories, Icon: LayoutGrid, match: (p: string) => p.startsWith("/belanja/kategori") || p.startsWith("/belanja/produk") },
    { href: "/belanja/cari", label: t.shop.search, Icon: Search, match: (p: string) => p.startsWith("/belanja/cari") },
    { href: "/keranjang", label: t.shop.cart, Icon: ShoppingBag, match: (p: string) => p.startsWith("/keranjang") || p.startsWith("/checkout") },
    { href: "/pesanan", label: t.shop.orders, Icon: ClipboardList, match: (p: string) => p.startsWith("/pesanan") },
  ];
}

export function ShopTopBar({ accountName, demo }: { accountName: string | null; demo: boolean }) {
  const { t } = useT();
  const tabs = useTabs();
  const pathname = usePathname();
  const isRoot = pathname === "/belanja";
  return (
    <div className="bg-ocean-950 text-white">
      {demo && <div className="bg-ocean-900 px-3 py-1 text-center text-[11px] font-medium text-white/60">{t.common.demoBanner}</div>}
      <div className="container-x flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          {!isRoot && <button onClick={() => history.back()} className="-ml-2 rounded-full p-1.5 hover:bg-white/10 md:hidden" aria-label={t.common.back}><ChevronLeft className="h-5 w-5" /></button>}
          <Link href="/" aria-label="Dipasaria" className="hidden md:block"><Logo dark size="sm" /></Link>
          <Link href="/belanja" aria-label="Dipasaria" className="md:hidden"><Logo dark size="sm" /></Link>
        </div>
        <div className="flex items-center gap-1">
          <nav className="mr-2 hidden items-center gap-1 md:flex">
            {tabs.map((tab) => <Link key={tab.href} href={tab.href} className={`rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold ${tab.match(pathname) ? "bg-white/15" : "text-white/80 hover:bg-white/10"}`}>{tab.label}</Link>)}
          </nav>
          <LanguageToggle dark compact />
          <Link href="/akun" className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-bold ${accountName ? "bg-coral-500 text-white" : "bg-white/10 hover:bg-white/20"}`}>
            <UserRound className="h-3.5 w-3.5" /><span className="max-w-[9rem] truncate">{accountName ?? t.nav.businessAccount}</span>
          </Link>
          <CartIndicator />
        </div>
      </div>
    </div>
  );
}

function CartIndicator() {
  const lines = useCart((s) => s.lines);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const n = mounted ? lines.length : 0;
  return (
    <Link href="/keranjang" className="relative ml-1 hidden rounded-full bg-white/10 p-2 hover:bg-white/20 md:inline-flex" aria-label="Cart">
      <ShoppingBag className="h-4 w-4" />
      {n > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-bold">{n}</span>}
    </Link>
  );
}

export function BottomTabs() {
  const tabs = useTabs();
  const pathname = usePathname();
  const lines = useCart((s) => s.lines);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-safe backdrop-blur md:hidden">
      <ul className="grid grid-cols-5">
        {tabs.map(({ href, label, Icon, match }) => {
          const on = match(pathname);
          return (
            <li key={href}>
              <Link href={href} className={`relative flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-semibold ${on ? "text-ocean-950" : "text-mute"}`}>
                <Icon className={`h-5 w-5 ${on ? "stroke-[2.4]" : ""}`} />{label}
                {href === "/keranjang" && mounted && lines.length > 0 && <span className="absolute right-[22%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-bold text-white">{lines.length}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
