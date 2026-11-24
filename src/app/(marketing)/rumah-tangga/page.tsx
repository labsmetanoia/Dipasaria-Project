import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { getRepo } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import { PageHero, Band, SectionHead } from "@/components/site/Sections";
import { IMAGES } from "@/lib/content/images";
import { ProductCard } from "@/components/shop/ProductCard";
import { rupiah } from "@/lib/format";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({ title: "Ikan segar untuk rumah tangga, antar besok pagi", description: "Ikan segar yang sudah disiangi, ayam halal, telur, dan isi freezer dalam satu pesanan. Pesan sebelum pukul 20.00, diantar dingin besok pagi; tersedia kotak mingguan tanpa kontrak.", path: "/rumah-tangga" });

const copy = {
  id: {
    eyebrow: "Untuk rumah tangga",
    title: "Ikan sudah disiangi, udang sudah dikupas, salmon sudah dipotong.",
    sub: "Tanpa bau amis, tanpa duri, tanpa menebak-nebak. Pesan malam ini, terima besok siang atau sore dalam kotak berpendingin.",
    points: (min: string, free: string) => [`Belanja tanpa akun, minimal pesanan ${min}, gratis ongkos kirim mulai ${free}`, "Pilih ukuran dan cara penyiapan: disiangi, difillet, dikupas, atau dipotong steak", "Pengiriman besok pukul 10.00–13.00 atau 15.00–18.00", "Bayar dengan QRIS atau transfer setelah berat akhir dikonfirmasi melalui WhatsApp", "Ganti atau uang kembali dalam 2 jam jika produk kurang segar"],
    howEyebrow: "Cara berbelanja",
    howTitle: "Tiga langkah, selesai sebelum pukul 20.00.",
    how: [["1", "Pilih produk", "Tangkapan hari ini untuk ikan segar, produk beku untuk stok freezer. Harga per kg atau per kemasan terlihat sebelum Anda menambahkannya ke keranjang."], ["2", "Pilih hari dan jam pengiriman", "Besok siang atau sore. Ongkos kirim mengikuti wilayah Anda, dan gratis untuk belanja di atas nilai tertentu."], ["3", "Bayar setelah ditimbang", "Ikan segar ditimbang saat subuh, lalu tagihan akhir dikirim ke WhatsApp Anda. Harga produk beku sudah pasti."]],
    boxesEyebrow: "Paket hemat",
    boxesTitle: "Isi freezer dalam sekali pesan, lebih hemat daripada membeli satuan.",
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
      <PageHero eyebrow={c.eyebrow} title={c.title} sub={c.sub} icon="box" image={IMAGES.box} />
      <Band>
        <ul className="grid gap-3 sm:grid-cols-2">{c.points(rupiah(settings.min_order_retail), rupiah(settings.free_delivery_retail)).map((p) => <li key={p} className="flex gap-3 border border-line bg-white px-5 py-4 font-sans text-[14.5px] text-ink/85"><Check className="mt-0.5 h-5 w-5 flex-none text-gold-ink" />{p}</li>)}</ul>
      </Band>
      <Band tone="parchment">
        <SectionHead eyebrow={c.howEyebrow} title={c.howTitle} />
        <ol className="mt-10 grid gap-4 md:grid-cols-3">{c.how.map(([n, t, d]) => <li key={n} className="card p-7"><span className="font-display text-[4rem] font-extrabold leading-none text-coral-500">{n}</span><h3 className="mt-3 text-[1.6rem]">{t}</h3><p className="mt-2 font-sans text-[14px] leading-relaxed text-mute">{d}</p></li>)}</ol>
      </Band>
      {boxes.length > 0 && (
        <Band>
          <SectionHead eyebrow={c.boxesEyebrow} title={c.boxesTitle} action={{ href: "/belanja/kategori/paket-hemat", label: c.boxesEyebrow }} />
          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{boxes.map((p) => <ProductCard key={p.id} p={p} segment="retail" locale={locale} />)}</div>
          <div className="mt-8 border-l-4 border-coral-500 bg-sand-100 p-5 sm:p-6">
            <p className="eyebrow">{locale === "en" ? "Weekly box" : "Kotak mingguan"}</p>
            <h3 className="mt-1 text-[1.6rem]">{locale === "en" ? "The same box every week, without ordering again." : "Kotak yang sama tiap minggu, tanpa memesan ulang."}</h3>
            <p className="mt-2 max-w-2xl font-sans text-[14px] leading-relaxed text-mute">{locale === "en"
              ? "Pick a box or your own items, a delivery day, and weekly or every second week. We prepare the order and send the payment link on WhatsApp two evenings before. Skip a week or stop any time; no contract, no subscription fee."
              : "Pilih paket atau isi sendiri, tentukan hari pengiriman, tiap minggu atau dua minggu sekali. Dua malam sebelumnya kami buatkan pesanannya dan mengirim tautan pembayaran lewat WhatsApp. Lewati satu minggu atau berhenti kapan saja; tanpa kontrak, tanpa biaya langganan."}</p>
            <Link href="/akun?langganan=1#langganan" className="btn-primary mt-4">{locale === "en" ? "Start a weekly box" : "Mulai kotak mingguan"} <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <Link href="/belanja" className="btn-accent mt-8">{c.cta} <ArrowRight className="h-4 w-4" /></Link>
        </Band>
      )}
    </>
  );
}
