import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { getRepo } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import { guides } from "@/lib/content/guides";
import { HeroSlider } from "@/components/site/HeroSlider";
import { Band, SplitHeading, FactStrip, PillarCard } from "@/components/site/Sections";
import { ImageSlot } from "@/components/site/Decor";
import { ContactForm } from "@/components/site/ContactForm";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductIcon } from "@/components/Icons";
import { formatDate, rupiah } from "@/lib/format";

const copy = {
  id: {
    slides: [
      { eyebrow: "Pemasok protein untuk dapur Jakarta", title: "Ikan yang benar, bernama dan bergrade, diantar sebelum dapur Anda buka.", sub: "Dilelang langsung di Muara Baru sebelum subuh, ditimbang dan disiangi sesuai pesanan, dikirim dalam rantai dingin 0–4 °C.", cta: { href: "/belanja", label: "Lihat tangkapan hari ini" }, cta2: { href: "/restoran", label: "Untuk restoran" }, icon: "fish" },
      { eyebrow: "Untuk restoran & dapur komersial", title: "Satu pesanan 60 detik pukul 21.00. Ikan dan ayam di dapur pukul 07.00.", sub: "Harga grosir, slot dapur 05.00–08.00, tempo setelah terbukti, dan invoice bernama spesies untuk pembukuan Anda.", cta: { href: "/restoran#daftar", label: "Daftar akun bisnis" }, cta2: { href: "/restoran", label: "Pelajari layanan B2B" }, icon: "shrimp" },
      { eyebrow: "Untuk rumah tangga", title: "Udang kupas, fillet tanpa duri, salmon portion: isi freezer sekali pesan.", sub: "Belanja tanpa akun, minimum Rp 150.000, slot pagi atau sore besok, bayar setelah berat final dikonfirmasi.", cta: { href: "/belanja/kategori/paket-hemat", label: "Lihat paket hemat" }, cta2: { href: "/rumah-tangga", label: "Cara belanjanya" }, icon: "box" },
    ],
    counter: "{i} dari {n}",
    aboutEyebrow: "Tentang kami",
    aboutTitle: "Pedagang prinsipal yang berdiri di lantai lelang Muara Baru pukul tiga pagi.",
    aboutBody: "Dipasaria membeli dan memiliki barang sebelum menjualnya, sehingga kami yang bertanggung jawab atas grade, berat, kebersihan dan suhu, bukan perantara. Seafood adalah inti; ayam halal, telur dan bumbu dapur ikut dalam kotak yang sama supaya dapur Anda cukup punya satu pemasok untuk pusat piring.",
    aboutCta: "Cerita & nilai kami",
    factsEyebrow: "Cara kami bekerja",
    facts: [
      { value: "20:00", label: "Batas pesan", sub: "WIB, untuk pengiriman besok" },
      { value: "03:00", label: "Lelang Muara Baru", sub: "dipilih dan difoto per lot" },
      { value: "0–4 °C", label: "Rantai dingin", sub: "suhu inti dicatat tiap rute" },
      { value: "2 jam", label: "Garansi ganti", sub: "atau refund setelah diterima" },
      { value: "5 area", label: "Jakarta & Tangerang", sub: "slot pagi, sore dan dapur" },
    ],
    pillarsEyebrow: "Rangkaian produk",
    pillarsTitle: "Seafood sebagai inti. Semua protein dapur dalam satu pengiriman.",
    pillarsBody: "Kami sengaja tidak menjadi toko kelontong. Rangkaian dibatasi pada yang dapur Anda beli setiap minggu dan yang bisa kami jaga standarnya.",
    pillars: [
      { href: "/belanja/kategori/ikan-segar", title: "Seafood segar & beku", sub: "Kakap, kerapu, udang, cumi, fillet", icon: "fish" },
      { href: "/belanja/kategori/ayam", title: "Ayam & telur halal", sub: "RPHU bersertifikat, NKV, per lot", icon: "chicken" },
      { href: "/belanja/kategori/bumbu-dapur", title: "Bumbu & kebutuhan dapur", sub: "20–30 item yang dipesan ulang mingguan", icon: "bottle" },
      { href: "/restoran", title: "Layanan restoran", sub: "Harga grosir, slot subuh, tempo", icon: "shrimp" },
    ],
    catchEyebrow: "Tangkapan hari ini",
    catchTitle: "Yang kami pilih untuk dilelang subuh nanti.",
    catchBody: "Harga per kg, ditimbang sebelum dikirim. Nama ilmiah di setiap produk supaya Anda tahu persis yang dibeli.",
    catchCta: "Semua ikan segar",
    b2bEyebrow: "Akun bisnis",
    b2bTitle: "Pemasok tunggal untuk pusat piring.",
    b2bBody: "Ganti perjalanan subuh ke pasar dengan satu pesanan 60 detik. Tekan Pesan lagi, ubah jumlah, selesai.",
    b2bPoints: ["Harga grosir & diskon akun setelah login", "Slot dapur 05.00–08.00, kapasitas dijaga per kendaraan", "Grade ukuran tertulis, penyiangan sesuai spesifikasi", "Prabayar, lalu tempo 3 hari, lalu mingguan", "Invoice final bernama spesies setelah penimbangan"],
    b2bCta: "Daftar akun bisnis",
    b2bCta2: "Masuk akun",
    guidesEyebrow: "Panduan",
    guidesTitle: "Mengenal ikan, menyimpan dengan benar, menghitung biaya dapur.",
    guidesCta: "Semua panduan",
    read: "Baca",
    contactEyebrow: "Kontak",
    contactTitle: "Hubungi kami.",
    contactBody: "Untuk pertanyaan akun bisnis, kerja sama pemasok atau komplain. Pesanan sebaiknya melalui katalog supaya harga, berat dan slot tercatat.",
  },
  en: {
    slides: [
      { eyebrow: "Protein supplier for Jakarta's kitchens", title: "The right fish, named and graded, delivered before your kitchen opens.", sub: "Auctioned at Muara Baru before dawn, weighed and cleaned to order, delivered in a 0–4 °C cold chain.", cta: { href: "/belanja", label: "See today's catch" }, cta2: { href: "/restoran", label: "For restaurants" }, icon: "fish" },
      { eyebrow: "For restaurants & commercial kitchens", title: "A 60-second order at 9 pm. Fish and chicken in your kitchen by 7 am.", sub: "Wholesale prices, a 05:00–08:00 kitchen slot, terms once established, and species-named invoices for your books.", cta: { href: "/restoran#daftar", label: "Open a business account" }, cta2: { href: "/restoran", label: "Explore B2B service" }, icon: "shrimp" },
      { eyebrow: "For households", title: "Peeled shrimp, boneless fillets, salmon portions: stock the freezer in one order.", sub: "No account needed, Rp 150,000 minimum, morning or afternoon slot tomorrow, pay once the final weight is confirmed.", cta: { href: "/belanja/kategori/paket-hemat", label: "See value boxes" }, cta2: { href: "/rumah-tangga", label: "How it works" }, icon: "box" },
    ],
    counter: "{i} of {n}",
    aboutEyebrow: "About us",
    aboutTitle: "A principal trader standing on the Muara Baru auction floor at three in the morning.",
    aboutBody: "Dipasaria buys and owns the goods before selling them, so we, not a middleman, answer for grade, weight, cleanliness and temperature. Seafood is the core; halal chicken, eggs and pantry staples ride in the same box so your kitchen needs one supplier for the centre of the plate.",
    aboutCta: "Our story & values",
    factsEyebrow: "How we work",
    facts: [
      { value: "20:00", label: "Order cut-off", sub: "WIB, for next-day delivery" },
      { value: "03:00", label: "Muara Baru auction", sub: "selected and photographed per lot" },
      { value: "0–4 °C", label: "Cold chain", sub: "core temperature logged per route" },
      { value: "2 hours", label: "Replacement guarantee", sub: "or refund after delivery" },
      { value: "5 areas", label: "Jakarta & Tangerang", sub: "morning, afternoon and kitchen slots" },
    ],
    pillarsEyebrow: "Our range",
    pillarsTitle: "Seafood at the core. Every kitchen protein in one delivery.",
    pillarsBody: "We deliberately aren't a grocery store. The range is limited to what your kitchen buys every week and what we can keep to standard.",
    pillars: [
      { href: "/belanja/kategori/ikan-segar", title: "Fresh & frozen seafood", sub: "Snapper, grouper, shrimp, squid, fillets", icon: "fish" },
      { href: "/belanja/kategori/ayam", title: "Halal chicken & eggs", sub: "Certified slaughterhouses, NKV, per lot", icon: "chicken" },
      { href: "/belanja/kategori/bumbu-dapur", title: "Pantry & condiments", sub: "20–30 items reordered weekly", icon: "bottle" },
      { href: "/restoran", title: "Restaurant service", sub: "Wholesale prices, dawn slot, terms", icon: "shrimp" },
    ],
    catchEyebrow: "Today's catch",
    catchTitle: "What we have chosen to bid for at dawn.",
    catchBody: "Price per kg, weighed before dispatch. Scientific names on every product so you know exactly what you're buying.",
    catchCta: "All fresh fish",
    b2bEyebrow: "Business account",
    b2bTitle: "One supplier for the centre of the plate.",
    b2bBody: "Replace the dawn market trip with one 60-second order. Tap Reorder, adjust quantities, done.",
    b2bPoints: ["Wholesale prices and account discount after sign-in", "05:00–08:00 kitchen slot, capacity managed per vehicle", "Written size grades, cleaning to specification", "Prepaid, then 3-day terms, then weekly", "Species-named final invoice after weighing"],
    b2bCta: "Open a business account",
    b2bCta2: "Sign in",
    guidesEyebrow: "Guides",
    guidesTitle: "Know your fish, store it properly, cost your kitchen.",
    guidesCta: "All guides",
    read: "Read",
    contactEyebrow: "Contact",
    contactTitle: "Get in touch.",
    contactBody: "For business-account questions, supplier partnerships or complaints. Orders are best placed through the catalogue so price, weight and slot are recorded.",
  },
};

