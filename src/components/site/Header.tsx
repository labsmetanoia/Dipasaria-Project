"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, Search, ShoppingBag, UserRound, X, Clock } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ProductIcon } from "@/components/Icons";
import { LanguageToggle } from "./LanguageToggle";
import { useT } from "@/lib/i18n/client";
import { pick } from "@/lib/i18n";
import { fmt } from "@/lib/i18n/dict";
import { useCart } from "@/store/cart";
import { nowJakarta, parseTime, addDays, formatDate } from "@/lib/format";
import type { Category } from "@/lib/types";

export function Header({ categories, cutoff, accountName }: { categories: Category[]; cutoff: string; accountName: string | null }) {
 const { t, locale } = useT();
 const pathname = usePathname();
 const [open, setOpen] = useState(false);
 const [mega, setMega] = useState(false);
 const { lines, openDrawer } = useCart();
 const [mounted, setMounted] = useState(false);
 useEffect(() => setMounted(true), []);
 useEffect(() => { setOpen(false); setMega(false); }, [pathname]);
 const n = mounted ? lines.length : 0;
 const links = [
    { href: "/restoran", label: t.nav.forRestaurants },
    { href: "/panduan", label: t.nav.guides },
    { href: "/tentang", label: t.nav.about },
    { href: "/kontak", label: t.nav.contact },
  ];
 const active = (href: string) => pathname.startsWith(href);
 const navCls = (on: boolean) => `px-3 py-2 font-sans text-[12.5px] font-bold uppercase tracking-[0.14em] transition ${on ? "text-coral-500" : "text-white/85 hover:text-coral-500"}`;

 return (
    <header className="sticky top-0 z-50">
      <div className="bg-ocean-950 text-white">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-2 lg:hidden">
            <button className="p-2" onClick={() => setOpen((v) => !v)} aria-label="Menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
          <Link href="/belanja" aria-label="Dipasaria" className="shrink-0"><Logo dark /></Link>
          <nav className="hidden flex-1 items-center justify-center lg:flex" onMouseLeave={() => setMega(false)}>
            <div className="relative" onMouseEnter={() => setMega(true)}>
              <Link href="/belanja" className={`${navCls(active("/belanja") || active("/keranjang"))} inline-flex items-center gap-1`}>{t.common.shop} <ChevronDown className="h-3.5 w-3.5" /></Link>
              {mega && (
                <div className="absolute left-1/2 top-full z-50 w-[760px] -translate-x-1/2 pt-3">
                  <div className="grid grid-cols-12 border border-white/10 bg-ocean-950 shadow-float">
                    <div className="col-span-7 grid grid-cols-2 gap-1 p-5">
                      <p className="col-span-2 mb-2 font-sans text-[10.5px] font-bold uppercase tracking-[0.22em] text-coral-500">{t.shop.categories}</p>
                      {categories.map((c) => (
                        <Link key={c.id} href={`/belanja/kategori/${c.slug}`} className="flex items-center gap-3 px-2 py-2 hover:bg-white/5">
                          <span className="flex h-9 w-9 items-center justify-center bg-white/5 text-coral-500"><ProductIcon name={c.icon} className="h-5 w-5" /></span>
                          <span className="font-display text-[17px] font-bold uppercase leading-none">{pick(locale, c.name, c.name_en)}</span>
                        </Link>
                      ))}
                      <Link href="/belanja/semua" className="col-span-2 mt-2 px-2 font-sans text-[11.5px] font-bold uppercase tracking-[0.14em] text-coral-500 hover:text-white">{t.shop.allProducts} →</Link>
                    </div>
                    <div className="col-span-5 flex flex-col border-l border-white/10 bg-ocean-900">
                      <Link href="/belanja/kategori/ikan-segar" className="group relative block h-40 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/images/site/cat-ikan-segar.jpg" alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <div className="absolute bottom-3 left-4"><p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-coral-500">{t.shop.todaysCatch}</p><p className="font-display text-[20px] font-bold uppercase leading-none">{locale === "en" ? "Auctioned at dawn" : "Dilelang subuh"} →</p></div>
                      </Link>
                      <div className="space-y-1 p-5">
                        {[["/belanja/kategori/paket-hemat", locale === "en" ? "Value boxes" : "Paket hemat"], ["/akun", t.nav.businessAccount], ["/pesanan", t.nav.track]].map(([h, l]) => (
                          <Link key={h} href={h} className="block px-2 py-1.5 font-display text-[17px] font-bold uppercase leading-none text-white/85 hover:text-coral-500">{l}</Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {links.map((l) => <Link key={l.href} href={l.href} className={navCls(active(l.href))}>{l.label}</Link>)}
          </nav>
          <div className="flex items-center gap-0.5">
            <div className="hidden lg:block"><LanguageToggle dark compact /></div>
            <Link href="/belanja/cari" aria-label={t.common.search} className="p-2 text-white/85 hover:text-coral-500"><Search className="h-5 w-5" /></Link>
            <Link href="/akun" aria-label={t.nav.businessAccount} className={`p-2 ${accountName ? "text-coral-500" : "text-white/85 hover:text-coral-500"}`}><UserRound className="h-5 w-5" /></Link>
            <button onClick={openDrawer} aria-label={t.shop.cart} className="relative p-2 text-white/85 hover:text-coral-500">
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-500 px-1 font-sans text-[10px] font-bold text-ocean-950">{n}</span>
            </button>
          </div>
        </div>
        {open && (
          <div className="border-t border-white/10 lg:hidden">
            <div className="container-x py-4">
              <p className="eyebrow mb-2">{t.shop.categories}</p>
              <div className="grid grid-cols-2 gap-1">
                {categories.map((c) => <Link key={c.id} href={`/belanja/kategori/${c.slug}`} className="flex items-center gap-2 py-2 font-display text-[18px] font-bold uppercase leading-none"><ProductIcon name={c.icon} className="h-5 w-5 text-coral-500" />{pick(locale, c.name, c.name_en)}</Link>)}
              </div>
              <div className="mt-4 border-t border-white/10 pt-3">
                {[["/belanja/semua", t.shop.allProducts], ...links.map((l) => [l.href, l.label]), ["/akun", t.nav.businessAccount], ["/pesanan", t.nav.track]].map(([h, l]) => <Link key={h} href={h} className="block py-2 font-sans text-[13px] font-bold uppercase tracking-[0.14em] text-white/85">{l}</Link>)}
                <div className="mt-2"><LanguageToggle dark /></div>
              </div>
            </div>
          </div>
        )}
      </div>
      <CutoffStrip cutoff={cutoff} accountName={accountName} />
    </header>
  );
}

function CutoffStrip({ cutoff, accountName }: { cutoff: string; accountName: string | null }) {
 const { t, locale } = useT();
 const [now, setNow] = useState(() => nowJakarta());
 useEffect(() => { const id = setInterval(() => setNow(nowJakarta()), 30_000); return () => clearInterval(id); }, []);
 const remaining = parseTime(cutoff) - now.minutesOfDay;
 const before = remaining > 0;
 const h = Math.floor(remaining / 60), m = remaining % 60;
 const nextDate = formatDate(before ? addDays(now.date, 1) : addDays(now.date, 2), "weekday", locale);
 const time = `${h > 0 ? `${h} ${t.shop.hours} ` : ""}${m} ${t.shop.minutes}`;
 return (
    <div className="bg-coral-500 text-ocean-950">
      <div className="container-x flex items-center justify-between gap-3 py-1.5 font-sans text-[11.5px] font-bold uppercase tracking-[0.12em]">
        <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" />{before ? fmt(t.shop.cutoffBefore, { time, date: nextDate }) : fmt(t.shop.cutoffAfter, { cutoff, date: nextDate })}</span>
        {!accountName && <Link href="/restoran#daftar" className="hidden shrink-0 border border-ocean-950 px-2.5 py-0.5 hover:bg-ocean-950 hover:text-coral-500 sm:inline-block">{t.nav.businessAccount} →</Link>}
      </div>
    </div>
  );
}
