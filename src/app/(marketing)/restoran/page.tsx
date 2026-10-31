import type { Metadata } from "next";
import { Check } from "lucide-react";
import { getRepo } from "@/lib/data";
import { SectionTitle } from "@/components/ui";
import { BusinessApplyForm } from "@/components/shop/BusinessApplyForm";
import { rupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Untuk restoran", description: "Akun bisnis dengan harga grosir, slot dapur subuh, tempo mingguan dan invoice bernama spesies." };

export default async function RestoranPage() {
  const repo = await getRepo();
  const [settings, areas] = await Promise.all([repo.getSettings(), repo.getAreas()]);
  return (
    <>
      <section className="wave-bg grain relative text-white">
        <div className="container-x grid gap-10 py-20 md:grid-cols-2 md:py-24">
          <div>
            <p className="eyebrow text-tide-400">Akun bisnis</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">Pesanan 60 detik pukul 21.00. Ikan dan ayam di dapur pukul 07.00.</h1>
            <p className="mt-6 text-lg text-white/75">Satu pemasok untuk pusat piring: seafood bergrade, ayam halal, telur dan bumbu, dalam satu pengiriman subuh dan satu invoice.</p>
            <ul className="mt-8 space-y-3 text-[15px]">
              {[
                "Harga grosir di katalog yang sama, tampil setelah login",
                "Pesan lagi: keranjang terisi dari pesanan terakhir, ubah jumlah, selesai",
                `Pengiriman gratis dari ${rupiah(settings.free_delivery_business)}; slot dapur 05.00–08.00`,
                "Prabayar untuk 10 pesanan pertama, lalu tempo 3 hari, lalu tempo mingguan",
                "Invoice final bernama spesies, grade dan lot untuk pembukuan dan pajak",
                "Sertifikat halal pemasok ayam tersedia per lot",
              ].map((t) => <li key={t} className="flex gap-3"><Check className="mt-0.5 h-5 w-5 flex-none text-tide-400" />{t}</li>)}
            </ul>
          </div>
          <div id="daftar" className="rounded-3xl bg-white p-6 text-ink shadow-float sm:p-8">
            <h2 className="text-2xl font-semibold text-ocean-900">Daftar akun bisnis</h2>
            <p className="mt-1 text-sm text-mute">Kami tinjau dalam 1 hari kerja dan kirim kode akses via WhatsApp.</p>
            <div className="mt-6"><BusinessApplyForm areas={areas} /></div>
          </div>
        </div>
      </section>

      <section className="container-x py-20">
        <SectionTitle eyebrow="Alur kerja" title="Dirancang di sekitar jam dapur, bukan jam kantor." />
        <div className="mt-10 grid gap-6 md:grid-cols-4">
          {[
            ["21.00", "Pemilik membuka ikon di layar HP, menekan Pesan lagi, menaikkan kakap dari 5 ke 6 kg, checkout. Konfirmasi WhatsApp masuk."],
            ["03.00", "Kami melelang sesuai daftar, memotret lot, menyiangi sesuai spesifikasi akun Anda."],
            ["04.30", "Ditimbang. Invoice final dikirim via WhatsApp beserta nama spesies dan grade."],
            ["05.00–08.00", "Kurir mengantar dengan pembacaan suhu di serah terima. Pembayaran sesuai tempo akun."],
          ].map(([t, d]) => (
            <div key={t} className="card p-6">
              <p className="font-display text-3xl font-semibold text-tide-600">{t}</p>
              <p className="mt-3 text-sm leading-relaxed text-mute">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="container-x">
          <SectionTitle eyebrow="Siapa yang kami layani" title="Restoran independen di satu rute yang sama." >
            Rute padat menjaga ongkos per drop rendah dan pengiriman tepat waktu. Kami tumbuh rute demi rute.
          </SectionTitle>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Restoran seafood & Chinese-Indonesian", "Kakap, kerapu, cumi, udang bergrade; ayam potong; telur per peti."],
              ["Padang, Sunda, Manado", "Kembung, tongkol, bandeng harian; ayam potong 8/12; bumbu dapur."],
              ["Ayam geprek & fried chicken", "Ayam potong segar dengan band ukuran konsisten dan dokumen halal; telur; minyak 18 L."],
              ["Kafe & cloud kitchen", "Dori, salmon portion, dada fillet, frozen food sebagai menu tambahan."],
              ["Katering", "Volume mingguan dengan spesifikasi tertulis dan jadwal tetap."],
              ["Warung & reseller frozen", "Pack beku, grade-B pagi itu juga, nugget dan sosis."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-line p-5">
                <p className="font-semibold text-ocean-900">{t}</p>
                <p className="mt-1 text-sm text-mute">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
