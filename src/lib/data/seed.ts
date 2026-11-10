// Single source of truth for the starter catalogue. supabase/seed.sql is generated from
// this file (npm run gen:seed) and the demo mode loads it directly.
// Prices are placeholders for the launch price list, not market quotes.

import type {
  BusinessAccount,
  Category,
  DeliveryArea,
  DeliverySlot,
  PrepOption,
  Product,
  Promo,
  Settings,
  Variant,
} from "../types";

export const seedSettings: Settings = {
  store_name: "Dipasaria",
  tagline: "Protein pilihan untuk dapur Jakarta",
  tagline_en: "Trusted protein for Jakarta's kitchens",
  whatsapp_number: "6281100000000",
  bank_name: "BCA",
  bank_account: "0000000000",
  bank_holder: "PT Dipasaria",
  qris_image_url: null,
  cutoff_time: "20:00",
  min_order_retail: 150000,
  min_order_business: 750000,
  free_delivery_retail: 250000,
  free_delivery_business: 750000,
  catch_weight_buffer_pct: 5,
  max_days_ahead: 6,
  instagram: "dipasaria.id",
  address_line: "Jakarta Utara",
  announcement: null,
  announcement_en: null,
  hero_image_url: null,
  about_image_url: null,
};

export const seedCategories: Category[] = [
  { id: "c_ikan", slug: "ikan-segar", name: "Ikan segar", name_en: "Fresh Fish", description: "Dipilih dari lelang Muara Baru sebelum subuh, dengan jenis dan ukuran yang jelas.", description_en: "Auctioned at Muara Baru before dawn, named by species, graded by size.", sort: 1, icon: "fish", image_url: "/images/site/cat-ikan-segar.jpg", is_seafood: true },
  { id: "c_udang", slug: "udang-cumi", name: "Udang dan cumi", name_en: "Shrimp & Squid", description: "Udang vaname dan windu dengan ukuran yang jelas, cumi, sotong, kepiting bakau, dan kerang hijau, siap dibersihkan sesuai pesanan.", description_en: "Sized vannamei and tiger prawns, squid, cuttlefish, mud crab and green mussels, cleaned to order.", sort: 2, icon: "shrimp", image_url: "/images/site/cat-udang-cumi.jpg", is_seafood: true },
  { id: "c_beku", slug: "seafood-beku", name: "Seafood beku", name_en: "Frozen Seafood", description: "Fillet dan potongan beku untuk persediaan di freezer, tanpa risiko basi.", description_en: "Fillets and portions for the freezer, no spoilage risk.", sort: 3, icon: "snow", image_url: "/images/site/cat-seafood-beku.jpg", is_seafood: true },
  { id: "c_ayam", slug: "ayam", name: "Ayam halal", name_en: "Halal Chicken", description: "Ayam dari rumah potong bersertifikat halal, tersedia beku, serta segar khusus untuk akun bisnis.", description_en: "Cut chicken from halal-certified slaughterhouses, frozen or fresh for business accounts.", sort: 4, icon: "chicken", image_url: "/images/site/cat-ayam.jpg", is_seafood: false },
  { id: "c_olahan", slug: "frozen-food", name: "Olahan beku", name_en: "Frozen Food", description: "Nugget, sosis, dan bakso ikan dari merek yang terdaftar di BPOM dan berlogo halal.", description_en: "Nuggets, sausages and fish balls from BPOM-registered, halal-labelled brands.", sort: 5, icon: "box", image_url: "/images/site/cat-frozen-food.jpg", is_seafood: false },
  { id: "c_telur", slug: "telur", name: "Telur", name_en: "Eggs", description: "Telur ayam negeri, ayam kampung, bebek, dan puyuh; per rak, atau per peti untuk kebutuhan restoran.", description_en: "Chicken, free-range, duck and quail eggs; by the tray, or by the crate for restaurants.", sort: 6, icon: "egg", image_url: "/images/site/cat-telur.jpg", is_seafood: false },
  { id: "c_paket", slug: "paket-hemat", name: "Paket hemat", name_en: "Value Boxes", description: "Paket isi freezer yang lebih hemat daripada membeli satuan.", description_en: "Freezer-ready boxes priced below buying the items separately.", sort: 8, icon: "box", image_url: "/images/products/kotak-freezer-keluarga.jpg", is_seafood: false },
  { id: "c_bumbu", slug: "bumbu-dapur", name: "Bumbu dapur", name_en: "Pantry & Condiments", description: "Kebutuhan dapur yang rutin Anda beli setiap minggu, dikirim dalam pengiriman yang sama.", description_en: "The kitchen staples you buy every week, in the same delivery.", sort: 7, icon: "bottle", image_url: "/images/site/cat-bumbu-dapur.jpg", is_seafood: false },
];

type V = Omit<Variant, "id" | "product_id" | "is_active" | "sort" | "label_en"> & { id?: string; label_en?: string };
type P = Omit<PrepOption, "id" | "product_id" | "sort" | "label_en" | "note_en"> & { id?: string; label_en?: string | null; note_en?: string | null };
type ProductSeed = Omit<Product, "variants" | "prep_options" | "is_active" | "sort" | "image_url" | "description_en" | "origin_en" | "storage_note_en"> & {
  description_en?: string;
  origin_en?: string;
  storage_note_en?: string;
  variants: V[];
  prep_options?: P[];
};

function v(label: string, unit: Variant["unit"], price_retail: number, price_business: number, cost: number, opts: Partial<V> = {}): V {
  return {
    label,
    unit,
    min_qty: opts.min_qty ?? (unit === "kg" ? 0.5 : 1),
    step_qty: opts.step_qty ?? (unit === "kg" ? 0.5 : 1),
    price_retail,
    price_business,
    cost,
    stock_qty: opts.stock_qty ?? null,
    business_only: opts.business_only ?? false,
    ...(opts.id ? { id: opts.id } : {}),
  };
}

const CHILLED = "Simpan pada suhu 0–4 °C, lalu masak dalam 24 jam atau segera bekukan.";
const FROZEN = "Simpan pada suhu −18 °C. Cairkan di bagian bawah kulkas, bukan pada suhu ruang.";
const AMBIENT = "Simpan di tempat yang sejuk dan kering.";

