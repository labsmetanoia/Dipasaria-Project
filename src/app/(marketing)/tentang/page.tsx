import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Sumber & standar", description: "Bagaimana kami memilih, menggrade dan mengirim seafood dan protein lain untuk dapur Jakarta." };

const DO_NOT_SELL = ["Ikan buntal, ikan landak dan ikan kotak (racun tetrodotoksin)", "Ikan minyak / escolar (Jambangan)", "Kerapu Napoleon dan kuda laut (dilindungi)", "Hiu dan pari (CITES)", "Red Bass (Lutjanus bohar) yang dijual sebagai kakap merah"];

export default function TentangPage() {
  return (
    <>
      <section className="wave-bg grain relative text-white">
        <div className="container-x py-20 md:py-24">
          <p className="eyebrow text-tide-400">Sumber & standar</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">Kami berdiri di lantai lelang Muara Baru pukul tiga pagi, supaya Anda tidak perlu.</h1>
          <p className="mt-6 max-w-2xl text-lg text-white/75">Dipasaria adalah pedagang prinsipal: kami membeli dan memiliki barang sebelum menjualnya, sehingga kami yang bertanggung jawab atas grade, berat, kebersihan dan suhu. Bukan marketplace, bukan perantara.</p>
        </div>
      </section>

      <section className="container-x grid gap-12 py-20 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionTitle eyebrow="Seafood" title="Dilelang sesuai pesanan, bukan sesuai tebakan." />
        </div>
        <div className="space-y-6 text-[15px] leading-relaxed text-ink/80 lg:col-span-7">
          <p>Setiap malam pukul {"20:00"} kami menutup pesanan dan menyusun daftar beli per spesies dan grade ukuran, ditambah cadangan kecil untuk memilih ekor yang pas. Pukul 03.00 kami memilih langsung dari dua bakul tetap di Muara Baru, memeriksa mata, insang, bau dan suhu inti, lalu memotret setiap lot.</p>
          <p>Mitra pembersih kami menyiangi, memfillet atau mengupas sesuai pesanan sebelum pukul 06.00. Setiap pesanan ditimbang setelah disiapkan, dan invoice final dikirim via WhatsApp sebelum kurir berangkat. Ikan segar tidak pernah kami simpan semalaman; sisa dibekukan dalam empat jam atau disalurkan ke reseller pagi itu juga.</p>
          <p>Udang vaname dan kerapu budidaya datang dari tambak Lampung dan Indramayu melalui agen tetap; salmon dari importir berizin; produk beku dari pengolah yang memiliki SKP dan HACCP.</p>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionTitle eyebrow="Ayam, telur & bumbu" title="Dipilih karena sudah ada di daftar belanja dapur Anda." />
          </div>
          <div className="space-y-6 text-[15px] leading-relaxed text-ink/80 lg:col-span-7">
            <p>Ayam beku dan ayam potong segar hanya dari rumah potong (RPHU) bersertifikat halal dan NKV, dengan dokumen per lot yang bisa kami tunjukkan jika restoran Anda memintanya. Ayam dikemas dalam liner tertutup dan diletakkan terpisah dari ikan, tidak pernah dalam es yang sama.</p>
            <p>Nugget, sosis dan bakso ikan dari merek dengan nomor BPOM MD dan logo halal. Telur dari peternakan Blitar dan Bogor, diantar dua kali seminggu ke gudang kami. Bumbu dan kebutuhan dapur dibatasi pada 20–30 item yang restoran pesan ulang setiap minggu; kami tidak akan menjadi toko kelontong.</p>
          </div>
        </div>
      </section>

      <section className="container-x py-20">
        <SectionTitle eyebrow="Rantai dingin" title="Tiga zona suhu, satu kotak." />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { t: "Segar 0–4 °C", d: "Ikan, udang, cumi dan ayam potong segar di atas es gel dalam kotak terinsulasi, tahan ≤4 °C selama 6–8 jam." },
            { t: "Beku −18 °C", d: "Fillet, udang kupas, ayam beku dan frozen food dalam kantong terinsulasi terpisah di dalam kotak yang sama." },
            { t: "Suhu ruang", d: "Telur dan bumbu dalam tote terpisah, tidak pernah bersentuhan dengan produk basah." },
          ].map((z) => (
            <div key={z.t} className="card p-6">
              <h3 className="text-lg font-semibold text-ocean-900">{z.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mute">{z.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ocean-900 py-20 text-white">
        <div className="container-x grid gap-10 lg:grid-cols-2">
          <div>
            <SectionTitle light eyebrow="Daftar tidak-dijual" title="Yang tidak akan Anda temukan di katalog kami." />
            <ul className="mt-8 space-y-3 text-[15px] text-white/80">
              {DO_NOT_SELL.map((d) => <li key={d} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-coral-500" />{d}</li>)}
            </ul>
          </div>
          <div>
            <SectionTitle light eyebrow="Garansi kesegaran" title="Ganti atau refund dalam 2 jam. Tanpa debat." />
            <p className="mt-6 text-[15px] leading-relaxed text-white/75">Jika ada produk yang tidak segar saat diterima, kirim foto via WhatsApp dalam 2 jam setelah pengiriman. Kami ganti pada pengiriman berikutnya atau kembalikan uangnya. Kami menganggarkan 1,5% penjualan untuk ini, karena itulah pengganti dari memeriksa ikan dengan tangan Anda sendiri.</p>
            <Link href="/belanja" className="btn mt-8 bg-white text-ocean-900 hover:bg-tide-50">Lihat katalog <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
