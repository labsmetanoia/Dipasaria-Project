import Link from "next/link";
import { Logo } from "@/components/Logo";
import { BRAND } from "@/lib/config";
import { waLink } from "@/lib/format";
import type { Settings } from "@/lib/types";

export function SiteFooter({ settings }: { settings: Settings }) {
  return (
    <footer className="border-t border-line bg-white">
      <div className="container-x grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-mute">{BRAND.promise}</p>
          <p className="mt-4 text-sm text-mute">{settings.address_line} · Pesan sebelum {settings.cutoff_time} WIB untuk pengiriman besok pagi.</p>
        </div>
        <div>
          <p className="eyebrow">Belanja</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li><Link className="hover:text-tide-600" href="/belanja">Katalog</Link></li>
            <li><Link className="hover:text-tide-600" href="/belanja/kategori/ikan-segar">Tangkapan hari ini</Link></li>
            <li><Link className="hover:text-tide-600" href="/pesanan">Lacak pesanan</Link></li>
            <li><Link className="hover:text-tide-600" href="/akun">Akun bisnis</Link></li>
            <li><Link className="hover:text-tide-600" href="/restoran#daftar">Daftar restoran</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">Perusahaan</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li><Link className="hover:text-tide-600" href="/tentang">Sumber & standar</Link></li>
            <li><Link className="hover:text-tide-600" href="/cara-kerja">Cara kerja & FAQ</Link></li>
            <li><Link className="hover:text-tide-600" href="/kontak">Kontak</Link></li>
            <li><Link className="hover:text-tide-600" href="/privasi">Kebijakan privasi</Link></li>
            <li><a className="hover:text-tide-600" href={waLink(settings.whatsapp_number, `Halo ${settings.store_name}, saya ingin bertanya.`)} target="_blank" rel="noreferrer">WhatsApp</a></li>
            {settings.instagram && <li><a className="hover:text-tide-600" href={`https://instagram.com/${settings.instagram}`} target="_blank" rel="noreferrer">Instagram @{settings.instagram}</a></li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col gap-2 py-5 text-xs text-mute sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {BRAND.legalName}. Jakarta, Indonesia.</p>
          <p>Harga ikan segar mengikuti lelang harian. Produk ditimbang: total akhir setelah penimbangan.</p>
        </div>
      </div>
    </footer>
  );
}