const productSeeds: ProductSeed[] = [
  // ---- Ikan segar (catch weight) ----
  {
    id: "p_kakap", slug: "kakap-merah", category_id: "c_ikan", name: "Kakap Merah", name_en: "Malabar Snapper",
    scientific_name: "Lutjanus malabaricus", aliases: ["bambangan", "red snapper", "kakap"],
    description: "Kakap merah asli, bukan Red Bass yang kerap dijual dengan nama yang sama. Dagingnya putih dan padat, cocok dikukus, dibakar, atau digoreng.",
    origin: "Muara Baru, didaratkan menjelang subuh", origin_en: "Muara Baru, landed at dawn", description_en: "The true red snapper, not the Red Bass often sold under that name. Firm white flesh for steaming, grilling or frying.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: true, is_featured: true, icon: "fish",
    variants: [
      v("1–2 kg/ekor", "kg", 115000, 92000, 78000, { id: "v_kakap_l" }),
      v("500–800 g/ekor", "kg", 98000, 80000, 68000, { id: "v_kakap_s" }),
    ],
    prep_options: [
      { id: "pp_kakap_siangi", label_en: "Gutted & scaled", note_en: null, label: "Disiangi (sisik dan isi perut dibuang)", surcharge: 3000, note: null },
      { id: "pp_kakap_fillet", label_en: "Fillet", note_en: "Yield ±45%; price per kg of whole fish", label: "Fillet", surcharge: 20000, note: "Hasil daging ±45%; harga dihitung per kg ikan utuh" },
      { id: "pp_kakap_steak", label_en: "Cut into steaks", note_en: null, label: "Dipotong steak", surcharge: 8000, note: null },
    ],
  },
  {
    id: "p_kerapu", slug: "kerapu", category_id: "c_ikan", name: "Kerapu", name_en: "Orange-spotted Grouper",
    scientific_name: "Epinephelus coioides", aliases: ["grouper", "kerapu lumpur", "kerapu macan"],
    description: "Kerapu budidaya dengan pasokan yang stabil. Pilihan utama restoran untuk hidangan ikan kukus.",
    origin: "Tambak Lampung dan Kepulauan Seribu, melalui Muara Baru", origin_en: "Lampung and Seribu Islands farms via Muara Baru", description_en: "Farmed grouper with a steady supply. The restaurant choice for steamed whole fish.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: true, is_featured: true, icon: "fish",
    variants: [v("600–900 g/ekor", "kg", 165000, 135000, 118000, { id: "v_kerapu" })],
    prep_options: [{ id: "pp_kerapu_siangi", label_en: "Gutted & scaled", note_en: null, label: "Disiangi", surcharge: 3000, note: null }],
  },
  {
    id: "p_kembung", slug: "kembung", category_id: "c_ikan", name: "Kembung", name_en: "Indian Mackerel",
    scientific_name: "Rastrelliger kanagurta", aliases: ["mackerel", "kembung banjar"],
    description: "Ikan harian yang kaya omega-3. Andalan dapur rumah makan Padang dan warung.",
    origin: "Muara Baru, didaratkan menjelang subuh", origin_en: "Muara Baru, landed at dawn", description_en: "The everyday fish, high in omega-3. Daily volume for Padang kitchens and warungs.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: true, is_featured: false, icon: "fish",
    variants: [v("6–8 ekor/kg", "kg", 48000, 36000, 30000, { id: "v_kembung" })],
    prep_options: [{ id: "pp_kembung_siangi", label_en: "Gutted & scaled", note_en: null, label: "Disiangi", surcharge: 3000, note: null }],
  },
  {
    id: "p_tongkol", slug: "tongkol", category_id: "c_ikan", name: "Tongkol", name_en: "Mackerel Tuna",
    scientific_name: "Euthynnus affinis", aliases: ["tuna", "tongkol abu"],
    description: "Tongkol segar untuk balado, pindang, dan tongkol suwir.",
    origin: "Muara Baru, didaratkan menjelang subuh", origin_en: "Muara Baru, landed at dawn", description_en: "Fresh mackerel tuna for balado, pindang and shredded dishes.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: true, is_featured: false, icon: "fish",
    variants: [v("300–500 g/ekor", "kg", 42000, 33000, 28000, { id: "v_tongkol" })],
    prep_options: [{ id: "pp_tongkol_steak", label_en: "Cut into steaks", note_en: null, label: "Dipotong steak", surcharge: 5000, note: null }],
  },
  {
    id: "p_bandeng", slug: "bandeng", category_id: "c_ikan", name: "Bandeng", name_en: "Milkfish",
    scientific_name: "Chanos chanos", aliases: ["milkfish", "bandeng presto"],
    description: "Bandeng dari tambak Lampung, dengan pilihan cabut duri untuk santapan keluarga.",
    origin: "Tambak Lampung, melalui Muara Baru", origin_en: "Lampung ponds via Muara Baru", description_en: "Lampung pond milkfish, with a deboning option for families.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: true, is_featured: false, icon: "fish",
    variants: [v("400–600 g/ekor", "kg", 45000, 35000, 29000, { id: "v_bandeng" })],
    prep_options: [
      { id: "pp_bandeng_siangi", label_en: "Gutted & scaled", note_en: null, label: "Disiangi", surcharge: 3000, note: null },
      { id: "pp_bandeng_duri", label_en: "Deboned", note_en: "Done at dawn, 1–2 hours", label: "Cabut duri", surcharge: 15000, note: "Dikerjakan subuh, memerlukan 1–2 jam" },
    ],
  },
  {
    id: "p_baronang", slug: "baronang", category_id: "c_ikan", name: "Baronang", name_en: "Rabbitfish",
    scientific_name: "Siganus spp.", aliases: ["rabbitfish", "beronang"],
    description: "Ikan bakar favorit restoran seafood. Dagingnya manis dan tidak amis.",
    origin: "Muara Baru, didaratkan menjelang subuh", origin_en: "Muara Baru, landed at dawn", description_en: "The seafood restaurant grilling favourite: sweet flesh, never fishy.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: false, is_featured: false, icon: "fish",
    variants: [v("300–500 g/ekor", "kg", 60000, 48000, 40000, { id: "v_baronang" })],
    prep_options: [{ id: "pp_baronang_siangi", label_en: "Gutted & scaled", note_en: null, label: "Disiangi", surcharge: 3000, note: null }],
  },
  {
    id: "p_bawal", slug: "bawal-putih", category_id: "c_ikan", name: "Bawal Putih", name_en: "Silver Pomfret",
    scientific_name: "Pampus argenteus", aliases: ["pomfret", "bawal"],
    description: "Bawal putih pilihan untuk hidangan kukus khas Tionghoa-Indonesia.",
    origin: "Muara Baru, didaratkan menjelang subuh", origin_en: "Muara Baru, landed at dawn", description_en: "Premium silver pomfret for Chinese-Indonesian steamed dishes.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: true, is_featured: false, icon: "fish",
    variants: [v("400–600 g/ekor", "kg", 150000, 125000, 105000, { id: "v_bawal" })],
    prep_options: [{ id: "pp_bawal_siangi", label_en: "Gutted & scaled", note_en: null, label: "Disiangi", surcharge: 3000, note: null }],
  },
  {
    id: "p_nila", slug: "nila-merah", category_id: "c_ikan", name: "Nila Merah", name_en: "Red Tilapia",
    scientific_name: "Oreochromis sp.", aliases: ["tilapia", "nila"],
    description: "Nila budidaya Jawa Barat dengan ukuran seragam. Setelah difillet, aman dan mudah disantap anak-anak.",
    origin: "Kolam budidaya Sukabumi dan Indramayu", origin_en: "Sukabumi and Indramayu ponds", description_en: "West Java farmed tilapia, consistent sizing, child-friendly when filleted.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: true, is_featured: false, icon: "fish",
    variants: [v("500–700 g/ekor", "kg", 42000, 35000, 29000, { id: "v_nila" })],
    prep_options: [
      { id: "pp_nila_siangi", label_en: "Gutted & scaled", note_en: null, label: "Disiangi", surcharge: 3000, note: null },
      { id: "pp_nila_fillet", label_en: "Skinless fillet", note_en: "Yield ±40%", label: "Fillet tanpa kulit", surcharge: 15000, note: "Hasil daging ±40%" },
    ],
  },
  // ---- Udang & cumi ----
  {
    id: "p_udang", slug: "udang-vaname", category_id: "c_udang", name: "Udang Vaname Segar", name_en: "Whiteleg Shrimp",
    scientific_name: "Litopenaeus vannamei", aliases: ["shrimp", "prawn", "udang putih", "vannamei"],
    description: "Udang vaname dari tambak. Angka ukuran menunjukkan jumlah ekor per kilogram. Tanpa perendaman penambah berat.",
    origin: "Tambak Lampung dan Indramayu", origin_en: "Lampung and Indramayu ponds", description_en: "Pond-raised vannamei, sold per kg (size = pieces per kg). No weight-adding soak.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: true, is_featured: true, icon: "shrimp",
    variants: [
      v("40–50 ekor/kg", "kg", 118000, 96000, 84000, { id: "v_udang_40", label_en: "Size 40–50" }),
      v("60–70 ekor/kg", "kg", 105000, 88000, 76000, { id: "v_udang_60", label_en: "Size 60–70" }),
    ],
    prep_options: [
      { id: "pp_udang_kupas", label_en: "Peeled", note_en: "Weighed before peeling", label: "Dikupas", surcharge: 12000, note: "Ditimbang sebelum dikupas" },
      { id: "pp_udang_pd", label_en: "Peeled & deveined (PD)", note_en: null, label: "Dikupas dan dibelah punggung", surcharge: 15000, note: null },
    ],
  },
  {
    id: "p_cumi", slug: "cumi-segar", category_id: "c_udang", name: "Cumi Segar", name_en: "Squid",
    scientific_name: "Loligo spp.", aliases: ["squid", "sotong", "cumi-cumi"],
    description: "Cumi segar dari lelang subuh, dapat dibersihkan dan dipotong cincin sesuai pesanan.",
    origin: "Muara Baru, didaratkan menjelang subuh", origin_en: "Muara Baru, landed at dawn", description_en: "Fresh squid from the dawn auction; can be cleaned and cut into rings.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: true, is_featured: true, icon: "squid",
    variants: [v("8–12 ekor/kg", "kg", 95000, 78000, 66000, { id: "v_cumi" })],
    prep_options: [
      { id: "pp_cumi_bersih", label_en: "Cleaned (ink & quill removed)", note_en: null, label: "Dibersihkan (tinta dan tulang dibuang)", surcharge: 5000, note: null },
      { id: "pp_cumi_ring", label_en: "Cleaned & cut into rings", note_en: null, label: "Dibersihkan dan dipotong cincin", surcharge: 8000, note: null },
    ],
  },
  // ---- Seafood beku ----
  {
    id: "p_udang_beku", slug: "udang-kupas-beku", category_id: "c_beku", name: "Udang Vaname Kupas Belah Punggung Beku", name_en: "Peeled & Deveined Shrimp",
    scientific_name: "Litopenaeus vannamei", aliases: ["udang beku", "frozen shrimp", "pd shrimp"],
    description: "Udang kupas belah punggung, dibekukan per ekor (IQF), siap ditumis. Andalan persediaan freezer di rumah.",
    origin: "Gudang pendingin di Lampung", origin_en: "Lampung cold storage", description_en: "Peeled, deveined, IQF shrimp ready to stir-fry. The household freezer staple.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: true, icon: "shrimp",
    variants: [v("500 g", "pack", 72000, 62000, 54000, { id: "v_udang_beku", stock_qty: 40 })],
  },
  {
    id: "p_dori", slug: "dori-fillet", category_id: "c_beku", name: "Fillet Dori Beku", name_en: "Pangasius Fillet",
    scientific_name: "Pangasius hypophthalmus", aliases: ["dory", "patin fillet", "ikan dori"],
    description: "Fillet dori tanpa duri untuk fish and chips, menu kafe, dan menu anak.",
    origin: "Unit pengolahan di Lampung (bersertifikat SKP dan HACCP)", origin_en: "Lampung processor (SKP/HACCP)", description_en: "Boneless pangasius fillet for fish and chips, cafés and children's menus.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "fillet",
    variants: [v("1 kg", "pack", 68000, 55000, 47000, { id: "v_dori", stock_qty: 30 })],
  },
  {
    id: "p_tuna", slug: "tuna-saku", category_id: "c_beku", name: "Tuna Saku Beku", name_en: "Yellowfin Tuna Saku",
    scientific_name: "Thunnus albacares", aliases: ["tuna", "saku", "tuna loin"],
    description: "Tuna saku berkualitas sashimi, layak disajikan mentah setelah dicairkan dengan benar.",
    origin: "Bitung, melalui distributor di Jakarta", origin_en: "Bitung, via Jakarta distributor", description_en: "Tuna saku, sashimi-ready when thawed correctly.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "fillet",
    variants: [v("250 g", "pack", 58000, 48000, 40000, { id: "v_tuna", stock_qty: 25 })],
  },
  {
    id: "p_salmon", slug: "salmon-fillet", category_id: "c_beku", name: "Fillet Salmon Beku", name_en: "Atlantic Salmon Portion",
    scientific_name: "Salmo salar", aliases: ["salmon", "salmon norway"],
    description: "Potongan salmon Norwegia dari importir berizin, 200 g per potong, siap dipanggang.",
    origin: "Norwegia, melalui importir berizin di Jakarta", origin_en: "Norway, licensed Jakarta importer", description_en: "Imported salmon portions from a licensed importer, cut to 200 g ready to grill.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: true, icon: "fillet",
    variants: [v("200 g", "pack", 95000, 82000, 70000, { id: "v_salmon", stock_qty: 20 })],
  },
  {
    id: "p_tenggiri", slug: "tenggiri-steak", category_id: "c_beku", name: "Tenggiri Steak Beku", name_en: "Spanish Mackerel Steak",
    scientific_name: "Scomberomorus commerson", aliases: ["tenggiri", "mackerel steak"],
    description: "Steak tenggiri untuk dibakar atau digoreng, juga cocok sebagai bahan pempek dan otak-otak.",
    origin: "Muara Baru, dibekukan dalam 4 jam setelah dipilih", origin_en: "Muara Baru, frozen within 4 hours", description_en: "Spanish mackerel steaks for grilling and frying, or for pempek and otak-otak.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "fillet",
    variants: [v("500 g", "pack", 75000, 62000, 53000, { id: "v_tenggiri", stock_qty: 18 })],
  },
  // ---- Ayam ----
  {
    id: "p_sayap", slug: "sayap-ayam-beku", category_id: "c_ayam", name: "Sayap Ayam Beku", name_en: "Chicken Wings",
    scientific_name: null, aliases: ["wings", "chicken wing"],
    description: "Sayap ayam dari rumah potong bersertifikat halal dan ber-NKV, dibekukan dalam kondisi segar.",
    origin: "Rumah potong bersertifikat halal di Jawa Barat", origin_en: "Halal-certified slaughterhouse, West Java", description_en: "Chicken wings from a halal-certified, NKV-registered slaughterhouse, frozen fresh.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "chicken",
    variants: [v("1 kg", "pack", 46000, 40000, 36000, { id: "v_sayap", stock_qty: 40 })],
  },
  {
    id: "p_paha", slug: "paha-ayam-beku", category_id: "c_ayam", name: "Paha Ayam Beku", name_en: "Chicken Thigh",
    scientific_name: null, aliases: ["thigh", "paha bawah", "paha atas"],
    description: "Paha ayam utuh dengan ukuran seragam, 180–220 g per potong.",
    origin: "Rumah potong bersertifikat halal di Jawa Barat", origin_en: "Halal-certified slaughterhouse, West Java", description_en: "Whole chicken thighs, uniform 180–220 g pieces.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "chicken",
    variants: [v("1 kg", "pack", 44000, 38000, 34000, { id: "v_paha", stock_qty: 40 })],
  },
  {
    id: "p_dada", slug: "dada-fillet-ayam", category_id: "c_ayam", name: "Fillet Dada Ayam Beku", name_en: "Boneless Chicken Breast",
    scientific_name: null, aliases: ["fillet ayam", "chicken breast", "dada ayam"],
    description: "Dada ayam tanpa tulang dan kulit, untuk ayam geprek, katsu, dan menu sehat.",
    origin: "Rumah potong bersertifikat halal di Jawa Barat", origin_en: "Halal-certified slaughterhouse, West Java", description_en: "Boneless, skinless breast for geprek, katsu and healthy menus.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: true, icon: "chicken",
    variants: [v("1 kg", "pack", 52000, 45000, 40000, { id: "v_dada", stock_qty: 40 })],
  },
  {
    id: "p_ayam_segar", slug: "ayam-potong-segar", category_id: "c_ayam", name: "Ayam Potong Segar", name_en: "Fresh Chicken, cut",
    scientific_name: null, aliases: ["ayam segar", "ayam potong 8", "broiler"],
    description: "Ayam broiler segar dari rumah potong bersertifikat halal, dipotong 8 atau 12. Khusus akun bisnis; harga mengikuti acuan pasar mingguan.",
    origin: "Rumah potong bersertifikat halal di Bogor", origin_en: "Halal-certified slaughterhouse, Bogor", description_en: "Fresh broiler cut into 8 or 12 from a halal-certified slaughterhouse. Business accounts only; priced to the weekly market index.", storage_class: "chilled", storage_note: "Simpan pada suhu 0–4 °C. Dikemas terpisah dari ikan.", is_catch_weight: true,
    available_today: true, is_featured: false, icon: "chicken",
    variants: [
      v("Potong 8, 0,9–1,0 kg/ekor", "kg", 0, 42000, 38000, { id: "v_ayam8", business_only: true, min_qty: 2, step_qty: 1, label_en: "Cut into 8, 0.9–1.0 kg/bird" }),
      v("Potong 12, 0,9–1,0 kg/ekor", "kg", 0, 42000, 38000, { id: "v_ayam12", business_only: true, min_qty: 2, step_qty: 1, label_en: "Cut into 12, 0.9–1.0 kg/bird" }),
    ],
  },
  // ---- Frozen food ----
  {
    id: "p_nugget", slug: "nugget-ayam", category_id: "c_olahan", name: "Nugget Ayam", name_en: "Chicken Nuggets",
    scientific_name: null, aliases: ["nugget", "naget"],
    description: "Nugget ayam merek nasional, terdaftar di BPOM (MD) dan berlogo halal.",
    origin: "Distributor resmi", origin_en: "Authorised distributor", description_en: "National-brand chicken nuggets, BPOM-registered with a halal logo.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: true, icon: "box",
    variants: [v("500 g", "pack", 42000, 36000, 31000, { id: "v_nugget", stock_qty: 36 })],
  },
  {
    id: "p_sosis", slug: "sosis-ayam", category_id: "c_olahan", name: "Sosis Ayam", name_en: "Chicken Sausage",
    scientific_name: null, aliases: ["sosis", "sausage"],
    description: "Sosis ayam premium untuk sarapan, bekal, dan menu kafe.",
    origin: "Distributor resmi", origin_en: "Authorised distributor", description_en: "Premium chicken sausages for breakfast, bento and café menus.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "box",
    variants: [v("500 g (12 buah)", "pack", 38000, 32000, 27000, { id: "v_sosis", stock_qty: 30, label_en: "500 g (12 pcs)" })],
  },
  {
    id: "p_bakso", slug: "bakso-ikan", category_id: "c_olahan", name: "Bakso Ikan", name_en: "Fish Balls",
    scientific_name: null, aliases: ["fish ball", "baso ikan"],
    description: "Bakso ikan yang kenyal untuk sup, tom yam, dan suki.",
    origin: "Distributor resmi", origin_en: "Authorised distributor", description_en: "Springy fish balls for soups, tom yum and steamboat.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "box",
    variants: [v("500 g", "pack", 35000, 30000, 25000, { id: "v_bakso", stock_qty: 30 })],
  },
  {
    id: "p_otak", slug: "otak-otak", category_id: "c_olahan", name: "Otak-otak Tenggiri", name_en: "Grilled Fish Cake",
    scientific_name: null, aliases: ["otak otak", "otak-otak bakar"],
    description: "Otak-otak tenggiri beku, cukup dibakar atau dikukus selama 10 menit.",
    origin: "Produsen UMKM bersertifikat P-IRT", origin_en: "P-IRT-certified small producer", description_en: "Frozen Spanish-mackerel otak-otak; grill or steam for 10 minutes.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "box",
    variants: [v("10 buah", "pack", 28000, 24000, 20000, { id: "v_otak", stock_qty: 24, label_en: "10 pcs" })],
  },
  // ---- Telur ----
  {
    id: "p_telur", slug: "telur-ayam", category_id: "c_telur", name: "Telur Ayam Negeri", name_en: "Chicken Eggs",
    scientific_name: null, aliases: ["telur", "egg", "telor"],
    description: "Telur segar dari peternakan di Blitar dan Bogor, tiba di gudang kami dua kali seminggu.",
    origin: "Peternakan di Blitar dan Bogor", origin_en: "Blitar and Bogor farms", description_en: "Fresh eggs from Blitar and Bogor farms, delivered to our store twice a week.", storage_class: "ambient", storage_note: "Simpan di tempat sejuk, gunakan dalam 2 minggu.", is_catch_weight: false,
    available_today: true, is_featured: false, icon: "egg",
    variants: [
      v("Rak isi 30 butir", "tray", 58000, 52000, 48000, { id: "v_telur_tray", stock_qty: 30, label_en: "Tray of 30" }),
      v("Peti 15 kg (±240 butir)", "crate", 0, 410000, 385000, { id: "v_telur_peti", business_only: true, stock_qty: 6, label_en: "15 kg crate (±240 eggs)" }),
    ],
  },
  // ---- Bumbu & dapur ----
  {
    id: "p_minyak", slug: "minyak-goreng", category_id: "c_bumbu", name: "Minyak Goreng", name_en: "Cooking Oil",
    scientific_name: null, aliases: ["minyak", "oil"],
    description: "Minyak goreng sawit dalam kemasan, merek nasional.",
    origin: "Distributor resmi", origin_en: "FMCG distributor", description_en: "Packaged palm cooking oil, national brand.", storage_class: "ambient", storage_note: AMBIENT, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "bottle",
    variants: [
      v("2 L", "bottle", 38000, 35000, 32000, { id: "v_minyak_2l", stock_qty: 24 }),
      v("Jeriken 18 L", "pcs", 0, 305000, 285000, { id: "v_minyak_18l", business_only: true, stock_qty: 6 }),
    ],
  },
  {
    id: "p_kecap", slug: "kecap-manis", category_id: "c_bumbu", name: "Kecap Manis", name_en: "Sweet Soy Sauce",
    scientific_name: null, aliases: ["kecap", "soy sauce"],
    description: "Kecap manis merek nasional, tersedia dalam botol atau jeriken untuk dapur restoran.",
    origin: "Distributor resmi", origin_en: "FMCG distributor", description_en: "National-brand sweet soy sauce, bottle or jerrycan for restaurant kitchens.", storage_class: "ambient", storage_note: AMBIENT, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "bottle",
    variants: [
      v("520 ml", "bottle", 22000, 19000, 17000, { id: "v_kecap_520", stock_qty: 24 }),
      v("Jeriken 5 L", "pcs", 0, 125000, 112000, { id: "v_kecap_5l", business_only: true, stock_qty: 8 }),
    ],
  },
  {
    id: "p_sambal", slug: "sambal-bawang", category_id: "c_bumbu", name: "Sambal Bawang", name_en: "Shallot Chili Paste",
    scientific_name: null, aliases: ["sambal", "chili"],
    description: "Sambal bawang siap pakai, pendamping ikan bakar dan ayam goreng.",
    origin: "Produsen UMKM terdaftar di BPOM", origin_en: "BPOM-registered small producer", description_en: "Ready-to-use shallot chilli paste, the partner of grilled fish and fried chicken.", storage_class: "ambient", storage_note: "Simpan di kulkas setelah dibuka.", is_catch_weight: false,
    available_today: true, is_featured: false, icon: "bottle",
    variants: [v("200 g", "bottle", 28000, 24000, 20000, { id: "v_sambal", stock_qty: 20 })],
  },
  {
    id: "p_bawang", slug: "bawang-putih-kupas", category_id: "c_bumbu", name: "Bawang Putih Kupas", name_en: "Peeled Garlic",
    scientific_name: null, aliases: ["garlic", "bawang"],
    description: "Bawang putih kupas yang menghemat sekitar 30 menit pekerjaan dapur setiap hari.",
    origin: "Pasar Induk Kramat Jati", origin_en: "Kramat Jati wholesale market", description_en: "Peeled garlic: saves 30 minutes of kitchen work every day.", storage_class: "chilled", storage_note: "Simpan pada suhu 0–4 °C; gunakan dalam 5 hari.", is_catch_weight: false,
    available_today: true, is_featured: false, icon: "bottle",
    variants: [v("500 g", "pack", 32000, 26000, 22000, { id: "v_bawang", stock_qty: 20 })],
  },
  {
    id: "p_tepung", slug: "tepung-bumbu", category_id: "c_bumbu", name: "Tepung Bumbu Serbaguna", name_en: "Seasoned Flour",
    scientific_name: null, aliases: ["tepung", "flour", "tepung crispy"],
    description: "Tepung bumbu untuk ayam dan seafood goreng tepung yang renyah.",
    origin: "Distributor resmi", origin_en: "FMCG distributor", description_en: "Seasoned flour for crispy fried chicken and seafood.", storage_class: "ambient", storage_note: AMBIENT, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "bottle",
    variants: [v("1 kg", "pack", 24000, 21000, 18000, { id: "v_tepung", stock_qty: 20 })],
  },
  // ---- Paket hemat ----
  {
    id: "p_box_keluarga", slug: "kotak-freezer-keluarga", category_id: "c_paket", name: "Kotak Freezer Keluarga", name_en: "Family Freezer Box",
    scientific_name: null, aliases: ["paket", "bundle", "freezer box", "kotak hemat"],
    description: "Udang kupas belah punggung 500 g, fillet dori 1 kg, nugget ayam 500 g, dan sayap ayam 1 kg. Persediaan protein keluarga untuk seminggu, Rp9.000 lebih hemat daripada membeli satuan.",
    description_en: "Peeled & deveined shrimp 500 g, dori fillet 1 kg, chicken nuggets 500 g and chicken wings 1 kg. A week of family protein, Rp9,000 below buying separately.",
    origin: "Dikemas di ruang pengemasan kami", origin_en: "Packed at our packing table", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: true, icon: "box",
    variants: [v("1 kotak (4 produk)", "box", 219000, 199000, 168000, { id: "v_box_keluarga", stock_qty: 12, label_en: "1 box (4 items)" })],
  },
  {
    id: "p_box_seafood", slug: "kotak-seafood-weekend", category_id: "c_paket", name: "Kotak Seafood Akhir Pekan", name_en: "Weekend Seafood Box",
    scientific_name: null, aliases: ["paket", "bundle", "salmon box", "kotak seafood"],
    description: "Fillet salmon 2 × 200 g, tuna saku 250 g, dan udang kupas belah punggung 500 g. Cukup untuk dua makan malam istimewa dan satu tumisan cepat, Rp21.000 lebih hemat daripada membeli satuan.",
    description_en: "Salmon fillet 2 × 200 g, tuna saku 250 g and peeled & deveined shrimp 500 g. Two special dinners and one quick stir-fry, Rp21,000 below buying separately.",
    origin: "Dikemas di ruang pengemasan kami", origin_en: "Packed at our packing table", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: true, icon: "box",
    variants: [v("1 kotak (3 produk)", "box", 299000, 275000, 234000, { id: "v_box_seafood", stock_qty: 10, label_en: "1 box (3 items)" })],
  },
];

