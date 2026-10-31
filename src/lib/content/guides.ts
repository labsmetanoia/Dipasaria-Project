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
      excerpt: "Di pasar, tiga spesies berbeda dijual dengan nama “kakap merah”. Hanya satu yang benar-benar Lutjanus malabaricus.",
      body: [
        "Nama dagang “kakap merah” dipakai longgar di pasar Jakarta. Yang paling sering tertukar adalah Red Bass (Lutjanus bohar), ikan karang yang di beberapa perairan membawa risiko ciguatera, dan Bambangan (Lutjanus gibbus) yang lebih kecil dan dagingnya lebih lembek. Kakap merah yang kami jual adalah Malabar Snapper, Lutjanus malabaricus.",
        "Cirinya: tubuh memanjang dengan punggung merah muda cerah yang memudar ke perut keperakan, sirip ekor merah tanpa tepi hitam, dan mata berukuran sedang. Red Bass lebih gelap, ekornya bergaris hitam di tepi, dan kepalanya lebih tumpul.",
        "Di lelang pukul tiga pagi kami memeriksa empat hal per lot: mata cembung dan jernih, insang merah segar tanpa lendir, daging kenyal yang kembali saat ditekan, dan bau laut, bukan bau amonia. Suhu inti diukur dengan probe; di atas 4 °C lot ditolak.",
        "Di invoice Anda, spesies ditulis dengan nama ilmiahnya. Itu bukan gaya-gayaan: itu cara Anda memegang kami pada apa yang kami jual.",
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
      title: "Size 40–50 atau 60–70? Membaca ukuran udang vaname",
      excerpt: "Angka pada udang adalah jumlah ekor per kilogram. Makin kecil angkanya, makin besar udangnya.",
      body: [
        "Udang vaname dijual dengan “size”: jumlah ekor dalam satu kilogram. Size 40–50 berarti 40 sampai 50 ekor per kg, sekitar 20–25 gram per ekor. Size 60–70 lebih kecil, 14–17 gram, dan lebih murah per kilogram.",
        "Untuk tumisan dan udang goreng tepung rumah tangga, size 60–70 lebih ekonomis dan matang cepat. Restoran yang menyajikan udang bakar atau saus Padang biasanya memakai size 40–50 supaya tampilannya penuh di piring.",
        "Hati-hati dengan udang yang terlalu berat untuk ukurannya: sebagian pedagang merendam udang dalam larutan fosfat agar menyerap air. Udang kami tidak direndam; beratnya adalah berat udang, dan dagingnya tidak berair saat dimasak.",
        "Opsi kupas kami ditimbang sebelum dikupas, karena kulit dan kepala adalah 35–40% berat. Harga per kg yang Anda bayar tetap untuk udang utuh; biaya kupas ditambahkan per kg.",
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
      title: "Menyimpan ikan segar di rumah tanpa bau dan tanpa kehilangan tekstur",
      excerpt: "Ikan yang datang pada suhu 0–4 °C layak dimasak 24 jam lagi, atau dibekukan dengan benar untuk 2–3 bulan.",
      body: [
        "Begitu kotak tiba, pindahkan ikan ke bagian paling dingin kulkas, biasanya rak bawah di belakang, dalam wadah tertutup berisi es gel atau es batu dalam kantong. Target suhu 0–4 °C; kulkas rumah rata-rata 5–7 °C, jadi es tambahan itu penting.",
        "Jika tidak dimasak hari itu, bekukan segera, jangan tunggu besok. Keringkan permukaan ikan dengan tisu, bungkus rapat dengan plastik wrap sampai tidak ada udara, lalu masukkan ke kantong zip. Udara adalah penyebab freezer burn, bukan dinginnya.",
        "Cairkan di kulkas bawah semalaman, bukan di suhu ruang dan bukan dengan air panas. Pencairan lambat menjaga tekstur dan mencegah bakteri berkembang di permukaan sementara bagian dalam masih beku.",
        "Ikan yang sudah disiangi atau difillet oleh kami lebih mudah disimpan karena bagian perut, sumber bau tercepat, sudah dibuang di meja pembersih kami.",
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
      title: "Apa arti RPHU bersertifikat halal dan NKV, dan mengapa restoran harus menanyakannya",
      excerpt: "Dua dokumen yang membedakan ayam yang bisa Anda pertanggungjawabkan dari ayam yang hanya murah.",
      body: [
        "RPHU adalah Rumah Pemotongan Hewan Unggas. Sertifikat halal dari BPJPH memastikan tata cara penyembelihan sesuai syariat dan rantai penanganannya terjaga; NKV, Nomor Kontrol Veteriner, adalah bukti bahwa unit tersebut memenuhi standar higiene dan sanitasi dari Kementerian Pertanian.",
        "Kewajiban halal untuk usaha mikro dan kecil ditunda sampai 17 Oktober 2028, tetapi pelanggan Anda tidak menunggu. Restoran yang ditanya tamunya “ayamnya halal?” perlu bisa menjawab dengan dokumen, bukan dengan keyakinan.",
        "Kami hanya membeli ayam beku dan ayam potong segar dari RPHU yang memegang kedua dokumen itu, menyimpan salinannya per pemasok, dan dapat menunjukkannya per lot kalau akun bisnis Anda memintanya.",
        "Di pengiriman, ayam dikemas dalam liner tertutup dan diletakkan terpisah dari ikan, tidak pernah dalam es yang sama. Itu soal keamanan pangan sekaligus soal bau di dapur Anda.",
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
      excerpt: "Ikan yang 5% lebih murah di pasar bisa 10% lebih mahal di piring begitu reject, susut dan jam kerja dihitung.",
      body: [
        "Pemilik restoran biasanya membandingkan harga per kilogram. Yang menentukan margin menu adalah harga per porsi tersaji, dan di antara keduanya ada tiga pengurang: ikan yang ditolak saat datang, susut saat dibersihkan, dan waktu staf.",
        "Reject di pasar tradisional berkisar 5–8% untuk pembeli yang tidak memeriksa setiap ekor. Grade ukuran yang tidak konsisten menambah susut: kakap 700 g dan 1,4 kg yang sama-sama dijual sebagai “kakap 1 kg” menghasilkan rendemen fillet yang berbeda.",
        "Lalu waktu: perjalanan ke Muara Baru pukul tiga pagi memakan 2–3 jam seorang kepala dapur atau pemilik, setiap hari. Pada upah kota, itu Rp 80–120 ribu per hari sebelum bensin dan parkir.",
        "Cara kami: grade ukuran tertulis, ditimbang setelah disiapkan, invoice bernama spesies, diantar pukul 05.00–08.00. Tagihan per kg kami memang 5–10% di atas pasar; biaya per porsi biasanya lebih rendah. Minta sampel dan hitung sendiri dengan menu Anda.",
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
      excerpt: "Udang kupas, dori fillet, dada ayam, nugget dan sayap: rencana makan malam yang tidak bergantung pada belanja harian.",
      body: [
        "Keluarga yang bekerja jarang kekurangan niat memasak; yang kurang adalah bahan yang siap pukul enam sore. Freezer yang diisi dengan benar menutup celah itu.",
        "Senin: udang kupas PD ditumis dengan bawang putih dan kecap, 12 menit dari freezer ke meja kalau dicairkan di kulkas sejak pagi. Selasa: dori fillet goreng tepung atau panggang dengan jeruk nipis. Rabu: dada fillet untuk ayam katsu atau geprek. Kamis: sosis dan telur untuk nasi goreng cepat. Jumat: sayap ayam panggang kecap.",
        "Aturannya satu: cairkan di kulkas bawah, bukan di meja. Keluarkan bahan untuk besok saat Anda membereskan dapur malam ini.",
        "Kotak Freezer Keluarga kami berisi empat dari lima bahan itu dengan harga di bawah membeli satuan, dan datang dalam kantong terinsulasi terpisah supaya tetap beku sampai pintu rumah Anda.",
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
