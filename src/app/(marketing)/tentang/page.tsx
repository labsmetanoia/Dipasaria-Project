import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Fish, Snowflake, Scale, Truck } from "lucide-react";
import { getRepo } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import { PageHero, Band, SectionHead, StepsStrip } from "@/components/site/Sections";
import { ImageSlot } from "@/components/site/Decor";
import { IMAGES } from "@/lib/content/images";
import { ProductIcon } from "@/components/Icons";

export const metadata: Metadata = { title: "Tentang kami" };

const copy = {
  id: {
    eyebrow: "Tentang kami",
    title: "Kami berdiri di lantai lelang Muara Baru pukul tiga pagi, supaya Anda tidak perlu.",
    sub: "Dipasaria adalah pedagang prinsipal: kami membeli dan memiliki barang sebelum menjualnya, sehingga kami yang bertanggung jawab atas grade, berat, kebersihan dan suhu. Bukan marketplace, bukan perantara.",
    storyEyebrow: "Cerita kami",
    storyTitle: "Berawal dari satu pertanyaan: mengapa membeli ikan harus berarti bangun pukul dua pagi?",
    story: [
      "Di Jakarta, pemilik restoran atau juru masaknya menghabiskan dua sampai tiga jam setiap hari di pasar: memilih, menawar, menolak, membawa pulang. Rumah tangga mendapat sisanya, dari supermarket dengan pilihan terbatas atau dari penjual online yang tidak bisa menjelaskan ikan apa yang dikirim.",
      "Dipasaria dibangun oleh satu orang yang berdiri di lantai lelang Muara Baru, memotret setiap lot, dan menulis nama ilmiah di setiap invoice. Kami tumbuh rute demi rute, bukan kota demi kota: restoran-restoran di satu kawasan dulu, lalu rumah tangga di sekitar rute yang sama.",
      "Seafood adalah inti dan pembeda kami. Ayam halal, telur dan bumbu dapur ditambahkan karena dapur Anda sudah membelinya setiap minggu, dan karena satu kotak yang lengkap membuat setiap pengiriman lebih masuk akal untuk semua pihak.",
    ],
    valuesEyebrow: "Empat pilar",
    valuesTitle: "Standar yang bisa Anda pegang, bukan janji.",
    values: [
      { icon: "fish", t: "Jujur soal spesies", d: "Nama Indonesia, Inggris dan ilmiah di setiap produk dan invoice. Kakap merah kami Lutjanus malabaricus, bukan Red Bass." },
      { icon: "snow", t: "Dingin tanpa putus", d: "Suhu inti ≤4 °C sejak lelang; es gel dan kotak terinsulasi; satu pembacaan suhu per rute per hari, dicatat." },
      { icon: "fillet", t: "Beli sesuai pesanan", d: "Tidak ada ikan segar yang menginap. Daftar beli disusun dari pesanan pukul 20.00; sisa dibekukan dalam empat jam atau disalurkan pagi itu." },
      { icon: "box", t: "Satu kotak untuk dapur", d: "Seafood, ayam halal, telur dan bumbu dalam satu pengiriman, dikemas per zona suhu, dengan satu invoice." },
    ],
    cycleEyebrow: "Siklus harian",
    cycleTitle: "Dari pesanan ke dapur dalam dua belas jam.",
    cycle: [["20:00", "Pesanan ditutup. Daftar beli per spesies dan grade disusun, ditambah cadangan kecil."], ["03:00", "Lelang Muara Baru: mata, insang, bau, suhu inti. Setiap lot difoto."], ["05:00", "Mitra pembersih menyiangi, memfillet, mengupas sesuai pesanan. Ditimbang, invoice final dikirim."], ["05:00–08:00", "Slot dapur restoran. Rumah tangga 10.00–13.00 dan 15.00–18.00. Pembacaan suhu di serah terima."]],
    stdEyebrow: "Sumber & standar",
    stdTitle: "Dari mana produk kami berasal dan apa yang tidak akan Anda temukan di katalog.",
    sources: [
      ["Ikan laut & cumi", "Dua bakul tetap di Muara Baru, dipilih setelah empat perjalanan subuh. Cadangan: bakul ketiga dan Muara Angke."],
      ["Udang & kerapu", "Tambak Lampung dan Indramayu via agen tetap. Ukuran dihitung per kg; tanpa perendaman penambah berat."],
      ["Seafood beku & salmon", "Pengolah dengan SKP/HACCP; salmon dari importir berizin. −18 °C saat diterima, nomor registrasi pada label."],
      ["Ayam & telur", "RPHU bersertifikat halal dan NKV, dokumen per lot. Telur dari peternakan Blitar dan Bogor, diantar dua kali seminggu."],
      ["Frozen food & bumbu", "Hanya merek dengan nomor BPOM MD dan logo halal, dari distributor resmi."],
    ],
    dns: "Daftar tidak-dijual",
    dnsList: ["Ikan buntal, ikan landak, ikan kotak (tetrodotoksin)", "Ikan minyak / escolar", "Kerapu Napoleon dan kuda laut (dilindungi)", "Hiu dan pari (CITES)", "Red Bass (Lutjanus bohar) yang dijual sebagai kakap merah"],
    guaranteeT: "Garansi kesegaran: ganti atau refund dalam 2 jam. Tanpa debat.",
    guaranteeD: "Kirim foto via WhatsApp dalam 2 jam setelah diterima. Kami ganti pada pengiriman berikutnya atau kembalikan uangnya. Kami menganggarkan 1,5% penjualan untuk ini, karena itulah pengganti memeriksa ikan dengan tangan Anda sendiri.",
    cta: "Lihat katalog",
  },
  en: {
    eyebrow: "About us",
    title: "We stand on the Muara Baru auction floor at three in the morning, so you don't have to.",
    sub: "Dipasaria is a principal trader: we buy and own the goods before selling them, so we answer for grade, weight, cleanliness and temperature. Not a marketplace, not a middleman.",
    storyEyebrow: "Our story",
    storyTitle: "It started with one question: why should buying fish mean waking up at two in the morning?",
    story: [
      "In Jakarta, a restaurant owner or their cook spends two to three hours a day at the market: choosing, haggling, rejecting, carrying it home. Households get what's left, from supermarkets with a narrow range or online sellers who can't say which fish they are sending.",
      "Dipasaria was built by one person standing on the Muara Baru auction floor, photographing every lot and writing the scientific name on every invoice. We grow route by route, not city by city: the restaurants of one neighbourhood first, then the households along the same route.",
      "Seafood is our core and our difference. Halal chicken, eggs and pantry staples were added because your kitchen already buys them every week, and because one complete box makes every delivery make more sense for everyone.",
    ],
    valuesEyebrow: "Four pillars",
    valuesTitle: "Standards you can hold us to, not promises.",
    values: [
      { icon: "fish", t: "Honest about species", d: "Indonesian, English and scientific names on every product and invoice. Our red snapper is Lutjanus malabaricus, not Red Bass." },
      { icon: "snow", t: "An unbroken cold chain", d: "Core temperature ≤4 °C from the auction; gel ice and insulated boxes; one probe reading per route per day, logged." },
      { icon: "fillet", t: "Bought to order", d: "No fresh fish is held overnight. The buying list comes from the 20:00 orders; surplus is frozen within four hours or cleared that morning." },
      { icon: "box", t: "One box for the kitchen", d: "Seafood, halal chicken, eggs and condiments in one delivery, packed by temperature zone, on one invoice." },
    ],
    cycleEyebrow: "Daily cycle",
    cycleTitle: "From order to kitchen in twelve hours.",
    cycle: [["20:00", "Orders close. The buying list is built per species and grade, with a small buffer."], ["03:00", "Muara Baru auction: eyes, gills, smell, core temperature. Every lot photographed."], ["05:00", "Our cleaning partner guts, fillets and peels to order. Weighed; the final invoice is sent."], ["05:00–08:00", "Restaurant kitchen slot. Households 10:00–13:00 and 15:00–18:00. Temperature reading at hand-off."]],
    stdEyebrow: "Sourcing & standards",
    stdTitle: "Where our products come from, and what you will never find in the catalogue.",
    sources: [
      ["Marine fish & squid", "Two regular traders at Muara Baru, chosen after four dawn trips. Backup: a third trader and Muara Angke."],
      ["Shrimp & grouper", "Lampung and Indramayu ponds via regular agents. Sizes counted per kg; no weight-adding soak."],
      ["Frozen seafood & salmon", "Processors with SKP/HACCP; salmon from a licensed importer. −18 °C on receipt, registration numbers on labels."],
      ["Chicken & eggs", "Halal-certified, NKV-registered slaughterhouses with documents per lot. Eggs from Blitar and Bogor farms, delivered twice weekly."],
      ["Frozen food & condiments", "Only brands with BPOM MD numbers and halal logos, from authorised distributors."],
    ],
    dns: "Do-not-sell list",
    dnsList: ["Pufferfish, porcupinefish, boxfish (tetrodotoxin)", "Oilfish / escolar", "Napoleon wrasse and seahorses (protected)", "Sharks and rays (CITES)", "Red Bass (Lutjanus bohar) sold as red snapper"],
    guaranteeT: "Freshness guarantee: replacement or refund within 2 hours. No argument.",
    guaranteeD: "Send a photo on WhatsApp within 2 hours of delivery. We replace on the next delivery or refund. We budget 1.5% of sales for this, because it is the substitute for inspecting the fish with your own hands.",
    cta: "See the catalogue",
  },
};

