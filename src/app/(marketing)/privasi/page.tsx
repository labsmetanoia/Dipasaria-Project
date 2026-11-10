import type { Metadata } from "next";
import { BRAND } from "@/lib/config";
import { getT } from "@/lib/i18n/server";
import { IMAGES } from "@/lib/content/images";
import { PageHero } from "@/components/site/Sections";

export const metadata: Metadata = { title: "Kebijakan privasi" };

const copy = {
  id: {
    eyebrow: "Kebijakan privasi",
    title: "Data Anda dipakai untuk mengantar pesanan, tidak untuk yang lain.",
    body: [
      `${BRAND.legalName} mengumpulkan nama, nomor WhatsApp, alamat pengiriman dan riwayat pesanan Anda untuk memproses, mengantar dan menagih pesanan, serta menghubungi Anda tentang pesanan tersebut. Dasar pemrosesannya adalah pelaksanaan perjanjian jual beli, sesuai Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.`,
      "Data disimpan di basis data yang kami kendalikan pada penyedia cloud dengan enkripsi dalam transit dan saat tersimpan. Hanya pemilik usaha dan staf yang ditunjuk yang memiliki akses ke panel administrasi. Kami tidak menjual atau membagikan data Anda kepada pihak ketiga, kecuali kepada mitra kurir sebatas nama, alamat dan nomor telepon yang diperlukan untuk pengantaran.",
      "Pelacakan pesanan memerlukan nomor pesanan dan nomor WhatsApp yang digunakan saat memesan, sehingga orang lain tidak dapat melihat pesanan Anda. Akun bisnis masuk dengan kode akses yang bisa kami ganti kapan saja atas permintaan Anda.",
      "Anda dapat meminta salinan, perbaikan atau penghapusan data Anda melalui WhatsApp kami. Riwayat transaksi yang diperlukan untuk kewajiban perpajakan disimpan sesuai ketentuan yang berlaku.",
      "Situs ini menyimpan keranjang belanja, pilihan bahasa dan detail pengiriman terakhir di perangkat Anda sendiri agar pesanan berikutnya lebih cepat; data tersebut tidak dikirim ke kami sampai Anda menekan tombol pesan.",
    ],
  },
  en: {
    eyebrow: "Privacy policy",
    title: "Your data is used to deliver your order, and nothing else.",
    body: [
      `${BRAND.legalName} collects your name, WhatsApp number, delivery address and order history to process, deliver and invoice orders and to contact you about them. The legal basis is performance of the sales contract, under Indonesia's Law No. 27 of 2022 on Personal Data Protection.`,
      "Data is stored in a database we control at a cloud provider, encrypted in transit and at rest. Only the business owner and designated staff can access the administration panel. We do not sell or share your data with third parties, except the name, address and phone number a courier partner needs for delivery.",
      "Order tracking requires the order number and the WhatsApp number used when ordering, so nobody else can see your order. Business accounts sign in with an access code we can change at any time on request.",
      "You may request a copy, correction or deletion of your data through our WhatsApp. Transaction records required for tax obligations are kept as the law requires.",
      "This site stores your cart, language choice and last delivery details on your own device to speed up the next order; that data is not sent to us until you press the order button.",
    ],
  },
};

export default async function PrivasiPage() {
  const { locale } = await getT();
  const c = copy[locale];
  return (
    <>
      <PageHero eyebrow={c.eyebrow} title={c.title} icon="snow" image={IMAGES.standards} compact />
      <section className="container-x py-16"><div className="mx-auto max-w-2xl space-y-5 font-sans text-[16px] leading-[1.75] text-ink/85">{c.body.map((p, i) => <p key={i}>{p}</p>)}</div></section>
    </>
  );
}