// ---- Catalogue expansion (round 8): merged into each category after its existing products ----
const SIANGI = (id: string): P => ({ id, label_en: "Gutted & scaled", note_en: null, label: "Disiangi (sisik dan isi perut dibuang)", surcharge: 3000, note: null });
const moreSeeds: ProductSeed[] = [
  // Ikan segar
  {
    id: "p_kakap_putih", slug: "kakap-putih", category_id: "c_ikan", name: "Kakap Putih", name_en: "Barramundi",
    scientific_name: "Lates calcarifer", aliases: ["barramundi", "seabass", "sea bass", "kakap"],
    description: "Kakap putih budidaya dengan daging putih tebal dan rasa lembut. Cocok untuk fillet goreng, steak panggang, atau sup ikan.",
    origin: "Tambak Lampung dan Situbondo, melalui agen tetap", origin_en: "Lampung and Situbondo farms via regular agents", description_en: "Farmed barramundi with thick white flesh and a mild flavour, for pan-fried fillets, grilled steaks or fish soup.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: true, is_featured: true, icon: "fish",
    variants: [v("1–2 kg/ekor", "kg", 105000, 88000, 75000, { id: "v_kputih_l" }), v("600–900 g/ekor", "kg", 92000, 78000, 66000, { id: "v_kputih_s" })],
    prep_options: [SIANGI("pp_kputih_siangi"), { id: "pp_kputih_fillet", label_en: "Fillet", note_en: "Yield ±45%; price per kg of whole fish", label: "Fillet", surcharge: 20000, note: "Hasil daging ±45%; harga dihitung per kg ikan utuh" }, { id: "pp_kputih_steak", label_en: "Cut into steaks", note_en: null, label: "Dipotong steak", surcharge: 8000, note: null }],
  },
  {
    id: "p_tenggiri_utuh", slug: "tenggiri-utuh", category_id: "c_ikan", name: "Tenggiri Utuh", name_en: "Spanish Mackerel",
    scientific_name: "Scomberomorus commerson", aliases: ["tenggiri", "king mackerel", "spanish mackerel"],
    description: "Tenggiri utuh dengan daging padat dan gurih, untuk steak goreng, pempek, atau otak-otak buatan sendiri.",
    origin: "Laut Jawa dan Natuna, didaratkan di Muara Baru", origin_en: "Java Sea and Natuna, landed at Muara Baru", description_en: "Whole Spanish mackerel with firm, savoury flesh for fried steaks, pempek or home-made otak-otak.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: true, is_featured: false, icon: "fish",
    variants: [v("3–5 kg/ekor", "kg", 125000, 105000, 90000, { id: "v_tutuh" })],
    prep_options: [SIANGI("pp_tutuh_siangi"), { id: "pp_tutuh_steak", label_en: "Cut into steaks", note_en: null, label: "Dipotong steak", surcharge: 5000, note: null }, { id: "pp_tutuh_fillet", label_en: "Fillet (for pempek)", note_en: "Yield ±55%", label: "Fillet (untuk pempek)", surcharge: 20000, note: "Hasil daging ±55%" }],
  },
  {
    id: "p_kuwe", slug: "ikan-kuwe", category_id: "c_ikan", name: "Kuwe", name_en: "Giant Trevally",
    scientific_name: "Caranx ignobilis", aliases: ["kuwe", "trevally", "GT", "ikan kue"],
    description: "Kuwe berdaging tebal dan padat, favorit untuk ikan bakar dan sup asam pedas.",
    origin: "Muara Baru, didaratkan menjelang subuh", origin_en: "Muara Baru, landed at dawn", description_en: "Thick, firm trevally, a favourite for grilling and hot-and-sour soup.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: true, is_featured: false, icon: "fish",
    variants: [v("1–2 kg/ekor", "kg", 85000, 72000, 60000, { id: "v_kuwe" })],
    prep_options: [SIANGI("pp_kuwe_siangi"), { id: "pp_kuwe_steak", label_en: "Cut into steaks", note_en: null, label: "Dipotong steak", surcharge: 6000, note: null }],
  },
  {
    id: "p_selar", slug: "selar", category_id: "c_ikan", name: "Selar Kuning", name_en: "Yellowstripe Scad",
    scientific_name: "Selaroides leptolepis", aliases: ["selar", "scad", "ikan selar"],
    description: "Selar kuning ukuran kecil, gurih digoreng kering atau dimasak balado. Pilihan hemat untuk lauk harian.",
    origin: "Muara Baru, didaratkan menjelang subuh", origin_en: "Muara Baru, landed at dawn", description_en: "Small yellowstripe scad, crisp when fried or cooked balado. An economical everyday choice.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: true, is_featured: false, icon: "fish",
    variants: [v("15–20 ekor/kg", "kg", 48000, 40000, 34000, { id: "v_selar" })],
    prep_options: [SIANGI("pp_selar_siangi")],
  },
  // Udang & cumi
  {
    id: "p_windu", slug: "udang-windu", category_id: "c_udang", name: "Udang Windu", name_en: "Black Tiger Prawn",
    scientific_name: "Penaeus monodon", aliases: ["windu", "tiger prawn", "udang besar"],
    description: "Udang windu tambak dengan daging tebal dan manis. Ukuran besar untuk udang bakar, udang saus Padang, atau hidangan istimewa.",
    origin: "Tambak tradisional Sidoarjo dan Lampung", origin_en: "Traditional ponds, Sidoarjo and Lampung", description_en: "Pond-raised tiger prawns with thick, sweet flesh, large enough for grilling and saus Padang.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: true, is_featured: true, icon: "shrimp",
    variants: [v("20–25 ekor/kg", "kg", 175000, 150000, 130000, { id: "v_windu_20", label_en: "Size 20–25" }), v("30–40 ekor/kg", "kg", 150000, 128000, 110000, { id: "v_windu_30", label_en: "Size 30–40" })],
    prep_options: [{ id: "pp_windu_kupas", label_en: "Peeled, tail on", note_en: "Weighed before peeling", label: "Dikupas, ekor disisakan", surcharge: 15000, note: "Ditimbang sebelum dikupas" }, { id: "pp_windu_belah", label_en: "Butterflied for grilling", note_en: null, label: "Dibelah untuk dibakar", surcharge: 10000, note: null }],
  },
  {
    id: "p_kepiting", slug: "kepiting-bakau", category_id: "c_udang", name: "Kepiting Bakau", name_en: "Mud Crab",
    scientific_name: "Scylla serrata", aliases: ["kepiting", "mud crab", "crab"],
    description: "Kepiting bakau dikirim hidup, dengan capit diikat. Daging manis untuk kepiting saus Padang, lada hitam, atau asam manis.",
    origin: "Pengepul tetap di Muara Angke dan Kalimantan Utara", origin_en: "Regular traders, Muara Angke and North Kalimantan", description_en: "Live mud crab with tied claws; sweet meat for saus Padang, black pepper or sweet-and-sour crab.", storage_class: "chilled", storage_note: "Dikirim hidup. Simpan di tempat sejuk dan lembap, lalu masak pada hari yang sama.", storage_note_en: "Delivered live. Keep cool and damp, and cook the same day.", is_catch_weight: true,
    available_today: true, is_featured: false, icon: "shrimp",
    variants: [v("300–500 g/ekor", "kg", 165000, 145000, 125000, { id: "v_kepiting" })],
    prep_options: [{ id: "pp_kepiting_potong", label_en: "Cleaned and cut", note_en: null, label: "Dibersihkan dan dipotong", surcharge: 10000, note: null }],
  },
  {
    id: "p_kerang", slug: "kerang-hijau", category_id: "c_udang", name: "Kerang Hijau", name_en: "Green Mussels",
    scientific_name: "Perna viridis", aliases: ["kerang", "mussel", "kijing"],
    description: "Kerang hijau segar yang sudah dibersihkan dari teritip, siap dikukus atau dimasak saus Padang.",
    origin: "Budidaya Cilincing, dipanen pagi hari", origin_en: "Cilincing farms, harvested in the morning", description_en: "Fresh green mussels cleaned of barnacles, ready to steam or cook in saus Padang.", storage_class: "chilled", storage_note: "Simpan pada suhu 0–4 °C dan masak pada hari yang sama.", storage_note_en: "Keep at 0–4 °C and cook the same day.", is_catch_weight: false,
    available_today: true, is_featured: false, icon: "shrimp",
    variants: [v("1 kg", "pack", 38000, 32000, 26000, { id: "v_kerang", stock_qty: 30 })],
  },
  {
    id: "p_sotong", slug: "sotong", category_id: "c_udang", name: "Sotong", name_en: "Cuttlefish",
    scientific_name: "Sepia pharaonis", aliases: ["sotong", "cuttlefish", "cumi sotong"],
    description: "Sotong berdaging tebal dan kenyal, cocok untuk sotong bakar, goreng tepung, atau dimasak hitam dengan tintanya.",
    origin: "Muara Baru, didaratkan menjelang subuh", origin_en: "Muara Baru, landed at dawn", description_en: "Thick, tender cuttlefish for grilling, battering, or cooking black in its own ink.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: true, is_featured: false, icon: "squid",
    variants: [v("2–4 ekor/kg", "kg", 95000, 80000, 68000, { id: "v_sotong" })],
    prep_options: [{ id: "pp_sotong_bersih", label_en: "Cleaned (ink and bone removed)", note_en: null, label: "Dibersihkan (tinta dan tulang dibuang)", surcharge: 6000, note: null }, { id: "pp_sotong_tinta", label_en: "Cleaned, ink kept separately", note_en: null, label: "Dibersihkan, tinta disimpan terpisah", surcharge: 6000, note: null }],
  },
  // Seafood beku
  {
    id: "p_cumi_ring", slug: "cumi-ring-beku", category_id: "c_beku", name: "Cumi Ring Beku", name_en: "Frozen Squid Rings",
    scientific_name: "Loligo spp.", aliases: ["calamari", "cumi ring", "cumi goreng tepung"],
    description: "Cumi yang sudah dibersihkan dan dipotong cincin, dibekukan cepat per potong. Siap digoreng tepung atau ditumis.",
    origin: "Pengolah bersertifikat SKP/HACCP di Jawa Timur", origin_en: "SKP/HACCP-certified processor, East Java", description_en: "Cleaned squid cut into rings and individually quick-frozen, ready to batter or stir-fry.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "squid",
    variants: [v("500 g", "pack", 58000, 50000, 42000, { id: "v_cumi_ring", stock_qty: 30 })],
  },
  {
    id: "p_fillet_kakap", slug: "fillet-kakap-beku", category_id: "c_beku", name: "Fillet Kakap Merah Beku", name_en: "Frozen Red Snapper Fillet",
    scientific_name: "Lutjanus malabaricus", aliases: ["fillet kakap", "snapper fillet", "kakap fillet"],
    description: "Fillet kakap merah berkulit tanpa duri, dibekukan per potong (IQF). Porsi seragam untuk menu restoran dan makan malam keluarga.",
    origin: "Diolah dari lelang Muara Baru, dibekukan dalam 4 jam", origin_en: "Cut from the Muara Baru auction, frozen within 4 hours", description_en: "Skin-on, boneless red snapper fillets, individually quick-frozen. Uniform portions for restaurant menus and family dinners.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "fillet",
    variants: [v("1 kg (5–7 potong)", "pack", 165000, 145000, 125000, { id: "v_fkakap", stock_qty: 20, label_en: "1 kg (5–7 portions)" })],
  },
  // Ayam
  {
    id: "p_ayam_utuh", slug: "ayam-utuh-beku", category_id: "c_ayam", name: "Ayam Utuh Beku", name_en: "Whole Chicken",
    scientific_name: null, aliases: ["ayam utuh", "whole chicken", "ayam broiler"],
    description: "Ayam broiler utuh tanpa jeroan dari rumah potong bersertifikat halal, untuk ayam panggang, ayam bakar, atau kaldu.",
    origin: "Rumah potong bersertifikat halal di Jawa Barat", origin_en: "Halal-certified slaughterhouse, West Java", description_en: "Whole broiler without giblets from a halal-certified slaughterhouse, for roasting, grilling or stock.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "chicken",
    variants: [v("1 ekor (0,9–1,1 kg)", "pack", 42000, 37000, 32000, { id: "v_ayam_utuh", stock_qty: 30, label_en: "1 bird (0.9–1.1 kg)" })],
  },
  {
    id: "p_paha_fillet", slug: "paha-fillet-ayam", category_id: "c_ayam", name: "Fillet Paha Ayam Beku", name_en: "Boneless Chicken Thigh",
    scientific_name: null, aliases: ["paha fillet", "boneless thigh", "chicken thigh"],
    description: "Paha ayam tanpa tulang dengan kulit, juicy untuk ayam bakar, teriyaki, dan karaage.",
    origin: "Rumah potong bersertifikat halal di Jawa Barat", origin_en: "Halal-certified slaughterhouse, West Java", description_en: "Skin-on boneless thighs, juicy for grilled chicken, teriyaki and karaage.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "chicken",
    variants: [v("1 kg", "pack", 58000, 51000, 45000, { id: "v_paha_fillet", stock_qty: 30 })],
  },
  // Olahan beku
  {
    id: "p_siomay", slug: "siomay", category_id: "c_olahan", name: "Siomay Ayam Udang", name_en: "Chicken & Prawn Siomay",
    scientific_name: null, aliases: ["siomay", "dimsum", "shumai"],
    description: "Siomay ayam dan udang beku, cukup dikukus 10 menit. Dari produsen terdaftar BPOM dan berlogo halal.",
    origin: "Produsen terdaftar BPOM MD, Tangerang", origin_en: "BPOM MD-registered producer, Tangerang", description_en: "Frozen chicken and prawn siomay, ready after 10 minutes of steaming. BPOM-registered, halal-labelled producer.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "box",
    variants: [v("500 g (20 buah)", "pack", 52000, 45000, 38000, { id: "v_siomay", stock_qty: 30, label_en: "500 g (20 pcs)" })],
  },
  {
    id: "p_kentang", slug: "kentang-goreng-beku", category_id: "c_olahan", name: "Kentang Goreng Beku", name_en: "Frozen French Fries",
    scientific_name: null, aliases: ["kentang", "french fries", "fries"],
    description: "Kentang goreng potongan 9 mm, renyah di luar dan lembut di dalam. Pendamping fish and chips dan menu anak.",
    origin: "Distributor resmi produk impor", origin_en: "Authorised import distributor", description_en: "9 mm cut fries, crisp outside and fluffy inside. The partner for fish and chips and kids' menus.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "box",
    variants: [v("1 kg", "pack", 42000, 36000, 30000, { id: "v_kentang", stock_qty: 40 }), v("2,5 kg", "pack", 0, 82000, 70000, { id: "v_kentang_25", business_only: true, stock_qty: 12, label_en: "2.5 kg" })],
  },
  // Telur
  {
    id: "p_telur_kampung", slug: "telur-ayam-kampung", category_id: "c_telur", name: "Telur Ayam Kampung", name_en: "Free-range Chicken Eggs",
    scientific_name: null, aliases: ["telur kampung", "free range", "telur organik"],
    description: "Telur ayam kampung dari peternakan rakyat, berukuran lebih kecil dengan kuning berwarna jingga pekat.",
    origin: "Peternakan rakyat di Sukabumi", origin_en: "Smallholder farms, Sukabumi", description_en: "Free-range eggs from smallholder farms: smaller, with deep orange yolks.", storage_class: "ambient", storage_note: "Simpan di tempat sejuk, gunakan dalam 2 minggu.", storage_note_en: "Keep cool; use within 2 weeks.", is_catch_weight: false,
    available_today: true, is_featured: false, icon: "egg",
    variants: [v("10 butir", "pack", 30000, 26000, 22000, { id: "v_telur_kampung", stock_qty: 30 })],
  },
  {
    id: "p_telur_bebek", slug: "telur-bebek", category_id: "c_telur", name: "Telur Bebek", name_en: "Duck Eggs",
    scientific_name: null, aliases: ["telur bebek", "duck egg", "telur itik"],
    description: "Telur bebek segar dengan kuning yang pekat, untuk martabak, kue, dan telur asin buatan sendiri.",
    origin: "Peternakan di Brebes dan Indramayu", origin_en: "Brebes and Indramayu farms", description_en: "Fresh duck eggs with rich yolks, for martabak, cakes and home-made salted eggs.", storage_class: "ambient", storage_note: "Simpan di tempat sejuk, gunakan dalam 2 minggu.", storage_note_en: "Keep cool; use within 2 weeks.", is_catch_weight: false,
    available_today: true, is_featured: false, icon: "egg",
    variants: [v("10 butir", "pack", 32000, 28000, 24000, { id: "v_telur_bebek", stock_qty: 30 })],
  },
  {
    id: "p_telur_puyuh", slug: "telur-puyuh", category_id: "c_telur", name: "Telur Puyuh", name_en: "Quail Eggs",
    scientific_name: null, aliases: ["puyuh", "quail egg"],
    description: "Telur puyuh segar untuk sate telur puyuh, sup, dan bekal anak.",
    origin: "Peternakan di Bogor", origin_en: "Bogor farms", description_en: "Fresh quail eggs for skewers, soups and lunch boxes.", storage_class: "ambient", storage_note: "Simpan di kulkas, gunakan dalam 2 minggu.", storage_note_en: "Refrigerate; use within 2 weeks.", is_catch_weight: false,
    available_today: true, is_featured: false, icon: "egg",
    variants: [v("30 butir", "pack", 18000, 15000, 12500, { id: "v_telur_puyuh", stock_qty: 30 })],
  },
  // Bumbu dapur
  {
    id: "p_saus_tiram", slug: "saus-tiram", category_id: "c_bumbu", name: "Saus Tiram", name_en: "Oyster Sauce",
    scientific_name: null, aliases: ["saus tiram", "oyster sauce", "saori"],
    description: "Saus tiram untuk tumisan seafood, cah sayur, dan bumbu marinasi. Merek terdaftar BPOM dan berlogo halal.",
    origin: "Distributor resmi", origin_en: "FMCG distributor", description_en: "Oyster sauce for seafood stir-fries, greens and marinades. BPOM-registered, halal-labelled brand.", storage_class: "ambient", storage_note: "Simpan di kulkas setelah dibuka.", storage_note_en: "Refrigerate after opening.", is_catch_weight: false,
    available_today: true, is_featured: false, icon: "bottle",
    variants: [v("Botol 510 g", "bottle", 32000, 28000, 24000, { id: "v_tiram", stock_qty: 24, label_en: "510 g bottle" })],
  },
  {
    id: "p_minyak_wijen", slug: "minyak-wijen", category_id: "c_bumbu", name: "Minyak Wijen", name_en: "Sesame Oil",
    scientific_name: null, aliases: ["minyak wijen", "sesame oil"],
    description: "Minyak wijen sangrai beraroma kuat, cukup beberapa tetes untuk ikan kukus, bakmi, dan tumisan.",
    origin: "Distributor resmi", origin_en: "FMCG distributor", description_en: "Fragrant toasted sesame oil; a few drops for steamed fish, noodles and stir-fries.", storage_class: "ambient", storage_note: AMBIENT, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "bottle",
    variants: [v("Botol 275 ml", "bottle", 42000, 37000, 31000, { id: "v_wijen", stock_qty: 20, label_en: "275 ml bottle" })],
  },
  {
    id: "p_garam_laut", slug: "garam-laut", category_id: "c_bumbu", name: "Garam Laut", name_en: "Sea Salt",
    scientific_name: null, aliases: ["garam", "sea salt", "garam kasar"],
    description: "Garam laut kasar dari petambak garam Madura, untuk ikan bakar, garam rendaman ikan, dan masakan sehari-hari.",
    origin: "Petambak garam Madura", origin_en: "Madura salt farmers", description_en: "Coarse sea salt from Madura salt farmers, for grilled fish, brines and everyday cooking.", storage_class: "ambient", storage_note: AMBIENT, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "bottle",
    variants: [v("500 g", "pack", 18000, 15000, 12000, { id: "v_garam", stock_qty: 30 })],
  },
  {
    id: "p_jeruk_nipis", slug: "jeruk-nipis", category_id: "c_bumbu", name: "Jeruk Nipis", name_en: "Limes",
    scientific_name: "Citrus aurantiifolia", aliases: ["jeruk nipis", "lime", "jeruk"],
    description: "Jeruk nipis segar untuk menghilangkan aroma amis, perasan ikan bakar, dan sambal.",
    origin: "Pasar Induk Kramat Jati", origin_en: "Kramat Jati wholesale market", description_en: "Fresh limes to take away fishiness, squeeze over grilled fish and brighten sambal.", storage_class: "ambient", storage_note: "Simpan di kulkas, gunakan dalam 7 hari.", storage_note_en: "Refrigerate; use within 7 days.", is_catch_weight: false,
    available_today: true, is_featured: false, icon: "bottle",
    variants: [v("500 g", "pack", 14000, 12000, 9000, { id: "v_jeruk", stock_qty: 30 })],
  },
  // Paket hemat
  {
    id: "p_paket_bakar", slug: "paket-ikan-bakar", category_id: "c_paket", name: "Paket Ikan Bakar", name_en: "Grill Night Box",
    scientific_name: null, aliases: ["paket bakar", "bbq", "grill"],
    description: "Kakap putih ±1 kg yang sudah disiangi, cumi segar 500 g, sambal bawang, dan jeruk nipis 500 g. Cukup untuk 4–5 orang.",
    description_en: "Barramundi ±1 kg (gutted), fresh squid 500 g, shallot sambal and limes 500 g. Serves 4–5.",
    origin: "Dikemas di ruang pengemasan kami", origin_en: "Packed at our packing table", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: false,
    available_today: true, is_featured: true, icon: "box",
    variants: [v("1 paket (4 produk)", "box", 189000, 172000, 148000, { id: "v_paket_bakar", stock_qty: 10, label_en: "1 box (4 items)" })],
  },
];