export default async function TentangPage() {
  const { locale } = await getT();
  const c = copy[locale];
  const settings = await (await getRepo()).getSettings();
  const icons = [<Fish key="a" className="h-5 w-5" />, <Scale key="b" className="h-5 w-5" />, <Snowflake key="c" className="h-5 w-5" />, <Truck key="d" className="h-5 w-5" />];
  return (
    <>
      <PageHero eyebrow={c.eyebrow} title={c.title} sub={c.sub} icon="fish" image={IMAGES.story ?? settings.about_image_url} />
      <Band>
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5"><p className="eyebrow">{c.storyEyebrow}</p><h2 className="mt-2 text-[2.6rem] sm:text-[3.4rem]">{c.storyTitle}</h2></div>
          <div className="space-y-5 font-sans text-[15px] leading-relaxed text-ink/80 lg:col-span-7">{c.story.map((x) => <p key={x}>{x}</p>)}</div>
        </div>
      </Band>
      <Band tone="parchment">
        <SectionHead eyebrow={c.valuesEyebrow} title={c.valuesTitle} />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {c.values.map((v) => (
            <div key={v.t} className="card p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ocean-950 text-coral-500"><ProductIcon name={v.icon} className="h-6 w-6" /></span>
              <h3 className="mt-5 text-[1.5rem]">{v.t}</h3>
              <p className="mt-2 font-sans text-[13.5px] leading-relaxed text-mute">{v.d}</p>
            </div>
          ))}
        </div>
      </Band>
      <StepsStrip title={c.cycleTitle} steps={c.cycle.map(([time, d], i) => ({ icon: icons[i], text: `${time} — ${d}` }))} />
      <Band className="scroll-mt-24">
        <div id="standar" />
        <SectionHead eyebrow={c.stdEyebrow} title={c.stdTitle} />
        <div className="mt-10 grid gap-10 lg:grid-cols-12">
          <dl className="divide-y divide-line lg:col-span-7">
            {c.sources.map(([k, v]) => <div key={k} className="grid gap-1 py-5 sm:grid-cols-3"><dt className="font-display text-[18px] font-bold uppercase">{k}</dt><dd className="font-sans text-[14px] leading-relaxed text-mute sm:col-span-2">{v}</dd></div>)}
          </dl>
          <div className="lg:col-span-5">
            <div className="bg-ocean-950 p-7 text-white"><p className="eyebrow">{c.dns}</p><ul className="mt-4 space-y-2.5 font-sans text-[14px] text-white/80">{c.dnsList.map((d) => <li key={d} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 flex-none bg-coral-500" />{d}</li>)}</ul></div>
            <div className="mt-4 bg-coral-500 p-7 text-ocean-950"><h3 className="text-[1.6rem]">{c.guaranteeT}</h3><p className="mt-2 font-sans text-[13.5px] leading-relaxed">{c.guaranteeD}</p><Link href="/belanja" className="btn-primary mt-5">{c.cta} <ArrowRight className="h-4 w-4" /></Link></div>
          </div>
        </div>
      </Band>
      <ImageSlot src={IMAGES.fishermen} alt="" icon="shrimp" className="h-56 md:h-80" />
    </>
  );
}
