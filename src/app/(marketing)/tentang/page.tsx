import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Fish, Snowflake, Scale, Truck } from "lucide-react";
import { getRepo } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import { PageHero, Band, SectionHead, StepsStrip } from "@/components/site/Sections";
import { ImageSlot } from "@/components/site/Decor";
import { IMAGES } from "@/lib/content/images";
import { ProductIcon } from "@/components/Icons";
import { Emblem, Logo } from "@/components/Logo";
import { Sisik } from "@/components/site/Decor";

export const metadata: Metadata = { title: "Tentang kami" };

const copy = {
  id: {
    eyebrow: "Tentang kami",
    title: "Pukul tiga pagi, kami sudah di lantai lelang Muara Baru, jadi Anda tidak perlu ke sana.",
    sub: "Dipasaria adalah pedagang prinsipal: kami membeli dan memiliki barang sebelum menjualnya, sehingga kami bertanggung jawab penuh atas ukuran, berat, kebersihan, dan suhunya. Kami bukan marketplace, bukan pula perantara.",
    storyEyebrow: "Cerita kami",
    storyTitle: "Berawal dari satu pertanyaan: mengapa membeli ikan harus berarti bangun pukul dua pagi?",
    story: [
      "Di Jakarta, pemilik restoran atau juru masaknya menghabiskan dua hingga tiga jam setiap hari di pasar: memilih, menawar, menolak barang, lalu membawanya pulang. Rumah tangga mendapat sisanya, dari supermarket dengan pilihan terbatas atau dari penjual daring yang tidak dapat menjelaskan ikan apa yang mereka kirim.",
      "Dipasaria dirintis oleh satu orang yang berdiri di lantai lelang Muara Baru, memotret setiap lot dan menuliskan nama ilmiah di setiap tagihan. Kami tumbuh rute demi rute, bukan kota demi kota: dimulai dari restoran di satu kawasan, lalu rumah tangga di sepanjang rute yang sama.",
      "Seafood adalah inti sekaligus keunggulan kami. Ayam halal, telur, dan bumbu dapur kami tambahkan karena dapur Anda sudah membelinya setiap minggu, dan karena satu kotak yang lengkap membuat setiap pengiriman lebih efisien bagi semua pihak.",
    ],
    valuesEyebrow: "Empat pilar",
    valuesTitle: "Standar yang bisa Anda tagih dari kami, bukan sekadar janji.",
    values: [
      { icon: "fish", t: "Jujur soal jenis ikan", d: "Nama Indonesia, nama Inggris, dan nama ilmiah tercantum di setiap produk dan tagihan. Kakap merah kami adalah Lutjanus malabaricus, bukan Red Bass." },
      { icon: "snow", t: "Rantai dingin tanpa putus", d: "Suhu inti ≤4 °C sejak lelang, dengan es gel dan kotak berinsulasi. Suhu diukur dan dicatat sekali per rute setiap hari." },
      { icon: "fillet", t: "Dibeli sesuai pesanan", d: "Tidak ada ikan segar yang menginap. Daftar belanja disusun dari pesanan yang masuk hingga pukul 20.00; kelebihan stok dibekukan dalam empat jam atau disalurkan pagi itu juga." },
      { icon: "box", t: "Satu kotak untuk dapur", d: "Seafood, ayam halal, telur, dan bumbu dalam satu pengiriman, dikemas menurut zona suhu, dengan satu tagihan." },
    ],
    cycleEyebrow: "Siklus harian",
    cycleTitle: "Dari pesanan hingga ke dapur dalam dua belas jam.",
    cycle: [["20.00", "Pemesanan ditutup. Daftar belanja disusun per jenis dan ukuran, ditambah sedikit cadangan."], ["03.00", "Lelang Muara Baru: kami periksa mata, insang, aroma, dan suhu inti. Setiap lot difoto."], ["04.30", "Mitra pengolah menyiangi, memfillet, dan mengupas sesuai pesanan. Setelah produk ditimbang, tagihan akhir dikirim."], ["05.00–08.00", "Pengiriman ke dapur restoran. Pengiriman rumah tangga pukul 10.00–13.00 dan 15.00–18.00. Suhu diukur saat serah terima."]],
    stdEyebrow: "Sumber dan standar",
    stdTitle: "Dari mana produk kami berasal, dan apa yang tidak akan Anda temukan di katalog kami.",
    sources: [
      ["Ikan laut dan cumi", "Dua pengepul tetap di Muara Baru, dipilih setelah empat kali kunjungan subuh. Cadangan: pengepul ketiga dan Muara Angke."],
      ["Udang dan kerapu", "Dari tambak di Lampung dan Indramayu melalui agen tetap. Ukuran dinyatakan dalam jumlah ekor per kg, tanpa perendaman penambah berat."],
      ["Seafood beku dan salmon", "Dari pengolah bersertifikat SKP/HACCP; salmon dari importir berizin. Diterima pada suhu −18 °C, dengan nomor registrasi pada label."],
      ["Ayam dan telur", "Dari RPHU bersertifikat halal dan NKV, dengan dokumen per lot. Telur dari peternakan di Blitar dan Bogor, dikirim dua kali seminggu."],
      ["Olahan beku dan bumbu", "Hanya merek dengan nomor BPOM MD dan logo halal, dari distributor resmi."],
    ],
    dns: "Yang tidak kami jual",
    dnsList: ["Ikan buntal, ikan landak, dan ikan kotak (mengandung tetrodotoksin)", "Ikan minyak (escolar)", "Ikan napoleon dan kuda laut (satwa dilindungi)", "Hiu dan pari (CITES)", "Red Bass (Lutjanus bohar) yang dijual sebagai kakap merah"],
    guaranteeT: "Jaminan kesegaran: ganti atau uang kembali dalam 2 jam, tanpa banyak tanya.",
    guaranteeD: "Kirimkan foto melalui WhatsApp dalam 2 jam setelah pesanan diterima. Kami ganti pada pengiriman berikutnya atau kami kembalikan uang Anda. Kami menyisihkan 1,5% penjualan untuk jaminan ini, sebagai pengganti kesempatan Anda memeriksa ikan secara langsung.",
    cta: "Lihat katalog",
    markEyebrow: "Makna logo",
    markTitle: "Di pasar, saat fajar, kami pilihkan sarinya.",
    markIntro: "Kami membaca nama Dipasaria sebagai tiga kata yang menjadi janji kami: di pasar, dipa (cahaya), dan sari (inti, bagian terbaik). Setiap bagian logo menceritakan satu janji itu.",
    marks: [
      ["Keranjang lelang", "Di pasar", "Keranjang adalah lantai lelang Muara Baru. Kami pedagang prinsipal: kami sendiri yang membeli, memilih, dan bertanggung jawab atas setiap lot."],
      ["Matahari terbit", "Dipa, cahaya", "Lelang dimulai sebelum fajar. Cahaya juga berarti keterbukaan: jenis, ukuran, berat, dan suhu selalu jelas tertulis."],
      ["Ikan yang melompat", "Segar", "Baru didaratkan dan masih bergerak. Cahaya fajar menembus mata, insang, dan garis tubuhnya: tidak ada yang kami sembunyikan."],
      ["Senyum emas", "Layanan", "Lengkung di bawah keranjang adalah ombak sekaligus senyum: pengiriman tepat waktu dan jaminan ganti dalam 2 jam."],
      ["Titik emas pada huruf i", "Sari, yang terpilih", "Satu titik emas di antara huruf hitam: dari setiap lot, hanya yang terbaik yang sampai ke dapur Anda."],
    ],
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
    cycle: [["20:00", "Orders close. The buying list is built per species and grade, with a small buffer."], ["03:00", "Muara Baru auction: eyes, gills, smell, core temperature. Every lot photographed."], ["04:30", "Our cleaning partner guts, fillets and peels to order. Weighed; the final invoice is sent."], ["05:00–08:00", "Restaurant kitchen slot. Households 10:00–13:00 and 15:00–18:00. Temperature reading at hand-off."]],
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
    markEyebrow: "The meaning of the mark",
    markTitle: "At the market, at dawn, we choose the best of it.",
    markIntro: "We read the name Dipasaria as three words that make up our promise: di pasar (at the market), dipa (light) and sari (essence, the best part). Each part of the logo tells one of them.",
    marks: [
      ["The auction basket", "At the market", "The basket is the Muara Baru auction floor. We are principal traders: we buy, choose and answer for every lot ourselves."],
      ["The rising sun", "Dipa, light", "The auction starts before dawn. Light also means openness: species, size, weight and temperature are always written down."],
      ["The leaping fish", "Fresh", "Just landed and still moving. Dawn light shines through its eye, gill and lateral line: nothing hidden."],
      ["The golden smile", "Service", "The curve beneath the basket is both a wave and a smile: on-time delivery and a 2-hour replacement guarantee."],
      ["The gold dot on the i", "Sari, the chosen one", "One gold dot among black letters: from every lot, only the best reaches your kitchen."],
    ],
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
          <div className="lg:col-span-5"><p className="eyebrow">{c.storyEyebrow}</p><h2 className="mt-2 text-[2.6rem] sm:text-[3.4rem]">{c.storyTitle}</h2>{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/brand/badge-arch.svg" alt="Dipasaria · Segar & terpilih · Muara Baru, Jakarta" className="mt-8 hidden w-44 drop-shadow-[0_16px_30px_rgba(0,0,0,.18)] lg:block" /></div>
          <div className="space-y-5 font-sans text-[15px] leading-relaxed text-ink/80 lg:col-span-7">{c.story.map((x) => <p key={x}>{x}</p>)}</div>
        </div>
      </Band>
      <section id="makna-logo" className="relative overflow-hidden bg-ocean-950 text-sand-50">
        <Sisik opacity={0.08} />
        <div className="container-x relative grid gap-12 py-16 md:py-24 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <p className="flex items-center gap-3 font-sans text-[11.5px] font-bold uppercase tracking-[0.24em] text-coral-500"><span className="h-px w-10 bg-coral-500" />{c.markEyebrow}</p>
            <h2 className="mt-4 text-[2.4rem] text-sand-50 sm:text-[3.2rem]">{c.markTitle}</h2>
            <p className="mt-5 max-w-md font-sans text-[15px] leading-relaxed text-sand-50/80">{c.markIntro}</p>
            <div className="mt-10 flex items-center gap-8"><Emblem variant="reversed" className="h-40 w-40 flex-none sm:h-48 sm:w-48" /><Logo dark tagline className="hidden h-16 w-auto sm:block" /></div>
          </div>
          <ol className="grid gap-px overflow-hidden border border-white/10 bg-white/10 sm:grid-cols-2 lg:col-span-7">
            {c.marks.map(([name, tag, body], i) => (
              <li key={name} className={`bg-ocean-950 p-6 ${i === c.marks.length - 1 ? "sm:col-span-2" : ""}`}>
                <p className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-coral-500">{String(i + 1).padStart(2, "0")} · {tag}</p>
                <p className="mt-2 font-display text-[1.5rem] font-bold uppercase leading-none">{name}</p>
                <p className="mt-2 font-sans text-[13.5px] leading-relaxed text-sand-50/75">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
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