/** Existing products first, then each category's additions right after its last existing product. */
const orderedSeeds: ProductSeed[] = (() => {
  const out: ProductSeed[] = [];
  productSeeds.forEach((p, i) => {
    out.push(p);
    const next = productSeeds[i + 1];
    if (!next || next.category_id !== p.category_id) out.push(...moreSeeds.filter((m) => m.category_id === p.category_id));
  });
  return out;
})();

const STORAGE_EN: Record<string, string> = {
  [CHILLED]: "Keep at 0–4 °C; cook within 24 hours or freeze.",
  [FROZEN]: "Keep at −18 °C. Thaw in the fridge, never at room temperature.",
  [AMBIENT]: "Store in a cool, dry place.",
};

// Temporary photography (Pexels licence, see docs/photo-credits.md). Replace with own photos via the back-office.
const PHOTO_SLUGS = new Set([
  "kakap-merah", "kerapu", "kembung", "tongkol", "bandeng", "baronang", "bawal-putih", "nila-merah", "udang-vaname",
  "udang-kupas-beku", "dori-fillet", "tuna-saku", "salmon-fillet", "tenggiri-steak", "sayap-ayam-beku", "paha-ayam-beku",
  "dada-fillet-ayam", "ayam-potong-segar", "nugget-ayam", "sosis-ayam", "bakso-ikan", "telur-ayam", "minyak-goreng",
  "kecap-manis", "sambal-bawang", "bawang-putih-kupas", "tepung-bumbu", "kotak-freezer-keluarga", "kotak-seafood-weekend",
]);

