import Link from "next/link";
import { ArrowRight, Clock, Fish, ShieldCheck, Snowflake, Store, Home, Scale, Tag, Truck } from "lucide-react";
import { getRepo } from "@/lib/data";
import { ProductIcon } from "@/components/Icons";
import { ProductArt } from "@/components/ProductArt";
import { SectionTitle } from "@/components/ui";
import { rupiah } from "@/lib/format";
import { BRAND } from "@/lib/config";

export default async function HomePage() {
  const repo = await getRepo();
  const [settings, categories, products] = await Promise.all([repo.getSettings(), repo.getCategories(), repo.getProducts()]);
  const todaysCatch = products.filter((p) => p.storage_class === "chilled" && p.available_today && p.category_id !== "c_ayam").slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="wave-bg grain relative overflow-hidden text-white">
        <div className="container-x relative grid items-center gap-12 py-20 md:grid-cols-12 md:py-28">
          <div className="md:col-span-7">
            <p className="eyebrow rise text-tide-400">Pemasok protein untuk dapur {BRAND.city}</p>
            <h1 className="rise rise-2 mt-4 text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl">
              Ikan yang benar, bernama dan bergrade. <span className="text-tide-400">Diantar sebelum dapur Anda buka.</span>
            </h1>
            <p className="rise rise-3 mt-6 max-w-xl text-lg leading-relaxed text-white/75">
              Kami melelang langsung di Muara Baru sebelum subuh, menimbang dan menyiangi sesuai pesanan, lalu mengirim dalam rantai dingin 0–4 °C. Ayam, telur dan bumbu dapur ikut dalam kotak yang sama.
            </p>
            <div className="rise rise-3 mt-8 flex flex-wrap gap-3">
              <Link href="/belanja" className="btn-accent px-6 py-3 text-base">Lihat tangkapan hari ini <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/restoran" className="btn px-6 py-3 text-base text-white ring-1 ring-white/30 hover:bg-white/10">Untuk restoran</Link>
            </div>
            <dl className="mt-12 grid grid-cols-2 gap-6 text-sm sm:grid-cols-4">
              {[
                [Clock, "Pesan sebelum", `${settings.cutoff_time} WIB`],
                [Fish, "Lelang subuh", "Muara Baru"],
                [Snowflake, "Rantai dingin", "0–4 °C"],
                [ShieldCheck, "Garansi", "Ganti / refund 2 jam"],
              ].map(([Icon, k, v]) => {
                const I = Icon as typeof Clock;
                return (
                  <div key={k as string} className="border-l border-white/15 pl-4">
                    <I className="h-4 w-4 text-tide-400" />
                    <dt className="mt-2 text-white/55">{k as string}</dt>
                    <dd className="font-semibold">{v as string}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
          <div className="relative md:col-span-5">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-sm rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-float backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span>Spesifikasi produk</span>
                <span className="rounded-full bg-tide-500/20 px-2 py-0.5 text-tide-400">Segar 0–4 °C</span>
              </div>
              <div className="mt-6 flex h-40 items-center justify-center rounded-2xl bg-white/5">
                <ProductIcon name="fish" className="h-24 w-24 text-tide-400" />
              </div>
              <h3 className="mt-6 font-display text-2xl font-semibold">Kakap Merah</h3>
              <p className="text-sm text-white/60">Malabar Snapper · <i>Lutjanus malabaricus</i></p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white/10 px-2.5 py-1">1–2 kg/ekor</span>
                <span className="rounded-full bg-white/10 px-2.5 py-1">Siangi</span>
                <span className="rounded-full bg-white/10 px-2.5 py-1">Fillet</span>
                <span className="rounded-full bg-white/10 px-2.5 py-1">Muara Baru, subuh</span>
              </div>
              <div className="mt-6 flex items-end justify-between">
                <div>
                  <p className="text-xs text-white/50">Per kg, ditimbang</p>
                  <p className="font-display text-2xl font-semibold">{rupiah(115000)}</p>
                </div>
                <span className="rounded-full bg-coral-500 px-3 py-1.5 text-xs font-semibold">Tambah</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-x py-20">
        <SectionTitle eyebrow="Cara kerja" title="Satu siklus harian, dari lelang ke dapur Anda.">
          Kami membeli hanya sesuai pesanan. Tidak ada ikan yang menginap, tidak ada tebak-tebakan grade.
        </SectionTitle>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { t: `Pesan sebelum ${settings.cutoff_time}`, d: "Pilih spesies, ukuran dan cara penyiapan. Restoran cukup tekan “Pesan lagi”; rumah tangga bebas tanpa akun.", n: "01" },
            { t: "Kami lelang & grade subuh", d: "Pukul 03.00 kami memilih di Muara Baru dengan standar grade tertulis, memotret tiap lot, lalu menimbang dan menyiangi.", n: "02" },
            { t: "Diantar dingin pagi hari", d: "Kotak berpendingin 0–4 °C untuk ikan, liner terpisah untuk ayam dan produk beku. Slot dapur 05.00–08.00, rumah tangga 10.00–18.00.", n: "03" },
          ].map((s) => (
            <li key={s.n} className="card relative p-7">
              <span className="font-display text-5xl font-semibold text-sand-300">{s.n}</span>
              <h3 className="mt-4 text-xl font-semibold text-ocean-900">{s.t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-mute">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Categories */}
      <section className="bg-white py-20">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionTitle eyebrow="Katalog" title="Seafood sebagai inti. Semua protein dapur dalam satu pengiriman." />
            <Link href="/belanja" className="btn-secondary">Semua produk <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
            {categories.map((c) => (
              <Link key={c.id} href={`/belanja/kategori/${c.slug}`} className="group rounded-2xl border border-line p-5 transition hover:-translate-y-0.5 hover:border-tide-500 hover:shadow-soft">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-tide-50 text-tide-600 group-hover:bg-tide-100">
                  <ProductIcon name={c.icon} className="h-7 w-7" />
                </div>
                <p className="mt-4 font-semibold text-ocean-900">{c.name}</p>
                <p className="mt-1 text-xs text-mute">{products.filter((p) => p.category_id === c.id).length} produk</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Today's catch */}
      {todaysCatch.length > 0 && (
        <section className="container-x py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionTitle eyebrow="Tangkapan hari ini" title="Yang kami pilih untuk dilelang subuh nanti.">
              Harga per kg, ditimbang sebelum dikirim. Nama spesies ilmiah di setiap produk supaya Anda tahu persis yang dibeli.
            </SectionTitle>
            <Link href="/belanja/kategori/ikan-segar" className="btn-secondary">Lihat semua ikan segar</Link>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {todaysCatch.map((p) => (
              <Link key={p.id} href={`/belanja/produk/${p.slug}`} className="card group overflow-hidden">
                <div className="aspect-square overflow-hidden"><ProductArt icon={p.icon} storage={p.storage_class} image={p.image_url} alt={p.name} /></div>
                <div className="p-3.5">
                  <p className="font-semibold text-ocean-900">{p.name}</p>
                  <p className="truncate text-xs italic text-mute">{p.scientific_name}</p>
                  <p className="mt-2 text-sm font-semibold">{rupiah(Math.min(...p.variants.filter((v) => !v.business_only).map((v) => v.price_retail)))}<span className="text-xs font-normal text-mute">/{p.variants[0].unit}</span></p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Two audiences */}
      <section className="bg-ocean-900 py-20 text-white">
        <div className="container-x grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-10">
            <Store className="h-7 w-7 text-tide-400" />
            <h3 className="mt-5 text-3xl font-semibold">Untuk restoran & dapur komersial</h3>
            <p className="mt-3 text-white/70">Ganti perjalanan subuh ke pasar dengan satu pesanan 60 detik. Harga grosir, tempo mingguan setelah terbukti, dan invoice bernama spesies untuk pembukuan Anda.</p>
            <ul className="mt-6 space-y-3 text-[15px]">
              {["Harga grosir & diskon akun setelah login", "Slot dapur 05.00–08.00, pesanan ulang satu sentuhan", "Grade ukuran konsisten, penyiangan sesuai spesifikasi", "Ayam potong halal, telur per peti, bumbu 5 L dalam pengiriman yang sama", "Invoice final setelah penimbangan, dikirim via WhatsApp"].map((t) => (
                <li key={t} className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-tide-400" />{t}</li>
              ))}
            </ul>
            <Link href="/restoran" className="btn-accent mt-8">Daftar akun bisnis <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-10">
            <Home className="h-7 w-7 text-tide-400" />
            <h3 className="mt-5 text-3xl font-semibold">Untuk rumah tangga</h3>
            <p className="mt-3 text-white/70">Ikan segar yang sudah disiangi atau difillet, udang kupas, salmon portion dan stok freezer, tanpa bau dan tanpa duri di dapur Anda.</p>
            <ul className="mt-6 space-y-3 text-[15px]">
              {["Belanja tanpa akun, minimum Rp 150.000", "Pilih ukuran dan cara penyiapan: siangi, fillet, kupas", "Slot pagi 10.00–13.00 atau sore 15.00–18.00, besok", "Bayar QRIS atau transfer setelah berat final dikonfirmasi", "Ganti atau refund dalam 2 jam jika tidak segar"].map((t) => (
                <li key={t} className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-tide-400" />{t}</li>
              ))}
            </ul>
            <Link href="/belanja" className="btn mt-8 bg-white text-ocean-900 hover:bg-tide-50">Mulai belanja <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      {/* Standards */}
      <section className="container-x py-20">
        <SectionTitle eyebrow="Standar kami" title="Transparansi yang menggantikan kebiasaan memeriksa insang sendiri.">
          Membeli ikan online menuntut kepercayaan. Kami menggantinya dengan standar tertulis, bukan janji.
        </SectionTitle>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { I: Tag, t: "Nama spesies, bukan nama dagang", d: "Setiap ikan membawa nama Indonesia, Inggris dan ilmiah. Kakap merah kami Lutjanus malabaricus, bukan Red Bass." },
            { I: Scale, t: "Grade ukuran & berat ditimbang", d: "Pilih 500–800 g atau 1–2 kg per ekor. Total akhir mengikuti timbangan, bukan perkiraan." },
            { I: Snowflake, t: "Rantai dingin yang dicatat", d: "Suhu inti ≤4 °C sejak lelang, es gel dan kotak terinsulasi, pembacaan suhu di setiap rute." },
            { I: Truck, t: "Daftar tidak-dijual", d: "Tanpa ikan buntal, ikan minyak, kerapu Napoleon, hiu dan pari. Hanya ayam dari RPHU bersertifikat halal." },
          ].map(({ I, t, d }) => (
            <div key={t} className="card p-6">
              <I className="h-6 w-6 text-tide-600" />
              <h3 className="mt-4 text-lg font-semibold text-ocean-900">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mute">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-sand-100 px-6 py-5">
          <p className="text-[15px] text-ink/80">Ingin melihat bagaimana kami memilih dan menggrade ikan di Muara Baru?</p>
          <Link href="/tentang" className="btn-primary">Sumber & standar <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </>
  );
}
