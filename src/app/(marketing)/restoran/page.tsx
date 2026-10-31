import type { Metadata } from "next";
import { Check } from "lucide-react";
import { getRepo } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import { PageHero, Band, SplitHeading } from "@/components/site/Sections";
import { BusinessApplyForm } from "@/components/shop/BusinessApplyForm";
import { rupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Untuk restoran" };

const copy = {
  id: {
    eyebrow: "Untuk restoran & dapur komersial",
    title: "Pesanan 60 detik pukul 21.00. Ikan dan ayam di dapur pukul 07.00.",
    sub: "Satu pemasok untuk pusat piring: seafood bergrade, ayam halal, telur dan bumbu, dalam satu pengiriman subuh dan satu invoice.",
    points: (free: string) => ["Harga grosir di katalog yang sama, tampil setelah login", "Pesan lagi: keranjang terisi dari pesanan terakhir, ubah jumlah, selesai", `Pengiriman gratis dari ${free}; slot dapur 05.00–08.00`, "Prabayar untuk 10 pesanan pertama, lalu tempo 3 hari, lalu mingguan", "Invoice final bernama spesies, grade dan lot untuk pembukuan dan pajak", "Sertifikat halal pemasok ayam tersedia per lot"],
    formTitle: "Daftar akun bisnis",
    formSub: "Kami tinjau dalam 1 hari kerja dan kirim kode akses via WhatsApp.",
    flowEyebrow: "Alur kerja",
    flowTitle: "Dirancang di sekitar jam dapur, bukan jam kantor.",
    flow: [["21.00", "Pemilik membuka ikon di layar HP, menekan Pesan lagi, menaikkan kakap dari 5 ke 6 kg, checkout. Konfirmasi WhatsApp masuk."], ["03.00", "Kami melelang sesuai daftar, memotret lot, menyiangi sesuai spesifikasi akun Anda."], ["04.30", "Ditimbang. Invoice final dikirim via WhatsApp beserta nama spesies dan grade."], ["05.00–08.00", "Kurir mengantar dengan pembacaan suhu di serah terima. Pembayaran sesuai tempo akun."]],
    mathEyebrow: "Hitungan yang sebenarnya",
    mathTitle: "Harga per kg kami 5–10% di atas pasar. Biaya per porsi biasanya lebih rendah.",
    mathBody: "Reject 5–8% di pasar, susut grade yang tidak konsisten, dan 2–3 jam per hari di Muara Baru tidak muncul di harga per kg, tetapi muncul di margin menu Anda. Minta sampel dan hitung dengan menu Anda sendiri.",
    math: [["5–8%", "reject di pasar tradisional untuk pembeli yang tidak memeriksa setiap ekor"], ["2–3 jam", "per hari yang dihabiskan kepala dapur atau pemilik untuk perjalanan subuh"], ["±45%", "rendemen fillet kakap; grade ukuran tertulis membuatnya konsisten"], ["0", "ikan segar yang menginap di gudang kami; dibeli sesuai pesanan"]],
    segEyebrow: "Siapa yang kami layani",
    segTitle: "Restoran independen di satu rute yang sama.",
    segBody: "Rute padat menjaga ongkos per drop rendah dan pengiriman tepat waktu. Kami tumbuh rute demi rute.",
    segments: [["Restoran seafood & Chinese-Indonesian", "Kakap, kerapu, cumi, udang bergrade; ayam potong; telur per peti."], ["Padang, Sunda, Manado", "Kembung, tongkol, bandeng harian; ayam potong 8/12; bumbu dapur."], ["Ayam geprek & fried chicken", "Ayam potong segar dengan band ukuran konsisten dan dokumen halal; telur; minyak 18 L."], ["Kafe & cloud kitchen", "Dori, salmon portion, dada fillet, frozen food sebagai menu tambahan."], ["Katering", "Volume mingguan dengan spesifikasi tertulis dan jadwal tetap."], ["Warung & reseller frozen", "Pack beku, grade-B pagi itu juga, nugget dan sosis."]],
  },
  en: {
    eyebrow: "For restaurants & commercial kitchens",
    title: "A 60-second order at 9 pm. Fish and chicken in your kitchen by 7 am.",
    sub: "One supplier for the centre of the plate: graded seafood, halal chicken, eggs and condiments, in one dawn delivery and one invoice.",
    points: (free: string) => ["Wholesale prices in the same catalogue, shown after sign-in", "Reorder: the cart fills from your last order, adjust quantities, done", `Free delivery from ${free}; 05:00–08:00 kitchen slot`, "Prepaid for the first 10 orders, then 3-day terms, then weekly", "Species-, grade- and lot-named final invoice for bookkeeping and tax", "Supplier halal certificates available per lot"],
    formTitle: "Register a business account",
    formSub: "Reviewed within 1 working day; the access code arrives on WhatsApp.",
    flowEyebrow: "Workflow",
    flowTitle: "Designed around kitchen hours, not office hours.",
    flow: [["21:00", "The owner opens the home-screen icon, taps Reorder, raises snapper from 5 to 6 kg, checks out. WhatsApp confirmation arrives."], ["03:00", "We bid to the list, photograph lots, clean to your account's specification."], ["04:30", "Weighed. The final invoice goes out on WhatsApp with species and grade."], ["05:00–08:00", "The courier delivers with a temperature reading at hand-off. Payment per your account terms."]],
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
  return (
    <>
      <PageHero eyebrow={c.eyebrow} title={c.title} sub={c.sub} icon="shrimp" />
      <Band>
        <div className="grid gap-12 lg:grid-cols-12">
          <ul className="space-y-3 lg:col-span-6">
            {c.points(rupiah(settings.free_delivery_business)).map((p) => <li key={p} className="flex gap-3 text-[15.5px] text-ink/85"><Check className="mt-0.5 h-5 w-5 flex-none text-coral-500" />{p}</li>)}
          </ul>
          <div id="daftar" className="card scroll-mt-28 p-6 lg:col-span-6 lg:p-8">
            <h2 className="text-2xl text-ocean-950">{c.formTitle}</h2>
            <p className="mt-1 text-sm text-mute">{c.formSub}</p>
            <div className="mt-6"><BusinessApplyForm areas={areas} /></div>
          </div>
        </div>
      </Band>
      <Band tone="dark">
        <SplitHeading dark eyebrow={c.flowEyebrow} title={c.flowTitle} />
        <ol className="mt-12 grid gap-4 md:grid-cols-4">
          {c.flow.map(([time, d]) => <li key={time} className="rounded-2xl border border-white/10 bg-white/5 p-6"><p className="text-3xl font-bold tracking-tight text-tide-400">{time}</p><p className="mt-3 text-[14px] leading-relaxed text-white/75">{d}</p></li>)}
        </ol>
      </Band>
      <Band>
        <SplitHeading eyebrow={c.mathEyebrow} title={c.mathTitle}>{c.mathBody}</SplitHeading>
        <div className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {c.math.map(([v, d]) => <div key={v} className="border-l border-line pl-5"><p className="text-3xl font-bold tracking-tight text-tide-500">{v}</p><p className="mt-2 text-[13.5px] text-mute">{d}</p></div>)}
        </div>
      </Band>
      <Band tone="light">
        <SplitHeading eyebrow={c.segEyebrow} title={c.segTitle}>{c.segBody}</SplitHeading>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {c.segments.map(([t, d]) => <div key={t} className="card p-6"><p className="text-[16px] font-bold text-ocean-950">{t}</p><p className="mt-1.5 text-[14px] text-mute">{d}</p></div>)}
        </div>
      </Band>
    </>
  );
}
