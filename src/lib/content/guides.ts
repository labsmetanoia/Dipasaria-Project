// Bilingual kitchen guides ("Panduan"). Editorial content that builds trust and search traffic,
// written from the business plan's sourcing and handling standards.

export interface Guide {
  slug: string;
  date: string;
  icon: string;
  id: { title: string; excerpt: string; body: string[] };
  en: { title: string; excerpt: string; body: string[] };
  tag: { id: string; en: string };
}

export const guides: Guide[] = [
  {
    slug: "cara-memilih-kakap-merah-asli",
    date: "2026-10-28",
    icon: "fish",
    tag: { id: "Mengenal ikan", en: "Know your fish" },
    id: {
      title: "Cara membedakan kakap merah asli dari ikan yang hanya mirip",
      excerpt: "Di pasar, tiga jenis ikan yang berbeda dijual dengan nama “kakap merah”. Hanya satu yang benar-benar Lutjanus malabaricus.",
      body: [
        "Nama dagang “kakap merah” digunakan secara longgar di pasar Jakarta. Yang paling sering tertukar adalah Red Bass (Lutjanus bohar), ikan karang yang di beberapa perairan berisiko mengandung racun ciguatera, serta bambangan (Lutjanus gibbus) yang lebih kecil dan dagingnya lebih lembek. Kakap merah yang kami jual adalah Malabar snapper, Lutjanus malabaricus.",
        "Ciri-cirinya: tubuh memanjang dengan punggung merah muda cerah yang memudar ke arah perut keperakan, sirip ekor merah tanpa tepi hitam, dan mata berukuran sedang. Red Bass berwarna lebih gelap, sirip ekornya bertepi hitam, dan kepalanya lebih tumpul.",
        "Di lelang pukul tiga pagi, kami memeriksa empat hal pada setiap lot: mata cembung dan jernih, insang merah segar tanpa lendir, daging kenyal yang kembali saat ditekan, serta aroma laut, bukan bau amonia. Suhu inti diukur dengan termometer tusuk; lot dengan suhu di atas 4 °C kami tolak.",
        "Pada tagihan Anda, setiap jenis ikan dicantumkan dengan nama ilmiahnya. Itu bukan sekadar gaya, melainkan cara Anda memastikan kami menjual persis apa yang kami janjikan.",
      ],
    },
    en: {
      title: "How to tell real red snapper from the fish that only looks like it",
      excerpt: "Three different species are sold as “kakap merah” at the market. Only one is actually Lutjanus malabaricus.",
      body: [
        "The trade name “kakap merah” is used loosely in Jakarta. The usual stand-ins are Red Bass (Lutjanus bohar), a reef fish that carries ciguatera risk in some waters, and Bambangan (Lutjanus gibbus), which is smaller with softer flesh. The red snapper we sell is Malabar Snapper, Lutjanus malabaricus.",
        "Look for an elongated body with a bright pink back fading to a silvery belly, a red tail without a black edge, and medium-sized eyes. Red Bass is darker, has a black-edged tail and a blunter head.",
        "At the 3 a.m. auction we check four things per lot: convex, clear eyes; fresh red gills without slime; flesh that springs back when pressed; and a smell of the sea, not ammonia. Core temperature is probed; above 4 °C the lot is rejected.",
        "Your invoice names the species scientifically. That isn't decoration: it is how you hold us to what we sell.",
      ],
    },
  },
  {
    slug: "ukuran-udang-vaname",
    date: "2026-10-26",
    icon: "shrimp",
    tag: { id: "Mengenal produk", en: "Know your product" },
    id: {
      title: "Ukuran 40–50 atau 60–70? Cara membaca ukuran udang vaname",
      excerpt: "Angka pada udang menunjukkan jumlah ekor per kilogram. Makin kecil angkanya, makin besar udangnya.",
      body: [
        "Udang vaname dijual berdasarkan ukuran, yaitu jumlah ekor dalam satu kilogram. Ukuran 40–50 berarti 40 hingga 50 ekor per kg, atau sekitar 20–25 gram per ekor. Ukuran 60–70 lebih kecil, sekitar 14–17 gram per ekor, dan lebih murah per kilogramnya.",
        "Untuk tumisan dan udang goreng tepung di rumah, ukuran 60–70 lebih ekonomis dan cepat matang. Restoran yang menyajikan udang bakar atau udang saus Padang biasanya memilih ukuran 40–50 agar tampilannya lebih penuh di piring.",
        "Waspadai udang yang terlalu berat untuk ukurannya: sebagian pedagang merendam udang dalam larutan fosfat agar menyerap air. Udang kami tidak direndam, sehingga berat yang Anda bayar adalah berat udang itu sendiri, dan dagingnya tidak berair saat dimasak.",
        "Udang dengan pilihan dikupas ditimbang sebelum dikupas, karena kulit dan kepala mencapai 35–40% dari beratnya. Harga per kg yang Anda bayar tetap mengacu pada udang utuh, ditambah biaya kupas per kg.",
      ],
    },
    en: {
      title: "Size 40–50 or 60–70? Reading vannamei shrimp sizes",
      excerpt: "The number on shrimp is the count per kilogram. The smaller the number, the bigger the shrimp.",
      body: [
        "Vannamei shrimp are sold by “size”: the number of pieces in one kilogram. Size 40–50 means 40 to 50 shrimp per kg, roughly 20–25 grams each. Size 60–70 is smaller, 14–17 grams, and cheaper per kilogram.",
        "For home stir-fries and battered shrimp, size 60–70 is more economical and cooks fast. Restaurants serving grilled shrimp or Padang sauce usually use 40–50 so the plate looks full.",
        "Beware of shrimp that feel too heavy for their size: some traders soak shrimp in phosphate solution to absorb water. Ours are never soaked; the weight is shrimp weight, and the flesh doesn't weep when cooked.",
        "Our peeling option is weighed before peeling, because shell and head are 35–40% of the weight. The price per kg stays the whole-shrimp price; peeling is added per kg.",
      ],
    },
  },
  {
    slug: "menyimpan-ikan-segar-di-rumah",
    date: "2026-10-22",
    icon: "snow",
    tag: { id: "Dapur rumah", en: "Home kitchen" },
    id: {
      title: "Menyimpan ikan segar di rumah tanpa bau amis dan tanpa merusak teksturnya",
      excerpt: "Ikan yang tiba pada suhu 0–4 °C masih layak dimasak dalam 24 jam, atau dapat dibekukan dengan benar hingga 2–3 bulan.",
      body: [
        "Begitu kotak tiba, pindahkan ikan ke bagian kulkas yang paling dingin, biasanya rak bawah bagian belakang, dalam wadah tertutup berisi es gel atau es batu dalam kantong. Suhu idealnya 0–4 °C, sedangkan kulkas rumah rata-rata bersuhu 5–7 °C, sehingga es tambahan sangat membantu.",
        "Jika tidak dimasak hari itu, segera bekukan; jangan menunggu hingga besok. Keringkan permukaan ikan dengan tisu, bungkus rapat dengan plastik wrap hingga tidak ada udara, lalu masukkan ke kantong ziplock. Penyebab freezer burn adalah udara, bukan suhu dinginnya.",
        "Cairkan semalaman di rak bawah kulkas, bukan pada suhu ruang dan bukan dengan air panas. Pencairan yang lambat menjaga tekstur dan mencegah bakteri berkembang di permukaan selagi bagian dalamnya masih beku.",
        "Ikan yang sudah kami siangi atau fillet lebih mudah disimpan, karena isi perut, sumber bau yang paling cepat muncul, sudah dibuang di meja pengolahan kami.",
      ],
    },
    en: {
      title: "Storing fresh fish at home without smell or loss of texture",
      excerpt: "Fish that arrives at 0–4 °C is good to cook for another 24 hours, or to freeze properly for 2–3 months.",
      body: [
        "As soon as the box arrives, move the fish to the coldest part of the fridge, usually the bottom shelf at the back, in a sealed container with gel ice or bagged ice. Target 0–4 °C; home fridges average 5–7 °C, so the extra ice matters.",
        "If you won't cook it today, freeze it now rather than tomorrow. Pat the surface dry, wrap tightly in cling film until no air remains, then bag it. Air causes freezer burn, not the cold.",
        "Thaw overnight in the fridge, never at room temperature and never with hot water. Slow thawing keeps the texture and stops bacteria growing on the surface while the centre is still frozen.",
        "Fish we have gutted or filleted keeps better because the belly cavity, the fastest source of smell, is already removed at our cleaning table.",
      ],
    },
  },
  {
    slug: "ayam-halal-rphu-nkv",
    date: "2026-10-18",
    icon: "chicken",
    tag: { id: "Standar", en: "Standards" },
    id: {
      title: "Apa arti RPHU bersertifikat halal dan NKV, dan mengapa restoran perlu menanyakannya",
      excerpt: "Dua dokumen yang membedakan ayam yang dapat Anda pertanggungjawabkan dari ayam yang sekadar murah.",
      body: [
        "RPHU adalah Rumah Potong Hewan Unggas. Sertifikat halal dari BPJPH memastikan tata cara penyembelihan sesuai syariat dan rantai penanganannya terjaga, sedangkan NKV (Nomor Kontrol Veteriner) membuktikan bahwa unit usaha tersebut memenuhi standar higiene dan sanitasi dari Kementerian Pertanian.",
        "Kewajiban sertifikasi halal bagi usaha mikro dan kecil memang ditunda hingga 17 Oktober 2028, tetapi pelanggan Anda tidak akan menunggu. Restoran yang ditanya tamunya “ayamnya halal?” perlu dapat menjawab dengan dokumen, bukan sekadar keyakinan.",
        "Kami hanya membeli ayam beku dan ayam potong segar dari RPHU yang memiliki kedua dokumen tersebut, menyimpan salinannya untuk setiap pemasok, dan dapat menunjukkannya per lot bila akun bisnis Anda memintanya.",
        "Saat pengiriman, ayam dikemas dalam kantong tertutup dan ditempatkan terpisah dari ikan, tidak pernah dalam es yang sama. Hal ini penting untuk keamanan pangan, sekaligus agar dapur Anda bebas dari bau yang tercampur.",
      ],
    },
    en: {
      title: "What halal-certified RPHU and NKV mean, and why restaurants should ask",
      excerpt: "Two documents that separate chicken you can vouch for from chicken that is merely cheap.",
      body: [
        "RPHU is a poultry slaughterhouse. A BPJPH halal certificate confirms slaughter according to Islamic law with an unbroken handling chain; NKV, the Veterinary Control Number, proves the unit meets the Ministry of Agriculture's hygiene and sanitation standards.",
        "Mandatory halal certification for micro and small businesses was postponed to 17 October 2028, but your customers aren't waiting. A restaurant asked “is the chicken halal?” needs to answer with documents, not conviction.",
        "We buy frozen and fresh cut chicken only from slaughterhouses holding both documents, keep copies per supplier, and can show them per lot if your business account asks.",
        "In delivery, chicken travels in sealed liners placed apart from fish, never in the same ice. That is food safety and, just as much, the smell in your kitchen.",
      ],
    },
  },
  {
    slug: "menghitung-biaya-ikan-restoran",
    date: "2026-10-14",
    icon: "fillet",
    tag: { id: "Untuk restoran", en: "For restaurants" },
    id: {
      title: "Harga per kg bukan harga sebenarnya: menghitung biaya ikan untuk restoran",
      excerpt: "Ikan yang 5% lebih murah di pasar bisa 10% lebih mahal di piring setelah barang tidak layak, susut dan jam kerja ikut dihitung.",
      body: [
        "Pemilik restoran biasanya membandingkan harga per kilogram. Padahal, yang menentukan margin menu adalah biaya per porsi yang tersaji, dan di antara keduanya ada tiga faktor pengurang: ikan yang ditolak saat tiba, susut saat dibersihkan, dan waktu kerja staf.",
        "Barang tidak layak di pasar tradisional berkisar 5–8% bagi pembeli yang tidak memeriksa setiap ekor. Ukuran yang tidak konsisten menambah susut: kakap 700 g dan 1,4 kg yang sama-sama dijual sebagai “kakap 1 kg” menghasilkan fillet dengan jumlah yang berbeda.",
        "Kemudian soal waktu: perjalanan ke Muara Baru pukul tiga pagi menyita 2–3 jam seorang kepala dapur atau pemilik, setiap hari. Dengan standar upah di kota, nilainya Rp80–120 ribu per hari, belum termasuk bensin dan parkir.",
        "Cara kami: ukuran dicantumkan tertulis, produk ditimbang setelah disiapkan, tagihan mencantumkan jenis ikan, dan pesanan diantar pukul 05.00–08.00. Harga per kg kami memang 5–10% di atas pasar, tetapi biaya per porsinya biasanya lebih rendah. Minta sampel dan hitung sendiri berdasarkan menu Anda.",
      ],
    },
    en: {
      title: "Price per kg isn't the real price: costing fish for a restaurant",
      excerpt: "Fish that is 5% cheaper at the market can be 10% dearer on the plate once rejects, trim and labour are counted.",
      body: [
        "Restaurant owners usually compare price per kilogram. What sets menu margin is cost per plated portion, and between the two sit three deductions: fish rejected on arrival, loss during cleaning, and staff time.",
        "Rejects at traditional markets run 5–8% for buyers who don't inspect every fish. Inconsistent size grades add trim: a 700 g and a 1.4 kg snapper both sold as “1 kg snapper” give different fillet yields.",
        "Then time: the 3 a.m. trip to Muara Baru takes a head chef or owner 2–3 hours, every day. At city wages that is Rp 80–120 thousand a day before fuel and parking.",
        "Our way: written size grades, weighed after preparation, species-named invoices, delivered 05:00–08:00. Our per-kg bill is indeed 5–10% above the market; cost per portion is usually lower. Ask for a sample and run the numbers with your own menu.",
      ],
    },
  },
  {
    slug: "isi-freezer-seminggu",
    date: "2026-10-10",
    icon: "box",
    tag: { id: "Dapur rumah", en: "Home kitchen" },
    id: {
      title: "Mengisi freezer untuk seminggu: lima protein, lima malam, satu pesanan",
      excerpt: "Udang kupas, fillet dori, dada ayam, nugget dan sayap ayam: rencana makan malam yang tidak bergantung pada belanja harian.",
      body: [
        "Keluarga yang sibuk bekerja jarang kekurangan niat untuk memasak; yang sering kurang adalah bahan yang siap diolah pukul enam sore. Freezer yang diisi dengan tepat menutup celah itu.",
        "Senin: udang kupas ditumis dengan bawang putih dan kecap, hanya 12 menit dari freezer ke meja makan bila sudah dicairkan di kulkas sejak pagi. Selasa: fillet dori goreng tepung atau panggang dengan perasan jeruk nipis. Rabu: fillet dada ayam untuk ayam katsu atau ayam geprek. Kamis: sosis dan telur untuk nasi goreng kilat. Jumat: sayap ayam panggang kecap.",
        "Aturannya hanya satu: cairkan di rak bawah kulkas, bukan di meja dapur. Keluarkan bahan untuk esok hari sambil Anda merapikan dapur malam ini.",
        "Kotak Freezer Keluarga kami berisi empat dari lima bahan tersebut dengan harga lebih hemat daripada membeli satuan, dan dikirim dalam kantong berinsulasi terpisah agar tetap beku sampai ke pintu rumah Anda.",
      ],
    },
    en: {
      title: "Stocking the freezer for a week: five proteins, five dinners, one order",
      excerpt: "Peeled shrimp, dori fillet, chicken breast, nuggets and wings: a dinner plan that doesn't depend on daily shopping.",
      body: [
        "Working families rarely lack the will to cook; what's missing is an ingredient ready at six in the evening. A properly stocked freezer closes that gap.",
        "Monday: peeled and deveined shrimp stir-fried with garlic and sweet soy, 12 minutes from freezer to table if thawed in the fridge since morning. Tuesday: dori fillet, battered or baked with lime. Wednesday: breast fillet for katsu or geprek. Thursday: sausages and eggs for a quick fried rice. Friday: soy-glazed roasted wings.",
        "One rule: thaw in the fridge, not on the counter. Take out tomorrow's ingredient while you tidy the kitchen tonight.",
        "Our Family Freezer Box holds four of those five ingredients for less than buying them separately, and arrives in a separate insulated bag so it stays frozen to your door.",
      ],
    },
  },
];

export function getGuide(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}
