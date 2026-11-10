import type { Metadata } from "next";
import { Check, Smartphone, Fish, Scale, Truck } from "lucide-react";
import { getRepo } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import { PageHero, Band, SectionHead, StepsStrip } from "@/components/site/Sections";
import { IMAGES } from "@/lib/content/images";
import { BusinessApplyForm } from "@/components/shop/BusinessApplyForm";
import { rupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Untuk restoran" };

const copy = {
  id: {
    eyebrow: "Untuk restoran dan dapur komersial",
    title: "Pesan dalam 60 detik. Tiba di dapur pukul 07.00.",
    sub: "Pesan malam ini hingga pukul 20.00, terima besok subuh. Satu pemasok untuk bahan utama menu Anda: seafood dengan ukuran yang jelas, ayam halal, telur dan bumbu, dalam satu pengiriman dan satu tagihan.",
    points: (free: string) => ["Harga grosir di katalog yang sama, tampil setelah Anda masuk", "Pesan lagi: keranjang terisi otomatis dari pesanan terakhir, cukup sesuaikan jumlahnya", `Gratis ongkos kirim mulai ${free}, dengan pengiriman dapur pukul 05.00–08.00`, "Bayar di muka untuk 10 pesanan pertama, lalu tempo 3 hari, kemudian mingguan", "Tagihan akhir mencantumkan jenis, ukuran dan lot untuk pembukuan dan pajak", "Sertifikat halal pemasok ayam tersedia untuk setiap lot"],
    formTitle: "Daftar akun bisnis",
    formSub: "Kami tinjau dalam 1 hari kerja, lalu kode akses dikirim melalui WhatsApp.",
    flowEyebrow: "Alur kerja",
    flowTitle: "Dirancang mengikuti jam dapur, bukan jam kantor.",
    flow: [["19.30", "Pemilik membuka aplikasi dari layar ponsel, menekan Pesan lagi, menambah kakap dari 5 menjadi 6 kg, lalu menyelesaikan pembayaran. Konfirmasi WhatsApp langsung masuk."], ["03.00", "Kami membeli di lelang sesuai daftar, memotret setiap lot dan menyiangi sesuai spesifikasi akun Anda."], ["04.30", "Pesanan ditimbang. Tagihan akhir dikirim melalui WhatsApp lengkap dengan jenis dan ukurannya."], ["05.00–08.00", "Kurir mengantar pesanan dan mengukur suhu saat serah terima. Pembayaran mengikuti ketentuan tempo akun Anda."]],
    mathEyebrow: "Hitungan yang sebenarnya",
    mathTitle: "Harga per kg kami 5–10% di atas pasar. Biaya per porsinya justru biasanya lebih rendah.",
    mathBody: "Barang tidak layak 5–8% di pasar, susut akibat ukuran yang tidak konsisten, serta 2–3 jam per hari di Muara Baru memang tidak terlihat pada harga per kg, tetapi terasa pada margin menu Anda. Minta sampel dan hitung sendiri berdasarkan menu Anda.",
    math: [["5–8%", "barang tidak layak di pasar tradisional bagi pembeli yang tidak memeriksa setiap ekor"], ["2–3 jam", "per hari yang dihabiskan kepala dapur atau pemilik untuk ke pasar subuh"], ["±45%", "hasil fillet kakap; ukuran yang tertulis membuatnya konsisten"], ["0", "ikan segar yang menginap di gudang kami, karena semuanya dibeli sesuai pesanan"]],
    segEyebrow: "Siapa yang kami layani",
    segTitle: "Restoran independen di sepanjang satu rute.",
    segBody: "Rute yang padat menjaga biaya per titik antar tetap rendah dan pengiriman tepat waktu. Kami tumbuh rute demi rute.",
    segments: [["Restoran seafood dan masakan Tionghoa", "Kakap, kerapu, cumi dan udang dengan ukuran yang jelas; ayam potong; telur per peti."], ["Rumah makan Padang, Sunda dan Manado", "Kembung, tongkol dan bandeng harian; ayam potong 8 dan 12; bumbu dapur."], ["Ayam geprek dan ayam goreng tepung", "Ayam potong segar dengan ukuran konsisten dan dokumen halal; telur; minyak goreng 18 L."], ["Kafe dan dapur daring", "Dori, potongan salmon, fillet dada ayam dan olahan beku untuk menu tambahan."], ["Katering", "Volume mingguan dengan spesifikasi tertulis dan jadwal tetap."], ["Warung dan pengecer produk beku", "Produk beku dalam kemasan, ikan ukuran B di pagi yang sama, nugget dan sosis."]],
  },
  en: {
    eyebrow: "For restaurants & commercial kitchens",
    title: "Order in 60 seconds. In your kitchen by 7 am.",
    sub: "One supplier for the centre of the plate: graded seafood, halal chicken, eggs and condiments, in one dawn delivery and one invoice.",
    points: (free: string) => ["Wholesale prices in the same catalogue, shown after sign-in", "Reorder: the cart fills from your last order, adjust quantities, done", `Free delivery from ${free}; 05:00–08:00 kitchen slot`, "Prepaid for the first 10 orders, then 3-day terms, then weekly", "Species-, grade- and lot-named final invoice for bookkeeping and tax", "Supplier halal certificates available per lot"],
    formTitle: "Register a business account",
    formSub: "Reviewed within 1 working day; the access code arrives on WhatsApp.",
    flowEyebrow: "Workflow",
    flowTitle: "Designed around kitchen hours, not office hours.",
    flow: [["19.30", "The owner opens the home-screen icon, taps Reorder, raises snapper from 5 to 6 kg, checks out. WhatsApp confirmation arrives."], ["03:00", "We bid to the list, photograph lots, clean to your account's specification."], ["04:30", "Weighed. The final invoice goes out on WhatsApp with species and grade."], ["05:00–08:00", "The courier delivers with a temperature reading at hand-off. Payment per your account terms."]],
    mathEyebrow: "The real arithmetic",
    mathTitle: "Our price per kg is 5–10% above the market. Cost per portion is usually lower.",
    mathBody: "Market rejects of 5–8%, trim from inconsistent grades and 2–3 hours a day at Muara Baru never show in the price per kg, but they show in your menu margin. Ask for a sample and run the numbers with your own menu.",
    math: [["5–8%", "rejects at traditional markets for buyers who don't inspect every fish"], ["2–3 h", "a day a head chef or owner spends on the dawn trip"], ["±45%", "snapper fillet yield; written size grades keep it consistent"], ["0", "fresh fish held overnight in our store; bought to order"]],
    segEyebrow: "Who we serve",
    segTitle: "Independent restaurants along one route.",
    segBody: "A dense route keeps cost per drop low and deliveries on time. We grow route by route.",
    segments: [["Seafood & Chinese-Indonesian restaurants", "Graded snapper, grouper, squid, shrimp; cut chicken; eggs by the crate."], ["Padang, Sundanese, Manadonese", "Daily mackerel, tuna, milkfish; chicken cut 8/12; pantry staples."], ["Geprek & fried chicken outlets", "Fresh cut chicken with consistent size bands and halal documents; eggs; 18 L oil."], ["Cafés & cloud kitchens", "Dori, salmon portions, breast fillet, frozen food as menu add-ons."], ["Caterers", "Weekly volume with written specifications and fixed schedules."], ["Warungs & frozen resellers", "Frozen packs, grade-B the same morning, nuggets and sausages."]],
  },
};

export default async function RestoranPage() {
  const repo = await getRepo();
  const { locale } = await getT();
  const c = copy[locale];
  const [settings, areas] = await Promise.all([repo.getSettings(), repo.getAreas()]);
  const icons = [<Smartphone key="a" className="h-5 w-5" />, <Fish key="b" className="h-5 w-5" />, <Scale key="c" className="h-5 w-5" />, <Truck key="d" className="h-5 w-5" />];
  return (
    <>
      <PageHero eyebrow={c.eyebrow} title={c.title} sub={c.sub} icon="shrimp" image={IMAGES.restaurant} />
      <Band>
        <div className="grid gap-10 lg:grid-cols-12">
          <ul className="space-y-3 lg:col-span-6">{c.points(rupiah(settings.free_delivery_business)).map((p) => <li key={p} className="flex gap-3 font-sans text-[15px] text-ink/85"><Check className="mt-0.5 h-5 w-5 flex-none text-gold-ink" />{p}</li>)}</ul>
          <div id="daftar" className="card scroll-mt-28 p-6 lg:col-span-6 lg:p-8"><h2 className="text-[2rem]">{c.formTitle}</h2><p className="mt-1 font-sans text-sm text-mute">{c.formSub}</p><div className="mt-6"><BusinessApplyForm areas={areas} /></div></div>
        </div>
      </Band>
      <StepsStrip title={c.flowTitle} steps={c.flow.map(([time, d], i) => ({ icon: icons[i], text: `${time} — ${d}` }))} />
      <Band tone="parchment">
        <SectionHead eyebrow={c.mathEyebrow} title={c.mathTitle} sub={c.mathBody} />
        <div className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-4">{c.math.map(([v, d]) => <div key={v} className="border-l-2 border-ocean-950 pl-5"><p className="font-display text-[2.8rem] font-bold leading-none">{v}</p><p className="mt-2 font-sans text-[13px] text-mute">{d}</p></div>)}</div>
      </Band>
      <Band>
        <SectionHead eyebrow={c.segEyebrow} title={c.segTitle} sub={c.segBody} />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{c.segments.map(([t, d]) => <div key={t} className="card p-6"><p className="text-[1.4rem]">{t}</p><p className="mt-1.5 font-sans text-[13.5px] text-mute">{d}</p></div>)}</div>
      </Band>
    </>
  );
}