export default async function HomePage() {
  const repo = await getRepo();
  const { locale, t } = await getT();
  const c = copy[locale];
  const [settings, categories, products] = await Promise.all([repo.getSettings(), repo.getCategories(), repo.getProducts()]);
  const seafoodCats = new Set(categories.filter((x) => x.is_seafood).map((x) => x.id));
  const todaysCatch = products.filter((p) => p.storage_class === "chilled" && p.available_today && p.is_catch_weight && seafoodCats.has(p.category_id)).slice(0, 5);
  const slides = c.slides.map((s, i) => ({ ...s, image: i === 0 ? settings.hero_image_url : null }));
  const latest = guides.slice(0, 4);

  return (
    <>
      <HeroSlider slides={slides} counter={c.counter} />

      {/* About teaser */}
      <Band>
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="eyebrow">{c.aboutEyebrow}</p>
            <h2 className="mt-3 text-3xl leading-[1.12] text-ocean-950 sm:text-4xl">{c.aboutTitle}</h2>
            <p className="mt-5 max-w-lg text-[15.5px] leading-relaxed text-mute">{c.aboutBody}</p>
            <Link href="/tentang" className="btn-outline mt-7">{c.aboutCta} <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="lg:col-span-6">
            <ImageSlot src={settings.about_image_url} alt={c.aboutTitle} icon="fish" className="aspect-[3/2] rounded-3xl shadow-float">
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6">
                <div className="rounded-xl bg-white/10 px-3 py-2 text-[12px] font-semibold text-white backdrop-blur">Muara Baru · 03:00 WIB</div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur"><ProductIcon name="fish" className="h-6 w-6" /></div>
              </div>
            </ImageSlot>
          </div>
        </div>
        <div className="mt-20">
          <p className="eyebrow mb-8">{c.factsEyebrow}</p>
          <FactStrip facts={c.facts} />
        </div>
      </Band>

      {/* Pillars */}
      <Band tone="light">
        <SplitHeading eyebrow={c.pillarsEyebrow} title={c.pillarsTitle} action={{ href: "/produk", label: t.nav.products }}>{c.pillarsBody}</SplitHeading>
        <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {c.pillars.map((p) => <PillarCard key={p.href} {...p} image={categories.find((x) => `/belanja/kategori/${x.slug}` === p.href)?.image_url} />)}
        </div>
      </Band>

      {/* Today's catch */}
      {todaysCatch.length > 0 && (
        <Band>
          <SplitHeading eyebrow={c.catchEyebrow} title={c.catchTitle} action={{ href: "/belanja/kategori/ikan-segar", label: c.catchCta }}>{c.catchBody}</SplitHeading>
          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {todaysCatch.map((p) => <ProductCard key={p.id} p={p} segment="retail" locale={locale} />)}
          </div>
          <p className="mt-6 text-xs text-mute">{locale === "en" ? "Retail prices shown. Business accounts see wholesale prices after signing in." : "Harga retail. Akun bisnis melihat harga grosir setelah masuk."} · {t.footer.cutoff.replace("{time}", settings.cutoff_time)}</p>
        </Band>
      )}

      {/* B2B band */}
      <Band tone="dark">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="eyebrow">{c.b2bEyebrow}</p>
            <h2 className="mt-3 text-3xl leading-[1.12] sm:text-4xl lg:text-[2.6rem]">{c.b2bTitle}</h2>
            <p className="mt-5 max-w-lg text-[15.5px] leading-relaxed text-white/70">{c.b2bBody}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/restoran#daftar" className="btn-accent">{c.b2bCta} <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/akun" className="btn text-white ring-1 ring-white/30 hover:bg-white/10">{c.b2bCta2}</Link>
            </div>
          </div>
          <ul className="grid gap-3 self-center lg:col-span-6">
            {c.b2bPoints.map((pt) => <li key={pt} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[14.5px]"><Check className="mt-0.5 h-4 w-4 flex-none text-coral-500" />{pt}</li>)}
          </ul>
        </div>
      </Band>

      {/* Guides */}
      <Band tone="light">
        <SplitHeading eyebrow={c.guidesEyebrow} title={c.guidesTitle} action={{ href: "/panduan", label: c.guidesCta }} />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {latest.map((g) => (
            <Link key={g.slug} href={`/panduan/${g.slug}`} className="group card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-float">
              <ImageSlot alt={g[locale].title} icon={g.icon} className="aspect-[3/2]" />
              <div className="p-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-coral-500">{formatDate(g.date, "short", locale)} · {g.tag[locale]}</p>
                <p className="mt-2 line-clamp-3 text-[15.5px] font-semibold leading-snug text-ocean-950">{g[locale].title}</p>
                <p className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-coral-600">{c.read} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></p>
              </div>
            </Link>
          ))}
        </div>
      </Band>

      {/* Contact */}
      <Band>
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow">{c.contactEyebrow}</p>
            <h2 className="mt-3 text-3xl leading-[1.12] text-ocean-950 sm:text-4xl">{c.contactTitle}</h2>
            <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-mute">{c.contactBody}</p>
            <p className="mt-6 text-sm text-mute">{t.shop.heroSub.replace("{min}", rupiah(settings.min_order_retail)).replace("{free}", rupiah(settings.free_delivery_retail))}</p>
          </div>
          <div className="card p-6 lg:col-span-7 lg:p-8"><ContactForm whatsapp={settings.whatsapp_number} storeName={settings.store_name} /></div>
        </div>
      </Band>
    </>
  );
}
