"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, Search, ShoppingBag, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { LanguageToggle } from "./LanguageToggle";
import { useT } from "@/lib/i18n/client";

export function SiteHeader() {
  const { t } = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  const groups = [
    { label: t.nav.about, items: [{ href: "/tentang", label: t.nav.aboutStory }, { href: "/tentang#standar", label: t.nav.aboutStandards }] },
    { label: t.nav.services, items: [{ href: "/restoran", label: t.nav.forRestaurants }, { href: "/rumah-tangga", label: t.nav.forHouseholds }] },
  ];
  const links = [
    { href: "/produk", label: t.nav.products },
    { href: "/panduan", label: t.nav.guides },
    { href: "/kontak", label: t.nav.contact },
  ];
  const active = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href.split("#")[0]));

  return (
    <header className={`fixed inset-x-0 top-0 z-50 text-white transition-colors duration-300 ${scrolled || open ? "bg-ocean-950/95 backdrop-blur" : "bg-gradient-to-b from-ocean-950/70 to-transparent"}`}>
      <div className="container-x flex h-[72px] items-center justify-between">
        <Link href="/" aria-label="Dipasaria"><Logo dark /></Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {groups.map((g) => (
            <div key={g.label} className="group relative">
              <button className="flex items-center gap-1 rounded-full px-3.5 py-2 text-[14px] font-semibold text-white/85 hover:text-white">{g.label}<ChevronDown className="h-3.5 w-3.5 opacity-70" /></button>
              <div className="invisible absolute left-0 top-full pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
                <div className="min-w-56 rounded-2xl border border-white/10 bg-ocean-950 p-2 shadow-float">
                  {g.items.map((i) => <Link key={i.href} href={i.href} className="block rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-white/85 hover:bg-white/10 hover:text-white">{i.label}</Link>)}
                </div>
              </div>
            </div>
          ))}
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={`rounded-full px-3.5 py-2 text-[14px] font-semibold ${active(l.href) ? "text-coral-500" : "text-white/85 hover:text-white"}`}>{l.label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-1 lg:flex">
          <LanguageToggle dark compact />
          <Link href="/belanja/cari" aria-label={t.common.search} className="rounded-full p-2 text-white/85 hover:bg-white/10 hover:text-white"><Search className="h-4 w-4" /></Link>
          <Link href="/akun" className="rounded-full px-3.5 py-2 text-[14px] font-semibold text-white/85 hover:text-white">{t.nav.businessAccount}</Link>
          <Link href="/belanja" className="btn-accent ml-1 py-2 text-[14px]"><ShoppingBag className="h-4 w-4" /> {t.common.shop}</Link>
        </div>
        <div className="flex items-center gap-1 lg:hidden">
          <LanguageToggle dark compact />
          <Link href="/belanja" className="btn-accent px-4 py-2 text-[13px]">{t.common.shop}</Link>
          <button className="rounded-full p-2" onClick={() => setOpen((v) => !v)} aria-label="Menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-ocean-950 lg:hidden">
          <div className="container-x flex flex-col py-3">
            {groups.map((g) => (
              <div key={g.label} className="py-2">
                <p className="eyebrow mb-1 px-3 text-white/50">{g.label}</p>
                {g.items.map((i) => <Link key={i.href} href={i.href} className="block rounded-xl px-3 py-2.5 text-[16px] font-semibold text-white/90 hover:bg-white/10">{i.label}</Link>)}
              </div>
            ))}
            {links.map((l) => <Link key={l.href} href={l.href} className="rounded-xl px-3 py-2.5 text-[16px] font-semibold text-white/90 hover:bg-white/10">{l.label}</Link>)}
            <Link href="/akun" className="rounded-xl px-3 py-2.5 text-[16px] font-semibold text-white/90 hover:bg-white/10">{t.nav.businessAccount}</Link>
            <Link href="/pesanan" className="rounded-xl px-3 py-2.5 text-[16px] font-semibold text-white/90 hover:bg-white/10">{t.nav.track}</Link>
          </div>
        </div>
      )}
    </header>
  );
}
