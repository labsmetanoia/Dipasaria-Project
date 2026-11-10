import Link from "next/link";
import { Instagram, MessageCircle, Send } from "lucide-react";
import { Logo, Seal } from "@/components/Logo";
import { waLink } from "@/lib/format";
import { fmt, type Dict } from "@/lib/i18n/dict";
import type { Locale } from "@/lib/i18n";
import type { Settings } from "@/lib/types";

export function Footer({ settings, t, locale }: { settings: Settings; t: Dict; locale: Locale }) {
 const en = locale === "en";
 const col = "space-y-2.5 font-sans text-[13.5px] text-white/75";
 const link = "block hover:text-coral-500";
 return (
    <footer className="bg-ocean-950 text-white">
      <div className="container-x grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo dark size="lg" descriptor />
          <p className="mt-5 max-w-xs font-sans text-[13.5px] leading-relaxed text-white/70">{en ? "A principal trader on the Muara Baru auction floor at 3 a.m. Named, size-graded seafood and halal chicken for Jakarta's restaurants and homes, delivered cold the next morning." : "Pedagang prinsipal yang hadir di lantai lelang Muara Baru sejak pukul tiga pagi. Seafood dengan jenis dan ukuran yang jelas, serta ayam halal, untuk restoran dan rumah tangga di Jakarta, diantar dingin keesokan paginya."}</p>
          <div className="mt-5 flex gap-2">
            <a href={waLink(settings.whatsapp_number, fmt(t.common.chatDefault, { store: settings.store_name }))} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="flex h-9 w-9 items-center justify-center border border-white/20 hover:border-coral-500 hover:text-coral-500"><MessageCircle className="h-4 w-4" /></a>
            {settings.instagram && <a href={`https://instagram.com/${settings.instagram}`} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center border border-white/20 hover:border-coral-500 hover:text-coral-500"><Instagram className="h-4 w-4" /></a>}
          </div>
        </div>
        <div className="md:col-span-2">
          <h3 className="mb-4 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-coral-500">{en ? "Support" : "Bantuan"}</h3>
          <div className={col}>
            <Link className={link} href="/rumah-tangga">{en ? "How it works & FAQ" : "Cara kerja dan tanya jawab"}</Link>
            <Link className={link} href="/kontak">{t.nav.contact}</Link>
            <Link className={link} href="/pesanan">{t.nav.track}</Link>
            <Link className={link} href="/tentang#standar">{en ? "Halal & standards" : "Halal dan standar mutu"}</Link>
            <Link className={link} href="/privasi">{t.footer.privacy}</Link>
          </div>
        </div>
        <div className="md:col-span-2">
          <h3 className="mb-4 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-coral-500">{t.nav.about}</h3>
          <div className={col}>
            <Link className={link} href="/tentang">{t.nav.aboutStory}</Link>
            <Link className={link} href="/restoran">{t.nav.forRestaurants}</Link>
            <Link className={link} href="/panduan">{t.nav.guides}</Link>
            <Link className={link} href="/akun">{t.nav.businessAccount}</Link>
            <Link className={link} href="/restoran#daftar">{t.account.register}</Link>
          </div>
        </div>
        <div className="md:col-span-4">
          <h3 className="mb-2 font-sans text-[11px] font-bold uppercase tracking-[0.22em] text-coral-500">{en ? "Daily catch on WhatsApp" : "Kabar tangkapan harian"}</h3>
          <p className="font-sans text-[12.5px] text-white/60">{en ? "Get the morning's species, grades and prices before the 20:00 cut-off." : "Dapatkan daftar jenis, ukuran dan harga tangkapan pagi ini sebelum batas pemesanan pukul 20.00."}</p>
          <form action={waLink(settings.whatsapp_number, en ? `Hello ${settings.store_name}, please add me to the daily catch broadcast.` : `Halo ${settings.store_name}, daftarkan saya ke broadcast tangkapan harian.`)} method="get" target="_blank" className="mt-4 flex border-b border-white/30">
            <input className="w-full bg-transparent py-2 font-sans text-[13px] uppercase tracking-wider text-white placeholder:text-white/40 focus:outline-none" placeholder={en ? "Your WhatsApp number" : "Nomor WhatsApp Anda"} />
            <button className="px-2 text-white/70 hover:text-coral-500" aria-label="Subscribe"><Send className="h-4 w-4" /></button>
          </form>
          <p className="mt-6 font-sans text-[12px] text-white/50">{settings.address_line} · +{settings.whatsapp_number} · 08.00–21.00 WIB</p>
        </div>
      </div>
      <div className="container-x flex items-center justify-between gap-6 border-t border-white/10 py-8">
        <p className="max-w-md font-display text-[1.6rem] font-bold uppercase leading-none text-white/90">{en ? "Fresh from the dawn auction, ready for your kitchen." : "Segar dari lelang subuh, siap untuk dapur Anda."}</p>
        <Seal className="h-24 w-24 flex-none opacity-90 sm:h-28 sm:w-28" />
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-1 py-4 font-sans text-[11px] uppercase tracking-[0.12em] text-white/45 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Dipasaria. {t.footer.rights} {en ? "Seafood-led protein supplier, Jakarta." : "Pemasok protein pilihan berbasis seafood, Jakarta."}</p>
          <p>{t.footer.note}</p>
        </div>
      </div>
    </footer>
  );
}
