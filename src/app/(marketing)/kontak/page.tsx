import type { Metadata } from "next";
import { MessageCircle, Instagram, MapPin, Clock } from "lucide-react";
import { getRepo } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import { IMAGES } from "@/lib/content/images";
import { PageHero, Band } from "@/components/site/Sections";
import { ContactForm } from "@/components/site/ContactForm";
import { waLink } from "@/lib/format";
import { fmt } from "@/lib/i18n/dict";

export const metadata: Metadata = { title: "Kontak" };

export default async function KontakPage() {
  const settings = await (await getRepo()).getSettings();
  const { locale, t } = await getT();
  const c = locale === "en"
    ? { eyebrow: "Contact", title: "WhatsApp is our front desk.", sub: "Orders are best placed through the catalogue so price, weight and slot are recorded; for questions, complaints and supplier partnerships, reach us here.", base: "Operations base", baseSub: "Deliveries across Jakarta and Tangerang.", hours: "Service hours", hoursSub: `Orders accepted 24 hours; cut-off ${settings.cutoff_time} WIB. WhatsApp replies 08:00–21:00.`, form: "Send a message" }
    : { eyebrow: "Kontak", title: "WhatsApp adalah meja depan kami.", sub: "Pesanan sebaiknya melalui katalog supaya harga, berat dan slot tercatat; untuk pertanyaan, komplain dan kerja sama pemasok, hubungi kami di sini.", base: "Basis operasi", baseSub: "Pengiriman ke Jakarta dan Tangerang.", hours: "Jam layanan", hoursSub: `Pesanan diterima 24 jam; batas pesan ${settings.cutoff_time} WIB. Balasan WhatsApp 08.00–21.00.`, form: "Kirim pesan" };
  return (
    <>
      <PageHero eyebrow={c.eyebrow} title={c.title} sub={c.sub} icon="squid" image={IMAGES.market} />
      <Band>
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
            <a href={waLink(settings.whatsapp_number, fmt(t.common.chatDefault, { store: settings.store_name }))} target="_blank" rel="noreferrer" className="card flex items-start gap-4 p-6 hover:border-ocean-950"><MessageCircle className="h-6 w-6 text-coral-600" /><div><p className="font-display text-[1.3rem] font-bold uppercase">WhatsApp</p><p className="mt-1 text-sm text-mute">+{settings.whatsapp_number}</p></div></a>
            {settings.instagram && <a href={`https://instagram.com/${settings.instagram}`} target="_blank" rel="noreferrer" className="card flex items-start gap-4 p-6 hover:border-ocean-950"><Instagram className="h-6 w-6 text-coral-600" /><div><p className="font-display text-[1.3rem] font-bold uppercase">Instagram</p><p className="mt-1 text-sm text-mute">@{settings.instagram}</p></div></a>}
            <div className="card flex items-start gap-4 p-6"><MapPin className="h-6 w-6 text-coral-600" /><div><p className="font-display text-[1.3rem] font-bold uppercase">{c.base}</p><p className="mt-1 text-sm text-mute">{settings.address_line}. {c.baseSub}</p></div></div>
            <div className="card flex items-start gap-4 p-6"><Clock className="h-6 w-6 text-coral-600" /><div><p className="font-display text-[1.3rem] font-bold uppercase">{c.hours}</p><p className="mt-1 text-sm text-mute">{c.hoursSub}</p></div></div>
          </div>
          <div className="card p-6 lg:col-span-7 lg:p-8"><h2 className="mb-5 text-[2rem]">{c.form}</h2><ContactForm whatsapp={settings.whatsapp_number} storeName={settings.store_name} /></div>
        </div>
      </Band>
    </>
  );
}
