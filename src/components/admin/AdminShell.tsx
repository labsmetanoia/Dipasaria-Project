"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, ShoppingBasket, Route, Package, Users, Tag, Settings, BarChart3, LogOut, ExternalLink, Repeat } from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";
import { adminLogoutAction } from "@/actions/admin";

const NAV = [
  { href: "/admin", label: "Ringkasan", Icon: LayoutDashboard, exact: true },
  { href: "/admin/pesanan", label: "Pesanan", Icon: ClipboardList },
  { href: "/admin/rutin", label: "Pesanan rutin", Icon: Repeat },
  { href: "/admin/belanja-subuh", label: "Belanja subuh", Icon: ShoppingBasket },
  { href: "/admin/rute", label: "Rute dan pengemasan", Icon: Route },
  { href: "/admin/produk", label: "Produk dan stok", Icon: Package },
  { href: "/admin/pelanggan", label: "Pelanggan", Icon: Users },
  { href: "/admin/promo", label: "Promo", Icon: Tag },
  { href: "/admin/laporan", label: "Laporan", Icon: BarChart3 },
  { href: "/admin/pengaturan", label: "Pengaturan", Icon: Settings },
];
const MOBILE = ["/admin", "/admin/pesanan", "/admin/belanja-subuh", "/admin/rute", "/admin/produk"];

export function AdminShell({ children, demo }: { children: React.ReactNode; demo: boolean }) {
  const pathname = usePathname();
  const active = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));
  return (
    <div className="flex min-h-screen bg-sand-50">
      <aside className="no-print hidden w-60 flex-none flex-col border-r border-line bg-white md:flex">
        <div className="px-5 py-5"><Logo size="sm" /><p className="mt-2 pl-[2px] font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-gold-ink">Panel pengelola</p></div>
        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map(({ href, label, Icon, exact }) => (
            <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium ${active(href, exact) ? "bg-ocean-900 text-white" : "text-ink/70 hover:bg-sand-100"}`}><Icon className="h-4 w-4" />{label}</Link>
          ))}
        </nav>
        <div className="space-y-1 border-t border-line p-3">
          <Link href="/belanja" target="_blank" className="flex items-center gap-3 px-3 py-2 text-sm text-ink/70 hover:bg-sand-100"><ExternalLink className="h-4 w-4" />Lihat toko</Link>
          <form action={adminLogoutAction}><button className="flex w-full items-center gap-3 px-3 py-2 text-sm text-ink/70 hover:bg-sand-100"><LogOut className="h-4 w-4" />Keluar</button></form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {demo && <div className="no-print bg-warn-600 px-3 py-1 text-center text-[11px] font-semibold text-white">Mode demo · tanpa Supabase; data contoh tersimpan di memori dan akan hilang saat server dimulai ulang</div>}
        <header className="no-print flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden">
          <div className="flex items-center gap-2"><LogoMark className="h-7 w-7" tile /><span className="font-display text-[17px] font-extrabold uppercase tracking-[0.1em] text-ocean-950">Panel pengelola</span></div>
          <div className="flex items-center gap-1">
            {NAV.filter((n) => !MOBILE.includes(n.href)).map(({ href, label, Icon }) => (
              <Link key={href} href={href} aria-label={label} className={`rounded-lg p-2 ${active(href) ? "bg-ocean-900 text-white" : "text-ink/60"}`}><Icon className="h-4 w-4" /></Link>
            ))}
          </div>
        </header>
        <main className="flex-1 px-4 py-5 pb-24 md:px-8 md:py-8 md:pb-10">{children}</main>
        <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-safe backdrop-blur md:hidden">
          <ul className="grid grid-cols-5">
            {NAV.filter((n) => MOBILE.includes(n.href)).map(({ href, label, Icon, exact }) => (
              <li key={href}><Link href={href} className={`flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium ${active(href, exact) ? "text-ocean-900" : "text-mute"}`}><Icon className="h-5 w-5" />{label}</Link></li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