export const seedProducts: Product[] = orderedSeeds.map((p, pi) => ({
  ...p,
  description_en: p.description_en ?? null,
  origin_en: p.origin_en ?? null,
  storage_note_en: p.storage_note_en ?? STORAGE_EN[p.storage_note] ?? null,
  is_active: true,
  image_url: PHOTO_SLUGS.has(p.slug) ? `/images/products/${p.slug}.jpg` : null,
  sort: pi + 1,
  variants: p.variants.map((x, i) => ({
    ...x,
    label_en: x.label_en ?? x.label.replace("/ekor", "/fish").replace("ekor/kg", "pcs/kg").replace("butir", "eggs").replace("Jeriken", "Jerrycan").replace("Peti", "Crate").replace("Potong", "Cut").replace(" produk)", " items)"),
    id: x.id ?? `${p.id}_v${i + 1}`,
    product_id: p.id,
    is_active: true,
    sort: i + 1,
  })),
  prep_options: (p.prep_options ?? []).map((x, i) => ({
    ...x,
    label_en: x.label_en ?? null,
    note_en: x.note_en ?? null,
    id: x.id ?? `${p.id}_pp${i + 1}`,
    product_id: p.id,
    sort: i + 1,
  })),
}));

export const seedAreas: DeliveryArea[] = [
  { id: "a_utara", name: "Jakarta Utara (Kelapa Gading, Sunter, Pluit, PIK)", fee: 15000, is_active: true, sort: 1 },
  { id: "a_pusat", name: "Jakarta Pusat", fee: 20000, is_active: true, sort: 2 },
  { id: "a_selatan", name: "Jakarta Selatan (Senopati, Kemang, Blok M)", fee: 25000, is_active: true, sort: 3 },
  { id: "a_barat_timur", name: "Jakarta Barat dan Timur", fee: 25000, is_active: true, sort: 4 },
  { id: "a_tangerang", name: "Tangerang, BSD, dan Gading Serpong", fee: 35000, is_active: true, sort: 5 },
];

