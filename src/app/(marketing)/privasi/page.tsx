import type { Metadata } from "next";
import { BRAND } from "@/lib/config";

export const metadata: Metadata = { title: "Kebijakan privasi" };

export default function PrivasiPage() {
  return (
    <section className="container-x max-w-3xl py-16 md:py-20">
      <p className="eyebrow">Kebijakan privasi</p>
      <h1 className="mt-3 text-3xl font-semibold text-ocean-900 sm:text-4xl">Data Anda dipakai untuk mengantar pesanan, tidak untuk yang lain.</h1>
      <div className="prose mt-8 max-w-none space-y-5 text-[15px] leading-relaxed text-ink/80">
        <p>{BRAND.legalName} mengumpulkan nama, nomor WhatsApp, alamat pengiriman dan riwayat pesanan Anda untuk memproses, mengantar dan menagih pesanan, serta menghubungi Anda tentang pesanan tersebut. Dasar pemrosesannya adalah pelaksanaan perjanjian jual beli, sesuai Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.</p>
        <p>Data disimpan di basis data yang kami kendalikan pada penyedia cloud dengan enkripsi dalam transit dan saat tersimpan. Hanya pemilik usaha dan staf yang ditunjuk yang memiliki akses ke panel administrasi. Kami tidak menjual atau membagikan data Anda kepada pihak ketiga, kecuali kepada mitra kurir sebatas nama, alamat dan nomor telepon yang diperlukan untuk pengantaran.</p>
        <p>Pelacakan pesanan memerlukan nomor pesanan dan nomor WhatsApp yang digunakan saat memesan, sehingga orang lain tidak dapat melihat pesanan Anda. Akun bisnis masuk dengan kode akses yang bisa kami ganti kapan saja atas permintaan Anda.</p>
        <p>Anda dapat meminta salinan, perbaikan atau penghapusan data Anda melalui WhatsApp kami. Riwayat transaksi yang diperlukan untuk kewajiban perpajakan disimpan sesuai ketentuan yang berlaku.</p>
        <p>Situs ini menyimpan keranjang belanja dan detail pengiriman terakhir di perangkat Anda sendiri agar pesanan berikutnya lebih cepat; data tersebut tidak dikirim ke kami sampai Anda menekan tombol pesan.</p>
      </div>
    </section>
  );
}
