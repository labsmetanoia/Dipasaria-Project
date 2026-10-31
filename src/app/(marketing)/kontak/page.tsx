import type { Metadata } from "next";
import { MessageCircle, Instagram, MapPin, Clock } from "lucide-react";
import { getRepo } from "@/lib/data";
import { SectionTitle } from "@/components/ui";
import { waLink } from "@/lib/format";

export const metadata: Metadata = { title: "Kontak" };

export default async function KontakPage() {
  const settings = await (await getRepo()).getSettings();
  return (
    <section className="container-x py-16 md:py-20">
      <SectionTitle eyebrow="Kontak" title="WhatsApp adalah meja depan kami.">
        Pesanan sebaiknya melalui katalog supaya harga, berat dan slot tercatat; untuk pertanyaan, komplain dan kerja sama pemasok, hubungi kami di sini.
      </SectionTitle>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <a href={waLink(settings.whatsapp_number, `Halo ${settings.store_name}, saya ingin bertanya.`)} target="_blank" rel="noreferrer" className="card flex items-start gap-4 p-6 hover:border-tide-500">
          <MessageCircle className="h-6 w-6 text-tide-600" />
          <div><p className="font-semibold text-ocean-900">WhatsApp</p><p className="mt-1 text-sm text-mute">+{settings.whatsapp_number}</p></div>
        </a>
        {settings.instagram && (
          <a href={`https://instagram.com/${settings.instagram}`} target="_blank" rel="noreferrer" className="card flex items-start gap-4 p-6 hover:border-tide-500">
            <Instagram className="h-6 w-6 text-tide-600" />
            <div><p className="font-semibold text-ocean-900">Instagram</p><p className="mt-1 text-sm text-mute">@{settings.instagram}</p></div>
          </a>
        )}
        <div className="card flex items-start gap-4 p-6">
          <MapPin className="h-6 w-6 text-tide-600" />
          <div><p className="font-semibold text-ocean-900">Basis operasi</p><p className="mt-1 text-sm text-mute">{settings.address_line}. Pengiriman ke Jakarta dan Tangerang.</p></div>
        </div>
        <div className="card flex items-start gap-4 p-6">
          <Clock className="h-6 w-6 text-tide-600" />
          <div><p className="font-semibold text-ocean-900">Jam layanan</p><p className="mt-1 text-sm text-mute">Pesanan diterima 24 jam; batas pesan {settings.cutoff_time} WIB. Balasan WhatsApp 08.00–21.00.</p></div>
        </div>
      </div>
    </section>
  );
}