export const seedSlots: DeliverySlot[] = [
  { id: "s_dapur", label: "Pengiriman dapur", start_time: "05:00", end_time: "08:00", segment: "business", capacity: 15, is_active: true, sort: 1 },
  { id: "s_pagi", label: "Siang", start_time: "10:00", end_time: "13:00", segment: "all", capacity: 12, is_active: true, sort: 2 },
  { id: "s_sore", label: "Sore", start_time: "15:00", end_time: "18:00", segment: "retail", capacity: 12, is_active: true, sort: 3 },
];

export const seedPromos: Promo[] = [
  { id: "pr_welcome", code: "SELAMATDATANG", type: "percent", value: 10, min_spend: 150000, segment: "retail", quota: 200, used_count: 0, first_order_only: true, starts_at: null, ends_at: null, is_active: true, description: "Diskon 10% untuk pesanan pertama rumah tangga" },
  { id: "pr_ongkir", code: "GRATISONGKIR", type: "free_delivery", value: 0, min_spend: 200000, segment: "retail", quota: null, used_count: 0, first_order_only: false, starts_at: null, ends_at: null, is_active: true, description: "Gratis ongkos kirim untuk belanja mulai Rp200.000" },
  { id: "pr_mitra", code: "MITRA50", type: "fixed", value: 50000, min_spend: 1500000, segment: "business", quota: 50, used_count: 0, first_order_only: false, starts_at: null, ends_at: null, is_active: true, description: "Potongan Rp50.000 untuk pesanan akun bisnis mulai Rp1.500.000" },
];

