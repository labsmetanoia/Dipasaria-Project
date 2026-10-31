import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { getRepo } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import { PageHero, Band, SplitHeading } from "@/components/site/Sections";
import { ProductCard } from "@/components/shop/ProductCard";
import { rupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Untuk rumah tangga" };

const copy = {
  id: {
    eyebrow: "Untuk rumah tangga",
    title: "Ikan yang sudah disiangi, udang yang sudah dikupas, salmon yang sudah dipotong.",
    sub: "Tanpa bau, tanpa duri, tanpa tebak-tebakan. Pesan malam ini, terima besok pagi atau sore dalam kotak berpendingin.",
    points: (min: string, free: string) => [`Belanja tanpa akun, minimum ${min}, gratis ongkir dari ${free}`, "Pilih ukuran dan cara penyiapan: siangi, fillet, kupas, potong steak", "Slot pagi 10.00–13.00 atau sore 15.00–18.00, besok", "Bayar QRIS atau transfer setelah berat final dikonfirmasi via WhatsApp", "Ganti atau refund dalam 2 jam jika tidak segar"],
    howEyebrow: "Cara belanjanya",
    howTitle: "Tiga langkah, selesai sebelum pukul 20.00.",
    how: [["1", "Pilih produk", "Tangkapan hari ini untuk ikan segar; pack beku untuk stok freezer. Lihat harga per kg atau per pack sebelum menambah."], ["2", "Pilih hari & slot", "Besok pagi atau sore. Area pengiriman menentukan ongkir; di atas ambang, gratis."], ["3", "Bayar setelah ditimbang", "Ikan segar ditimbang subuh; invoice final masuk ke WhatsApp. Produk beku harganya tetap."]],
    boxesEyebrow: "Paket hemat",
    boxesTitle: "Isi freezer sekali pesan, lebih murah dari membeli satuan.",
    cta: "Mulai belanja",
  },
  en: {
    eyebrow: "For households",
    title: "Fish already gutted, shrimp already peeled, salmon already portioned.",
    sub: "No smell, no bones, no guesswork. Order tonight, receive tomorrow morning or afternoon in an insulated box.",
    points: (min: string, free: string) => [`No account needed, ${min} minimum, free delivery from ${free}`, "Choose size and preparation: gutted, fillet, peeled, steaks", "Morning 10:00–13:00 or afternoon 15:00–18:00 slot, tomorrow", "Pay by QRIS or transfer once the final weight is confirmed on WhatsApp", "Replacement or refund within 2 hours if not fresh"],
    howEyebrow: "How it works",
    howTitle: "Three steps, done before 20:00.",
    how: [["1", "Choose products", "Today's catch for fresh fish; frozen packs for the freezer. See the price per kg or per pack before adding."], ["2", "Pick a day & slot", "Tomorrow morning or afternoon. Your area sets the delivery fee; above the threshold it's free."], ["3", "Pay after weighing", "Fresh fish is weighed at dawn; the final invoice arrives on WhatsApp. Frozen items have fixed prices."]],
    boxesEyebrow: "Value boxes",
    boxesTitle: "Stock the freezer in one order, for less than buying separately.",
    cta: "Start shopping",
  },
};

export default async function RumahTanggaPage() {
  const repo = await getRepo();
  const { locale } = await getT();
  const c = copy[locale];
  const [settings, products] = await Promise.all([repo.getSettings(), repo.getProducts()]);
  const boxes = products.filter((p) => p.category_id === "c_paket");
  return (
    <>
      <PageHero eyebrow={c.eyebrow} title={c.title} sub={c.sub} icon="box" />
      <Band>
        <ul className="grid gap-3 sm:grid-cols-2">
          {c.points(rupiah(settings.min_order_retail), rupiah(settings.free_delivery_retail)).map((p) => <li key={p} className="flex gap-3 rounded-2xl border border-line px-5 py-4 text-[15px] text-ink/85"><Check className="mt-0.5 h-5 w-5 flex-none text-coral-500" />{p}</li>)}
        </ul>
      </Band>
      <Band tone="light">
        <SplitHeading eyebrow={c.howEyebrow} title={c.howTitle} />
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {c.how.map(([n, t, d]) => <li key={n} className="card p-7"><span className="text-5xl font-bold text-sand-300">{n}</span><h3 className="mt-4 text-[19px] text-ocean-950">{t}</h3><p className="mt-2 text-[14.5px] leading-relaxed text-mute">{d}</p></li>)}
        </ol>
      </Band>
      {boxes.length > 0 && (
        <Band>
          <SplitHeading eyebrow={c.boxesEyebrow} title={c.boxesTitle} action={{ href: "/belanja", label: c.cta }} />
          <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {boxes.map((p) => <ProductCard key={p.id} p={p} segment="retail" locale={locale} />)}
          </div>
          <Link href="/belanja/kategori/paket-hemat" className="btn-outline mt-8">{c.boxesEyebrow} <ArrowRight className="h-4 w-4" /></Link>
        </Band>
      )}
    </>
  );
}
