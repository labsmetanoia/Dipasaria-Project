import Link from "next/link";
import { Instagram, MapPin, MessageCircle, ShieldCheck, Snowflake, BadgeCheck, ListX } from "lucide-react";
import { Logo } from "@/components/Logo";
import { BRAND } from "@/lib/config";
import { waLink } from "@/lib/format";
import { fmt, type Dict } from "@/lib/i18n/dict";
import type { Locale } from "@/lib/i18n";
import type { Settings } from "@/lib/types";

export function SiteFooter({ settings, t, locale }: { settings: Settings; t: Dict; locale: Locale }) {
  const standards = [
    { Icon: BadgeCheck, label: t.footer.halal },
    { Icon: ShieldCheck, label: t.footer.nkv },
    { Icon: Snowflake, label: t.footer.coldChain },
    { Icon: ListX, label: t.footer.doNotSell },
  ];
  return (
    <footer className="border-t border-line bg-white">
      <div className="container-x grid gap-12 py-16 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Logo size="lg" />
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-mute">{locale === "en" ? "The right fish, named and graded, with everything else on your protein list in the same box." : BRAND.promise}</p>
          <dl className="mt-8 space-y-4 text-[14.5px]">
            <div className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 flex-none text-coral-500" /><div><dt className="font-semibold text-coral-600">{t.footer.hq}</dt><dd className="text-ink/80">{settings.address_line}, Indonesia</dd></div></div>
            <div className="flex gap-3"><MessageCircle className="mt-0.5 h-4 w-4 flex-none text-coral-500" /><div><dt className="font-semibold text-coral-600">{t.footer.service}</dt><dd><a className="text-tide-600 hover:underline" href={waLink(settings.whatsapp_number, fmt(t.common.chatDefault, { store: settings.store_name }))} target="_blank" rel="noreferrer">+{settings.whatsapp_number}</a><span className="text-mute"> · 08.00–21.00 WIB</span></dd></div></div>
            {settings.instagram && <div className="flex gap-3"><Instagram className="mt-0.5 h-4 w-4 flex-none text-coral-500" /><div><dt className="font-semibold text-coral-600">{t.footer.follow}</dt><dd><a className="text-tide-600 hover:underline" href={`https://instagram.com/${settings.instagram}`} target="_blank" rel="noreferrer">@{settings.instagram}</a></dd></div></div>}
          </dl>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:col-span-4">
          <div>
            <p className="eyebrow">{t.footer.company}</p>
            <ul className="mt-4 space-y-2.5 text-[15px] font-medium">
              <li><Link className="hover:text-coral-600" href="/tentang">{t.nav.aboutStory}</Link></li>
              <li><Link className="hover:text-coral-600" href="/tentang#standar">{t.nav.aboutStandards}</Link></li>
              <li><Link className="hover:text-coral-600" href="/produk">{t.nav.products}</Link></li>
              <li><Link className="hover:text-coral-600" href="/panduan">{t.nav.guides}</Link></li>
              <li><Link className="hover:text-coral-600" href="/kontak">{t.nav.contact}</Link></li>
              <li><Link className="hover:text-coral-600" href="/privasi">{t.footer.privacy}</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow">{t.common.shop}</p>
            <ul className="mt-4 space-y-2.5 text-[15px] font-medium">
              <li><Link className="hover:text-coral-600" href="/belanja">{t.shop.allProducts}</Link></li>
              <li><Link className="hover:text-coral-600" href="/belanja/kategori/ikan-segar">{t.shop.todaysCatch}</Link></li>
              <li><Link className="hover:text-coral-600" href="/belanja/kategori/paket-hemat">{locale === "en" ? "Value boxes" : "Paket hemat"}</Link></li>
              <li><Link className="hover:text-coral-600" href="/pesanan">{t.nav.track}</Link></li>
              <li><Link className="hover:text-coral-600" href="/akun">{t.nav.businessAccount}</Link></li>
              <li><Link className="hover:text-coral-600" href="/restoran#daftar">{t.account.register}</Link></li>
            </ul>
          </div>
        </div>
        <div className="lg:col-span-3">
          <p className="eyebrow">{t.footer.standards}</p>
          <ul className="mt-4 space-y-3">
            {standards.map(({ Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-[14px] text-ink/80"><span className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-line text-tide-600"><Icon className="h-4 w-4" /></span>{label}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col gap-2 py-5 text-xs text-mute sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {BRAND.legalName}. {t.footer.rights}</p>
          <p>{t.footer.note}</p>
        </div>
      </div>
    </footer>
  );
}