export const seedAccounts: BusinessAccount[] = [
  {
    id: "ba_bahari", business_name: "Seafood Bahari Gading", contact_name: "Pak Hendra", phone: "6281200000001",
    address: "Jl. Boulevard Raya Blok QA 1 No. 12, Kelapa Gading", area_id: "a_utara", business_type: "Restoran seafood",
    discount_pct: 0, payment_terms: "weekly", allow_cod: true, status: "approved", access_code: "BHR123",
    preferred_slot_id: "s_dapur", notes: "Pesan 5 hari/minggu. Minta kakap 1–2 kg selalu disiangi.",
    applied_at: "2026-10-20T09:00:00Z", approved_at: "2026-10-21T10:00:00Z",
  },
  {
    id: "ba_minang", business_name: "RM Padang Sinar Minang", contact_name: "Uni Ratna", phone: "6281200000002",
    address: "Jl. Danau Sunter Utara No. 45, Sunter", area_id: "a_utara", business_type: "Restoran Padang / Sunda / Manado",
    discount_pct: 2, payment_terms: "days3", allow_cod: true, status: "approved", access_code: "MNG456",
    preferred_slot_id: "s_dapur", notes: "Kembung dan tongkol harian; mulai ambil ayam potong 8.",
    applied_at: "2026-10-22T09:00:00Z", approved_at: "2026-10-23T10:00:00Z",
  },
  {
    id: "ba_kemang", business_name: "Kopi & Dapur Kemang", contact_name: "Mbak Sita", phone: "6281200000003",
    address: "Jl. Kemang Raya No. 8, Jakarta Selatan", area_id: "a_selatan", business_type: "Kafe / dapur daring",
    discount_pct: 0, payment_terms: "prepaid", allow_cod: false, status: "pending", access_code: null,
    preferred_slot_id: null, notes: "", applied_at: "2026-10-30T14:30:00Z", approved_at: null,
  },
];
