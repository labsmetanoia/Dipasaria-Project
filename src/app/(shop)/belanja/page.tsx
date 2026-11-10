import Link from "next/link";
import { ArrowRight, ClipboardList, CalendarDays, Fish, Truck, Check, Snowflake, BadgeCheck, ShieldCheck } from "lucide-react";
import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n";
import { fmt } from "@/lib/i18n/dict";
import { segmentOf } from "@/lib/pricing";
import { IMAGES } from "@/lib/content/images";
import { HeroSlider } from "@/components/site/HeroSlider";
import { SectionHead, Band, StepsStrip, CategoryTile, DarkCard } from "@/components/site/Sections";
import { ImageSlot, Sisik } from "@/components/site/Decor";
import { ProductCard } from "@/components/shop/ProductCard";
import { ReorderPanel } from "@/components/shop/ReorderPanel";
import { rupiah } from "@/lib/format";

export const metadata = { title: "Belanja" };

const copy = {
  id: {
    slides: [
      { eyebrow: "Tangkapan hari ini · Muara Baru", title: "Ikan pilihan. Jelas jenisnya. Tepat ukurannya.", sub: "Dipilih di lelang sebelum subuh, disiangi dan ditimbang sesuai pesanan, lalu diantar dingin ke dapur Anda besok pagi.", cta: { href: "/belanja/kategori/ikan-segar", label: "Belanja ikan segar" }, cta2: { href: "/belanja/semua", label: "Semua produk" }, icon: "fish" },
      { eyebrow: "Untuk restoran", title: "Pesan malam ini. Tiba sebelum pukul 08.00.", sub: "Harga grosir, pengiriman dapur pukul 05.00–08.00, pembayaran tempo bagi pelanggan tetap, dan tagihan yang mencantumkan nama setiap jenis ikan.", cta: { href: "/restoran#daftar", label: "Daftar akun bisnis" }, cta2: { href: "/restoran", label: "Selengkapnya" }, icon: "shrimp" },
      { eyebrow: "Paket hemat", title: "Isi freezer dalam sekali pesan.", sub: "Udang kupas, fillet ikan, potongan salmon, dan ayam dalam satu paket, lebih hemat daripada membeli satuan.", cta: { href: "/belanja/kategori/paket-hemat", label: "Lihat paket" }, icon: "box" },
    ],
    memberStrip: "Punya restoran? Buka akun bisnis untuk harga grosir, pengiriman subuh, dan pembayaran tempo.",
    memberCta: "Daftar sekarang",
    catsEyebrow: "Mulai dari sini", catsTitle: "Belanja per kategori", explore: "Lihat",
    findEyebrow: "Pilihan belanja", findTitle: "Tiga cara mengisi dapur Anda", findSub: "Mulailah dari kebutuhan dapur Anda, bukan dari daftar produk.",
    find: [
      { href: "/belanja/kategori/paket-hemat", eyebrow: "Satu kotak", title: "Paket hemat", sub: "Kotak beku siap kirim untuk kebutuhan seminggu, lebih hemat daripada membeli satuan.", cta: "Lihat paket", icon: "box", key: "box" },
      { href: "/belanja/kategori/ikan-segar", eyebrow: "Dari lelang subuh", title: "Tangkapan hari ini", sub: "Jenis ikan yang kami pilih di lelang pukul 03.00 dan ditimbang sebelum dikirim.", cta: "Lihat tangkapan", icon: "fish", key: "standards" },
      { href: "/restoran", eyebrow: "Akun bisnis", title: "Untuk restoran", sub: "Harga grosir, jadwal pengiriman dapur, pesan lagi dengan satu sentuhan, dan tagihan terperinci.", cta: "Daftar akun bisnis", icon: "shrimp", key: "restaurant" },
    ],
    stepsTitle: "Cara kerjanya",
    steps: ["Pilih produk, ukuran, dan cara penyiapan", "Tentukan hari dan jam pengiriman", "Kami pilih, siapkan, dan timbang saat subuh", "Diantar dingin sampai ke pintu Anda"],
    gradeEyebrow: "Standar Dipasaria", gradeTitle: "Segar dari lelang. Jelas jenisnya. Tepat ukurannya.", gradeBody: "Setiap ikan dilengkapi nama ilmiah, ukuran per ekor, dan pilihan cara penyiapan. Suhu inti dijaga ≤4 °C sejak lelang dan dicatat di setiap rute. Kami hanya membeli sesuai pesanan, sehingga tidak ada ikan segar yang menginap.", gradeCta: "Belanja ikan segar", gradeCta2: "Lihat standar kami", gradeTag: "Langsung dari lelang, bukan dari gudang",
    catchTitle: "Tangkapan hari ini", catchSub: "Harga per kg, ditimbang setelah disiapkan.",
    storyEyebrow: "Cerita kami", storyTitle: "Standar dapur profesional, untuk dapur rumah Anda.", storyBody: "Dipasaria berawal sebagai pedagang prinsipal di lantai lelang Muara Baru. Kini kami memasok restoran independen di sepanjang satu rute dan rumah tangga di sekitarnya, dengan standar yang sama untuk keduanya.", storyCard: "Pedagang prinsipal", storyCardSub: "Kami membeli dan memiliki barang sebelum menjualnya, sehingga kami bertanggung jawab penuh atas ukuran, berat, dan suhunya.", storyFacts: [["Lelang pukul 03.00", "Di Muara Baru, dipilih dan difoto per lot."], ["Rantai dingin", "0–4 °C untuk produk segar, −18 °C untuk produk beku, dicatat di setiap rute."], ["Ayam halal", "Dari RPHU bersertifikat halal dan NKV, dengan dokumen per lot."]], storyCta: "Baca cerita kami", storyCta2: "Belanja",
    specialsEyebrow: "Pilihan minggu ini", specialsTitle: "Paling sering dipesan", specialsSub: "Produk yang dipesan ulang oleh dapur langganan kami setiap minggu.", specialsCta: "Semua produk",
    freezerTitle: "Stok seminggu, siap di freezer", freezerSub: "Produk beku yang tahan lama, dengan harga tetap.",
    minNote: (min: string, free: string) => `Minimal pesanan ${min} · gratis ongkos kirim mulai ${free}`,
  },
  en: {
    slides: [
      { eyebrow: "Today's catch · Muara Baru", title: "The right fish. Named. Graded.", sub: "Auctioned before dawn, weighed and cleaned to order, delivered cold to your kitchen tomorrow morning.", cta: { href: "/belanja/kategori/ikan-segar", label: "Shop fresh fish" }, cta2: { href: "/belanja/semua", label: "All products" }, icon: "fish" },
      { eyebrow: "For restaurants", title: "Order tonight. In your kitchen by 8 am.", sub: "Wholesale prices, a 05:00–08:00 kitchen slot, terms once established, species-named invoices.", cta: { href: "/restoran#daftar", label: "Open a business account" }, cta2: { href: "/restoran", label: "Learn more" }, icon: "shrimp" },
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
    stepsTitle: "How it works",
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
  const en = locale === "en";
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
        <div className="relative overflow-hidden bg-coral-600 text-ocean-950">
          <Sisik ink opacity={0.08} />
          <div className="container-x relative flex flex-wrap items-center justify-center gap-x-4 gap-y-1 py-2.5 text-center font-sans text-[12px] font-bold uppercase tracking-[0.12em]">
            <span>{c.memberStrip}</span><Link href="/restoran#daftar" className="border border-ocean-950 px-3 py-1 hover:bg-ocean-950 hover:text-coral-500">{c.memberCta}</Link>
          </div>
        </div>
      )}

      {/* Trust bar */}
      <div className="border-b border-line bg-white">
        <div className="container-x grid grid-cols-2 gap-y-4 py-5 md:grid-cols-4">
          {[[Fish, en ? "Auctioned at Muara Baru, 3 a.m." : "Dari lelang Muara Baru, pukul 03.00"], [Snowflake, en ? "Cold chain 0–4 °C to your door" : "Rantai dingin 0–4 °C sampai ke pintu"], [BadgeCheck, en ? "Halal-certified chicken, per lot" : "Ayam halal, dokumen per lot"], [ShieldCheck, en ? "Replace or refund within 2 hours" : "Ganti atau uang kembali dalam 2 jam"]].map(([I, l]) => { const Icon = I as typeof Fish; return <div key={l as string} className="flex items-center gap-3"><span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-ocean-950 text-coral-500"><Icon className="h-4 w-4" /></span><span className="font-sans text-[12px] font-bold uppercase leading-tight tracking-[0.1em]">{l as string}</span></div>; })}
        </div>
      </div>

      {/* Shop by category */}
      <Band tone="cream">
        <SectionHead eyebrow={c.catsEyebrow} title={c.catsTitle} action={{ href: "/belanja/semua", label: t.shop.allProducts }} />
        <div className="-mx-5 mt-8 flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0 lg:grid-cols-4">
          {categories.map((cat) => <div key={cat.id} className="w-[72vw] flex-none sm:w-auto"><CategoryTile href={`/belanja/kategori/${cat.slug}`} title={pick(locale, cat.name, cat.name_en)} image={IMAGES.category[cat.slug] ?? cat.image_url} icon={cat.icon} cta={c.explore} count={products.filter((p) => p.category_id === cat.id).length} countLabel={en ? "products" : "produk"} /></div>)}
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
            <p className="mt-4 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-gold-ink">— {c.gradeTag}</p>
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
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{featured.slice(0, 8).map((p) => <ProductCard key={p.id} p={p} segment={segment} discountPct={account?.discount_pct} locale={locale} size="lg" />)}</div>
        <div className="mt-14 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">{t.shop.fillFreezer}</p><h2 className="mt-2 text-[2rem] sm:text-[2.6rem]">{c.freezerTitle}</h2><p className="mt-2 font-sans text-[13.5px] text-mute">{c.freezerSub}</p></div><Link href="/belanja/kategori/seafood-beku" className="btn-link">{t.common.viewAll} <ArrowRight className="h-4 w-4" /></Link></div>
        <div className={`mt-6 ${grid}`}>{freezer.map((p) => <ProductCard key={p.id} p={p} segment={segment} discountPct={account?.discount_pct} locale={locale} />)}</div>
      </Band>

      {/* Big image band */}
      <ImageSlot src={IMAGES.kitchen} alt="" icon="chicken" className="h-[42vh] min-h-[280px]">
        <div className="absolute inset-0 flex items-end"><div className="container-x pb-10 text-white"><p className="eyebrow text-coral-500">{t.nav.forRestaurants}</p><p className="mt-2 max-w-xl text-[2rem] font-bold uppercase leading-none sm:text-[2.8rem]" style={{ fontFamily: "var(--font-display)" }}>{locale === "en" ? "The chefs' fish, now for your table." : "Ikan pilihan para koki, kini untuk meja makan Anda."}</p><div className="mt-4 flex gap-2 font-sans text-[12px] text-white/80">{[t.footer.halal, t.footer.coldChain].map((x) => <span key={x} className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-coral-500" />{x}</span>)}</div></div></div>
      </ImageSlot>
      <p className="sr-only">{fmt(t.shop.heroSub, { min: rupiah(minOrder), free: rupiah(free) })}</p>
    </>
  );
}
