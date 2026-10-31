import Link from "next/link";
import { ArrowRight, ClipboardList, CalendarDays, Fish, Truck, Check } from "lucide-react";
import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import { fmt } from "@/lib/i18n/dict";
import { segmentOf } from "@/lib/pricing";
import { IMAGES } from "@/lib/content/images";
import { HeroSlider } from "@/components/site/HeroSlider";
import { SectionHead, Band, StepsStrip, CategoryTile, DarkCard } from "@/components/site/Sections";
import { ImageSlot } from "@/components/site/Decor";
import { ProductCard } from "@/components/shop/ProductCard";
import { ReorderPanel } from "@/components/shop/ReorderPanel";
import { rupiah } from "@/lib/format";

export const metadata = { title: "Belanja" };

const copy = {
  id: {
    slides: [
      { eyebrow: "Tangkapan hari ini · Muara Baru", title: "Ikan yang benar. Bernama. Bergrade.", sub: "Dilelang sebelum subuh, ditimbang dan disiangi sesuai pesanan, diantar dingin ke dapur Anda besok pagi.", cta: { href: "/belanja/kategori/ikan-segar", label: "Belanja ikan segar" }, cta2: { href: "/belanja/semua", label: "Semua produk" }, icon: "fish" },
      { eyebrow: "Untuk restoran", title: "Pesan pukul 21.00. Di dapur pukul 07.00.", sub: "Harga grosir, slot dapur 05.00–08.00, tempo setelah terbukti, invoice bernama spesies.", cta: { href: "/restoran#daftar", label: "Daftar akun bisnis" }, cta2: { href: "/restoran", label: "Pelajari" }, icon: "shrimp" },
      { eyebrow: "Paket hemat", title: "Isi freezer sekali pesan.", sub: "Udang kupas, fillet, salmon portion dan ayam dalam satu kotak, lebih murah dari membeli satuan.", cta: { href: "/belanja/kategori/paket-hemat", label: "Lihat paket" }, icon: "box" },
    ],
    memberStrip: "Punya restoran? Daftar akun bisnis dan dapatkan harga grosir, slot dapur subuh dan tempo.",
    memberCta: "Daftar sekarang",
    catsEyebrow: "Mulai di sini", catsTitle: "Belanja per kategori", explore: "Lihat",
    findEyebrow: "Cara belanja", findTitle: "Temukan pesanan Anda", findSub: "Mulai dari kebutuhan dapur Anda, bukan dari daftar produk.",
    find: [
      { href: "/belanja/kategori/paket-hemat", eyebrow: "Satu kotak", title: "Paket hemat", sub: "Kotak freezer siap kirim untuk seminggu, di bawah harga satuan.", cta: "Belanja paket", icon: "box", key: "box" },
      { href: "/belanja/kategori/ikan-segar", eyebrow: "Dilelang subuh", title: "Tangkapan hari ini", sub: "Spesies yang kami pilih untuk lelang pukul 03.00, ditimbang sebelum dikirim.", cta: "Lihat tangkapan", icon: "fish", key: "standards" },
      { href: "/restoran", eyebrow: "Akun bisnis", title: "Untuk restoran", sub: "Harga grosir, slot dapur, pesan ulang satu sentuhan, invoice spesies.", cta: "Daftar akun", icon: "shrimp", key: "restaurant" },
    ],
    stepsTitle: "Bagaimana caranya?",
    steps: ["Pilih produk, ukuran dan cara penyiapannya", "Pilih hari dan slot pengiriman", "Kami lelang, timbang dan siapkan subuh", "Diantar dingin ke pintu Anda"],
    gradeEyebrow: "Standar Dipasaria", gradeTitle: "Lebih segar. Bergrade. Bernama.", gradeBody: "Setiap ikan membawa nama ilmiahnya, grade ukuran per ekor, dan opsi penyiapan. Suhu inti ≤4 °C sejak lelang, dicatat di setiap rute. Kami membeli hanya sesuai pesanan: tidak ada ikan yang menginap.", gradeCta: "Belanja ikan segar", gradeCta2: "Lihat standar", gradeTag: "Dari lelang, bukan dari gudang",
    catchTitle: "Tangkapan hari ini", catchSub: "Harga per kg, ditimbang setelah disiapkan.",
    storyEyebrow: "Cerita kami", storyTitle: "Dibangun untuk chef. Dibuat untuk rumah.", storyBody: "Dipasaria dimulai sebagai pedagang prinsipal di lantai lelang Muara Baru. Hari ini kami memasok restoran independen di satu rute dan rumah tangga di sekitarnya, dengan standar yang sama untuk keduanya.", storyCard: "Pedagang prinsipal", storyCardSub: "Kami membeli dan memiliki barang sebelum menjualnya, sehingga kami yang bertanggung jawab atas grade, berat dan suhu.", storyFacts: [["Lelang 03.00", "Muara Baru, dipilih dan difoto per lot."], ["Rantai dingin", "0–4 °C segar, −18 °C beku, dicatat tiap rute."], ["Ayam halal", "RPHU bersertifikat halal dan NKV, dokumen per lot."]], storyCta: "Baca cerita kami", storyCta2: "Belanja",
    specialsEyebrow: "Pilihan minggu ini", specialsTitle: "Paling sering dipesan", specialsSub: "Produk yang dapur kami sendiri pesan ulang setiap minggu.", specialsCta: "Semua produk",
    freezerTitle: "Isi freezer", freezerSub: "Pack beku tanpa risiko basi, harga tetap.",
    minNote: (min: string, free: string) => `Minimum pesanan ${min} · gratis ongkir dari ${free}`,
  },
  en: {
    slides: [
      { eyebrow: "Today's catch · Muara Baru", title: "The right fish. Named. Graded.", sub: "Auctioned before dawn, weighed and cleaned to order, delivered cold to your kitchen tomorrow morning.", cta: { href: "/belanja/kategori/ikan-segar", label: "Shop fresh fish" }, cta2: { href: "/belanja/semua", label: "All products" }, icon: "fish" },
      { eyebrow: "For restaurants", title: "Order at 9 pm. In the kitchen by 7 am.", sub: "Wholesale prices, a 05:00–08:00 kitchen slot, terms once established, species-named invoices.", cta: { href: "/restoran#daftar", label: "Open a business account" }, cta2: { href: "/restoran", label: "Learn more" }, icon: "shrimp" },
      { eyebrow: "Value boxes", title: "Stock the freezer in one order.", sub: "Peeled shrimp, fillets, salmon portions and chicken in one box, for less than buying separately.", cta: { href: "/belanja/kategori/paket-hemat", label: "See boxes" }, icon: "box" },
    ],
    memberStrip: "Run a restaurant? Open a business account for wholesale prices, the dawn kitchen slot and payment terms.",
    memberCta: "Register now",
    catsEyebrow: "Start here", catsTitle: "Shop by category", explore: "Explore",
    findEyebrow: "Ways to shop", findTitle: "Find your next order", findSub: "Start from what your kitchen needs, not from a product list.",
    find: [
      { href: "/belanja/kategori/paket-hemat", eyebrow: "One box", title: "Value boxes", sub: "Freezer-ready boxes for the week, below the price of buying separately.", cta: "Shop boxes", icon: "box", key: "box" },
      { href: "/belanja/kategori/ikan-segar", eyebrow: "Auctioned at dawn", title: "Today's catch", sub: "The species we have chosen for the 3 a.m. auction, weighed before dispatch.", cta: "See the catch", icon: "fish", key: "standards" },
      { href: "/restoran", eyebrow: "Business account", title: "For restaurants", sub: "Wholesale prices, kitchen slot, one-tap reorder, species invoices.", cta: "Register", icon: "shrimp", key: "restaurant" },
    ],
    stepsTitle: "How's it work?",
    steps: ["Choose products, sizes and preparation", "Pick a delivery day and slot", "We auction, weigh and prepare at dawn", "Delivered cold to your door"],
    gradeEyebrow: "The Dipasaria standard", gradeTitle: "Fresher. Graded. Named.", gradeBody: "Every fish carries its scientific name, a size grade per fish and preparation options. Core temperature ≤4 °C from the auction, logged on every route. We buy only to order: no fish is held overnight.", gradeCta: "Shop fresh fish", gradeCta2: "Our standards", gradeTag: "From the auction, not a warehouse",
    catchTitle: "Today's catch", catchSub: "Price per kg, weighed after preparation.",
    storyEyebrow: "Our story", storyTitle: "Built for chefs. Made for home.", storyBody: "Dipasaria began as a principal trader on the Muara Baru auction floor. Today we supply independent restaurants along one route and the households around them, to the same standard for both.", storyCard: "Principal trader", storyCardSub: "We buy and own the goods before selling them, so we answer for grade, weight and temperature.", storyFacts: [["3 a.m. auction", "Muara Baru, selected and photographed per lot."], ["Cold chain", "0–4 °C fresh, −18 °C frozen, logged on every route."], ["Halal chicken", "Halal-certified, NKV-registered slaughterhouses, documents per lot."]], storyCta: "Read our story", storyCta2: "Shop",
    specialsEyebrow: "This week's picks", specialsTitle: "Most reordered", specialsSub: "The products our own kitchens reorder every week.", specialsCta: "All products",
    freezerTitle: "Stock the freezer", freezerSub: "Frozen packs, no spoilage risk, fixed prices.",
    minNote: (min: string, free: string) => `Minimum order ${min} · free delivery from ${free}`,
  },
};

