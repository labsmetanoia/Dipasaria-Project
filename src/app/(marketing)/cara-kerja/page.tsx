import type { Metadata } from "next";
import { getRepo } from "@/lib/data";
import { SectionTitle } from "@/components/ui";
import { rupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Cara kerja & FAQ" };

export default async function CaraKerjaPage() {
  const repo = await getRepo();
  const [settings, areas, slots] = await Promise.all([repo.getSettings(), repo.getAreas(), repo.getSlots()]);
  const faq: Array<[string, string]> = [
    ["Mengapa total pesanan saya “perkiraan”?", "Ikan, udang dan cumi segar dijual per kg dan ditimbang setelah disiapkan. Anda memesan perkiraan (misalnya 1 kg kakap), kami menimbang hasil akhirnya (misalnya 1,05 kg) dan mengirim invoice final via WhatsApp sebelum pengiriman. Produk beku, ayam beku, telur dan bumbu harganya tetap."],
    ["Kapan batas pesan?", `Pukul ${settings.cutoff_time} WIB untuk pengiriman besok. Setelah itu, tanggal terdekat yang bisa dipilih adalah lusa. Anda bisa memesan hingga ${settings.max_days_ahead} hari ke depan.`],
    ["Berapa minimum pesanan dan ongkir?", `Rumah tangga minimum ${rupiah(settings.min_order_retail)}, gratis ongkir dari ${rupiah(settings.free_delivery_retail)}. Akun bisnis minimum ${rupiah(settings.min_order_business)} dan gratis ongkir. Di bawah itu, ongkir mengikuti area: ${areas.map((a) => `${a.name.split(" (")[0]} ${rupiah(a.fee)}`).join(", ")}.`],
    ["Bagaimana cara bayar?", "QRIS atau transfer bank setelah berat final dikonfirmasi; tekan “Saya sudah bayar” di halaman pesanan dan kami cek di aplikasi bank. Akun bisnis yang disetujui bisa bayar saat terima (COD) atau tempo mingguan."],
    ["Slot pengiriman apa yang tersedia?", slots.map((s) => `${s.label} ${s.start_time}–${s.end_time}${s.segment === "business" ? " (akun bisnis)" : s.segment === "retail" ? " (rumah tangga)" : ""}`).join("; ") + ". Setiap slot punya kapasitas supaya kami tidak menjanjikan lebih dari yang bisa diantar satu kendaraan."],
    ["Bagaimana jika ikan tidak segar?", "Kirim foto via WhatsApp dalam 2 jam setelah diterima. Kami ganti di pengiriman berikutnya atau kembalikan uangnya, tanpa debat."],
    ["Bagaimana cara melacak pesanan dari HP lain?", "Buka halaman Pesanan, masukkan nomor pesanan (misalnya DP-261101-K7M2) dan nomor WhatsApp yang dipakai saat memesan."],
    ["Apakah ayamnya halal?", "Ya. Kami hanya membeli dari rumah potong dan merek dengan sertifikat halal yang sah dan menyimpan salinannya per pemasok. Ayam selalu dikemas terpisah dari ikan."],
    ["Bagaimana restoran mendapat akses harga grosir?", "Isi formulir di halaman Untuk Restoran. Kami tinjau, tetapkan tingkat harga dan tempo, lalu kirim kode akses 6 karakter via WhatsApp. Masuk dengan nomor WhatsApp dan kode itu; tanpa kata sandi."],
  ];
  return (
    <>
      <section className="container-x py-16 md:py-20">
        <SectionTitle eyebrow="Cara kerja" title="Pertanyaan yang biasa diajukan sebelum pesanan pertama." />
        <div className="mt-10 divide-y divide-line rounded-2xl border border-line bg-white">
          {faq.map(([q, a]) => (
            <details key={q} className="group px-6 py-5 open:bg-sand-50/60">
              <summary className="cursor-pointer list-none font-semibold text-ocean-900 marker:content-none">
                <span className="flex items-center justify-between gap-4">{q}<span className="text-mute transition group-open:rotate-45">+</span></span>
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-mute">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
