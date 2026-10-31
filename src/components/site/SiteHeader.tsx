"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X, ShoppingBag } from "lucide-react";
import { Logo } from "@/components/Logo";

const NAV = [
  { href: "/belanja", label: "Belanja" },
  { href: "/restoran", label: "Untuk Restoran" },
  { href: "/tentang", label: "Sumber & Standar" },
  { href: "/cara-kerja", label: "Cara Kerja" },
];

export function SiteHeader({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const text = dark ? "text-white/80 hover:text-white" : "text-ink/70 hover:text-ocean-900";
  return (
    <header className={`sticky top-0 z-40 border-b backdrop-blur ${dark ? "border-white/10 bg-ocean-950/70" : "border-line/70 bg-sand-50/85"}`}>
      <div className="container-x flex h-16 items-center justify-between">
        <Link href="/" aria-label="Beranda"><Logo dark={dark} /></Link>
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`text-[14px] font-semibold ${text}`}>{n.label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/akun" className={`btn-ghost text-[14px] ${dark ? "text-white hover:bg-white/10" : ""}`}>Akun bisnis</Link>
          <Link href="/belanja" className="btn-accent text-[14px]"><ShoppingBag className="h-4 w-4" /> Mulai belanja</Link>
        </div>
        <button className={`md:hidden ${dark ? "text-white" : "text-ocean-900"}`} onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className={`md:hidden ${dark ? "bg-ocean-950 text-white" : "bg-sand-50"}`}>
          <div className="container-x flex flex-col gap-1 py-3">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-[15px] font-semibold hover:bg-black/5">{n.label}</Link>
            ))}
            <Link href="/akun" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-[15px] font-semibold hover:bg-black/5">Akun bisnis</Link>
            <Link href="/belanja" onClick={() => setOpen(false)} className="btn-accent mt-2">Mulai belanja</Link>
          </div>
        </div>
      )}
    </header>
  );
}