export default async function BelanjaPage() {
  const repo = await getRepo();
  const [account, { locale, t }] = await Promise.all([getCurrentAccount(), getT()]);
  const c = copy[locale];
  const segment = segmentOf(account);
  const [settings, categories, products, orders] = await Promise.all([repo.getSettings(), repo.getCategories(), repo.getProducts(), account ? repo.getOrdersForAccount(account.id, 3) : Promise.resolve([])]);
  const seafood = new Set(categories.filter((x) => x.is_seafood).map((x) => x.id));
  const catchToday = products.filter((p) => p.storage_class === "chilled" && p.is_catch_weight && seafood.has(p.category_id)).slice(0, 5);
  const featured = products.filter((p) => p.is_featured && p.available_today).slice(0, 8);
  const freezer = products.filter((p) => p.storage_class === "frozen" && p.available_today).slice(0, 5);
  const slides = c.slides.map((s, i) => ({ ...s, image: IMAGES.hero[i] ?? (i === 0 ? settings.hero_image_url : null) }));
  const minOrder = segment === "business" ? settings.min_order_business : settings.min_order_retail;
  const free = segment === "business" ? settings.free_delivery_business : settings.free_delivery_retail;
  const grid = "grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-5";
  const stepIcons = [<ClipboardList key="a" className="h-5 w-5" />, <CalendarDays key="b" className="h-5 w-5" />, <Fish key="c" className="h-5 w-5" />, <Truck key="d" className="h-5 w-5" />];

  return (
    <>
      <HeroSlider slides={slides} />

      {account && orders.length > 0 ? (
        <div className="container-x -mt-8 relative z-10"><ReorderPanel orders={orders} accountName={account.business_name} /></div>
      ) : (
        <div className="bg-coral-600 text-ocean-950">
          <div className="container-x flex flex-wrap items-center justify-center gap-x-4 gap-y-1 py-2.5 text-center font-sans text-[12px] font-bold uppercase tracking-[0.12em]">
            <span>{c.memberStrip}</span><Link href="/restoran#daftar" className="border border-ocean-950 px-3 py-1 hover:bg-ocean-950 hover:text-coral-500">{c.memberCta}</Link>
          </div>
        </div>
      )}

      {/* Shop by category */}
      <Band tone="cream">
        <SectionHead eyebrow={c.catsEyebrow} title={c.catsTitle} action={{ href: "/belanja/semua", label: t.shop.allProducts }} />
        <div className="-mx-5 mt-8 flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 lg:grid-cols-4">
          {categories.map((cat) => <div key={cat.id} className="w-[72vw] flex-none sm:w-auto"><CategoryTile href={`/belanja/kategori/${cat.slug}`} title={pick(locale, cat.name, cat.name_en)} image={IMAGES.category[cat.slug] ?? cat.image_url} icon={cat.icon} cta={c.explore} /></div>)}
        </div>
      </Band>

      {/* Find your next order */}
      <Band tone="parchment">
        <SectionHead eyebrow={c.findEyebrow} title={c.findTitle} sub={c.findSub} />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {c.find.map((f) => <DarkCard key={f.href} href={f.href} eyebrow={f.eyebrow} title={f.title} sub={f.sub} cta={f.cta} icon={f.icon} image={IMAGES[f.key as "box" | "standards" | "restaurant"]} />)}
        </div>
      </Band>

      <StepsStrip title={c.stepsTitle} steps={c.steps.map((s, i) => ({ icon: stepIcons[i], text: s }))} />

      {/* Standards split + today's catch */}
      <Band>
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <p className="eyebrow">{c.gradeEyebrow}</p>
            <h2 className="mt-2 text-[2.6rem] sm:text-[3.4rem] lg:text-[4rem]">{c.gradeTitle}</h2>
            <p className="mt-5 max-w-md font-sans text-[14.5px] leading-relaxed text-mute">{c.gradeBody}</p>
            <p className="mt-4 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-coral-600">— {c.gradeTag}</p>
            <div className="mt-6 flex flex-wrap gap-3"><Link href="/belanja/kategori/ikan-segar" className="btn-accent">{c.gradeCta}</Link><Link href="/tentang#standar" className="btn-outline">{c.gradeCta2}</Link></div>
          </div>
          <div className="lg:col-span-7">
            <ImageSlot src={IMAGES.standards ?? settings.about_image_url} alt={c.gradeTitle} icon="fish" className="aspect-[4/3] bg-ocean-950">
              <div className="absolute bottom-5 right-5 max-w-[16rem] bg-coral-500 p-4 text-ocean-950"><p className="font-display text-[18px] font-bold uppercase leading-none">{c.catchTitle}</p><p className="mt-1 font-sans text-[12px]">{c.catchSub}</p></div>
            </ImageSlot>
          </div>
        </div>
        <div className="mt-10">
          <div className={grid}>{catchToday.map((p) => <ProductCard key={p.id} p={p} segment={segment} discountPct={account?.discount_pct} locale={locale} />)}</div>
          <p className="mt-4 font-sans text-[12px] text-mute">{c.minNote(rupiah(minOrder), rupiah(free))}</p>
        </div>
      </Band>

      {/* Story (cream) */}
      <Band tone="parchment">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="relative lg:col-span-6">
            <ImageSlot src={IMAGES.story} alt={c.storyTitle} icon="shrimp" className="aspect-[4/3] bg-ocean-950" />
            <div className="absolute bottom-6 right-6 max-w-[15rem] bg-coral-500 p-5 text-ocean-950 shadow-float"><p className="font-display text-[20px] font-bold uppercase leading-none">{c.storyCard}</p><p className="mt-2 font-sans text-[12px] leading-snug">{c.storyCardSub}</p></div>
          </div>
          <div className="lg:col-span-6 lg:pl-6">
            <p className="eyebrow">{c.storyEyebrow}</p>
            <h2 className="mt-2 text-[2.6rem] sm:text-[3.4rem] lg:text-[4rem]">{c.storyTitle}</h2>
            <p className="mt-5 max-w-lg font-sans text-[14.5px] leading-relaxed text-mute">{c.storyBody}</p>
            <ul className="mt-6 space-y-3">
              {c.storyFacts.map(([k, v]) => <li key={k} className="flex gap-3 border-l-2 border-coral-500 pl-4"><div><p className="font-sans text-[11px] font-bold uppercase tracking-[0.16em]">{k}</p><p className="font-sans text-[13px] text-mute">{v}</p></div></li>)}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3"><Link href="/tentang" className="btn-primary">{c.storyCta}</Link><Link href="/belanja/semua" className="btn-outline">{c.storyCta2}</Link></div>
          </div>
        </div>
      </Band>

      {/* Specials */}
      <Band tone="cream">
        <SectionHead eyebrow={c.specialsEyebrow} title={c.specialsTitle} sub={c.specialsSub} action={{ href: "/belanja/semua", label: c.specialsCta }} />
        <div className={`mt-8 ${grid}`}>{featured.slice(0, 5).map((p) => <ProductCard key={p.id} p={p} segment={segment} discountPct={account?.discount_pct} locale={locale} />)}</div>
        <div className="mt-14 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">{t.shop.fillFreezer}</p><h2 className="mt-2 text-[2rem] sm:text-[2.6rem]">{c.freezerTitle}</h2><p className="mt-2 font-sans text-[13.5px] text-mute">{c.freezerSub}</p></div><Link href="/belanja/kategori/seafood-beku" className="btn-link">{t.common.viewAll} <ArrowRight className="h-4 w-4" /></Link></div>
        <div className={`mt-6 ${grid}`}>{freezer.map((p) => <ProductCard key={p.id} p={p} segment={segment} discountPct={account?.discount_pct} locale={locale} />)}</div>
      </Band>

      {/* Big image band */}
      <ImageSlot src={IMAGES.kitchen} alt="" icon="chicken" className="h-[42vh] min-h-[280px]">
        <div className="absolute inset-0 flex items-end"><div className="container-x pb-10 text-white"><p className="eyebrow text-coral-500">{t.nav.forRestaurants}</p><p className="mt-2 max-w-xl text-[2rem] font-bold uppercase leading-none sm:text-[2.8rem]" style={{ fontFamily: "var(--font-display)" }}>{locale === "en" ? "Restaurant quality. Delivered to your door." : "Kualitas restoran. Diantar ke pintu Anda."}</p><div className="mt-4 flex gap-2 font-sans text-[12px] text-white/80">{[t.footer.halal, t.footer.coldChain].map((x) => <span key={x} className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-coral-500" />{x}</span>)}</div></div></div>
      </ImageSlot>
      <p className="sr-only">{fmt(t.shop.heroSub, { min: rupiah(minOrder), free: rupiah(free) })}</p>
    </>
  );
}
