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
  { id: "c_ikan", slug: "ikan-segar", name: "Ikan Segar", name_en: "Fresh Fish", description: "Dilelang di Muara Baru sebelum subuh, dinamai spesiesnya, digrade ukurannya.", description_en: "Auctioned at Muara Baru before dawn, named by species, graded by size.", sort: 1, icon: "fish", image_url: "/images/site/cat-ikan-segar.jpg", is_seafood: true },
  { id: "c_udang", slug: "udang-cumi", name: "Udang & Cumi", name_en: "Shrimp & Squid", description: "Udang vaname berukuran dan cumi segar, siap dikupas atau dibersihkan.", description_en: "Sized vannamei shrimp and fresh squid, ready to peel or clean.", sort: 2, icon: "shrimp", image_url: "/images/site/cat-udang-cumi.jpg", is_seafood: true },
  { id: "c_beku", slug: "seafood-beku", name: "Seafood Beku", name_en: "Frozen Seafood", description: "Fillet dan portion beku untuk stok freezer, tanpa risiko basi.", description_en: "Fillets and portions for the freezer, no spoilage risk.", sort: 3, icon: "snow", image_url: "/images/site/cat-seafood-beku.jpg", is_seafood: true },
  { id: "c_ayam", slug: "ayam", name: "Ayam", name_en: "Chicken", description: "Ayam potong dari RPHU bersertifikat halal, beku atau segar untuk akun bisnis.", description_en: "Cut chicken from halal-certified slaughterhouses, frozen or fresh for business accounts.", sort: 4, icon: "chicken", image_url: "/images/site/cat-ayam.jpg", is_seafood: false },
  { id: "c_olahan", slug: "frozen-food", name: "Frozen Food", name_en: "Frozen Food", description: "Nugget, sosis dan bakso ikan dari merek ber-BPOM dan berlogo halal.", description_en: "Nuggets, sausages and fish balls from BPOM-registered, halal-labelled brands.", sort: 5, icon: "box", image_url: "/images/site/cat-frozen-food.jpg", is_seafood: false },
  { id: "c_telur", slug: "telur", name: "Telur", name_en: "Eggs", description: "Telur ayam segar per tray, atau per peti untuk restoran.", description_en: "Fresh chicken eggs by the tray, or by the crate for restaurants.", sort: 6, icon: "egg", image_url: "/images/site/cat-telur.jpg", is_seafood: false },
  { id: "c_paket", slug: "paket-hemat", name: "Paket Hemat", name_en: "Value Boxes", description: "Kotak siap isi freezer dengan harga di bawah membeli satuan.", description_en: "Freezer-ready boxes priced below buying the items separately.", sort: 8, icon: "box", image_url: "/images/products/kotak-freezer-keluarga.jpg", is_seafood: false },
  { id: "c_bumbu", slug: "bumbu-dapur", name: "Bumbu & Dapur", name_en: "Pantry & Condiments", description: "Kebutuhan dapur yang Anda beli setiap minggu, ikut dalam pengiriman yang sama.", description_en: "The kitchen staples you buy every week, in the same delivery.", sort: 7, icon: "bottle", image_url: "/images/site/cat-bumbu-dapur.jpg", is_seafood: false },
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

const CHILLED = "Simpan 0–4 °C, masak dalam 24 jam atau bekukan.";
const FROZEN = "Simpan −18 °C. Cairkan di kulkas bawah, jangan di suhu ruang.";
const AMBIENT = "Simpan di tempat sejuk dan kering.";

const productSeeds: ProductSeed[] = [
  // ---- Ikan segar (catch weight) ----
  {
    id: "p_kakap", slug: "kakap-merah", category_id: "c_ikan", name: "Kakap Merah", name_en: "Malabar Snapper",
    scientific_name: "Lutjanus malabaricus", aliases: ["bambangan", "red snapper", "kakap"],
    description: "Kakap merah yang benar, bukan Red Bass yang sering dijual sebagai kakap. Daging putih padat untuk kukus, bakar atau goreng.",
    origin: "Muara Baru, didaratkan subuh", origin_en: "Muara Baru, landed at dawn", description_en: "The true red snapper, not the Red Bass often sold under that name. Firm white flesh for steaming, grilling or frying.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: true, is_featured: true, icon: "fish",
    variants: [
      v("1–2 kg/ekor", "kg", 115000, 92000, 78000, { id: "v_kakap_l" }),
      v("500–800 g/ekor", "kg", 98000, 80000, 68000, { id: "v_kakap_s" }),
    ],
    prep_options: [
      { id: "pp_kakap_siangi", label_en: "Gutted & scaled", note_en: null, label: "Siangi (buang sisik & isi perut)", surcharge: 3000, note: null },
      { id: "pp_kakap_fillet", label_en: "Fillet", note_en: "Yield ±45%; price per kg of whole fish", label: "Fillet", surcharge: 20000, note: "Rendemen ±45%; harga per kg ikan utuh" },
      { id: "pp_kakap_steak", label_en: "Cut into steaks", note_en: null, label: "Potong steak", surcharge: 8000, note: null },
    ],
  },
  {
    id: "p_kerapu", slug: "kerapu", category_id: "c_ikan", name: "Kerapu", name_en: "Orange-spotted Grouper",
    scientific_name: "Epinephelus coioides", aliases: ["grouper", "kerapu lumpur", "kerapu macan"],
    description: "Kerapu budidaya dengan pasokan stabil. Pilihan utama untuk hidangan ikan kukus restoran.",
    origin: "Tambak Lampung & Kepulauan Seribu via Muara Baru", origin_en: "Lampung and Seribu Islands farms via Muara Baru", description_en: "Farmed grouper with a steady supply. The restaurant choice for steamed whole fish.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: true, is_featured: true, icon: "fish",
    variants: [v("600–900 g/ekor", "kg", 165000, 135000, 118000, { id: "v_kerapu" })],
    prep_options: [{ id: "pp_kerapu_siangi", label_en: "Gutted & scaled", note_en: null, label: "Siangi", surcharge: 3000, note: null }],
  },
  {
    id: "p_kembung", slug: "kembung", category_id: "c_ikan", name: "Kembung", name_en: "Indian Mackerel",
    scientific_name: "Rastrelliger kanagurta", aliases: ["mackerel", "kembung banjar"],
    description: "Ikan rakyat dengan omega-3 tinggi. Volume harian untuk dapur Padang dan warung.",
    origin: "Muara Baru, didaratkan subuh", origin_en: "Muara Baru, landed at dawn", description_en: "The everyday fish, high in omega-3. Daily volume for Padang kitchens and warungs.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: true, is_featured: false, icon: "fish",
    variants: [v("6–8 ekor/kg", "kg", 48000, 36000, 30000, { id: "v_kembung" })],
    prep_options: [{ id: "pp_kembung_siangi", label_en: "Gutted & scaled", note_en: null, label: "Siangi", surcharge: 3000, note: null }],
  },
  {
    id: "p_tongkol", slug: "tongkol", category_id: "c_ikan", name: "Tongkol", name_en: "Mackerel Tuna",
    scientific_name: "Euthynnus affinis", aliases: ["tuna", "tongkol abu"],
    description: "Tongkol segar untuk balado, pindang dan suwir.",
    origin: "Muara Baru, didaratkan subuh", origin_en: "Muara Baru, landed at dawn", description_en: "Fresh mackerel tuna for balado, pindang and shredded dishes.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: true, is_featured: false, icon: "fish",
    variants: [v("300–500 g/ekor", "kg", 42000, 33000, 28000, { id: "v_tongkol" })],
    prep_options: [{ id: "pp_tongkol_steak", label_en: "Cut into steaks", note_en: null, label: "Potong steak", surcharge: 5000, note: null }],
  },
  {
    id: "p_bandeng", slug: "bandeng", category_id: "c_ikan", name: "Bandeng", name_en: "Milkfish",
    scientific_name: "Chanos chanos", aliases: ["milkfish", "bandeng presto"],
    description: "Bandeng tambak Lampung dengan opsi cabut duri untuk keluarga.",
    origin: "Tambak Lampung via Muara Baru", origin_en: "Lampung ponds via Muara Baru", description_en: "Lampung pond milkfish, with a deboning option for families.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: true, is_featured: false, icon: "fish",
    variants: [v("400–600 g/ekor", "kg", 45000, 35000, 29000, { id: "v_bandeng" })],
    prep_options: [
      { id: "pp_bandeng_siangi", label_en: "Gutted & scaled", note_en: null, label: "Siangi", surcharge: 3000, note: null },
      { id: "pp_bandeng_duri", label_en: "Deboned", note_en: "Done at dawn, 1–2 hours", label: "Cabut duri", surcharge: 15000, note: "Dikerjakan subuh, 1–2 jam" },
    ],
  },
  {
    id: "p_baronang", slug: "baronang", category_id: "c_ikan", name: "Baronang", name_en: "Rabbitfish",
    scientific_name: "Siganus spp.", aliases: ["rabbitfish", "beronang"],
    description: "Ikan bakar favorit restoran seafood, daging manis dan tidak amis.",
    origin: "Muara Baru, didaratkan subuh", origin_en: "Muara Baru, landed at dawn", description_en: "The seafood restaurant grilling favourite: sweet flesh, never fishy.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: false, is_featured: false, icon: "fish",
    variants: [v("300–500 g/ekor", "kg", 60000, 48000, 40000, { id: "v_baronang" })],
    prep_options: [{ id: "pp_baronang_siangi", label_en: "Gutted & scaled", note_en: null, label: "Siangi", surcharge: 3000, note: null }],
  },
  {
    id: "p_bawal", slug: "bawal-putih", category_id: "c_ikan", name: "Bawal Putih", name_en: "Silver Pomfret",
    scientific_name: "Pampus argenteus", aliases: ["pomfret", "bawal"],
    description: "Bawal putih premium untuk kukus ala Chinese-Indonesian.",
    origin: "Muara Baru, didaratkan subuh", origin_en: "Muara Baru, landed at dawn", description_en: "Premium silver pomfret for Chinese-Indonesian steamed dishes.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: true, is_featured: false, icon: "fish",
    variants: [v("400–600 g/ekor", "kg", 150000, 125000, 105000, { id: "v_bawal" })],
    prep_options: [{ id: "pp_bawal_siangi", label_en: "Gutted & scaled", note_en: null, label: "Siangi", surcharge: 3000, note: null }],
  },
  {
    id: "p_nila", slug: "nila-merah", category_id: "c_ikan", name: "Nila Merah", name_en: "Red Tilapia",
    scientific_name: "Oreochromis sp.", aliases: ["tilapia", "nila"],
    description: "Nila budidaya Jawa Barat, ukuran konsisten, ramah anak jika difillet.",
    origin: "Kolam Sukabumi & Indramayu", origin_en: "Sukabumi and Indramayu ponds", description_en: "West Java farmed tilapia, consistent sizing, child-friendly when filleted.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: true, is_featured: false, icon: "fish",
    variants: [v("500–700 g/ekor", "kg", 42000, 35000, 29000, { id: "v_nila" })],
    prep_options: [
      { id: "pp_nila_siangi", label_en: "Gutted & scaled", note_en: null, label: "Siangi", surcharge: 3000, note: null },
      { id: "pp_nila_fillet", label_en: "Skinless fillet", note_en: "Yield ±40%", label: "Fillet tanpa kulit", surcharge: 15000, note: "Rendemen ±40%" },
    ],
  },
  // ---- Udang & cumi ----
  {
    id: "p_udang", slug: "udang-vaname", category_id: "c_udang", name: "Udang Vaname Segar", name_en: "Whiteleg Shrimp",
    scientific_name: "Litopenaeus vannamei", aliases: ["shrimp", "prawn", "udang putih", "vannamei"],
    description: "Udang vaname tambak, dihitung per kg (size = jumlah ekor per kg). Tanpa perendaman penambah berat.",
    origin: "Tambak Lampung & Indramayu", origin_en: "Lampung and Indramayu ponds", description_en: "Pond-raised vannamei, sold per kg (size = pieces per kg). No weight-adding soak.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: true, is_featured: true, icon: "shrimp",
    variants: [
      v("Size 40–50", "kg", 118000, 96000, 84000, { id: "v_udang_40" }),
      v("Size 60–70", "kg", 105000, 88000, 76000, { id: "v_udang_60" }),
    ],
    prep_options: [
      { id: "pp_udang_kupas", label_en: "Peeled", note_en: "Weighed before peeling", label: "Kupas kulit", surcharge: 12000, note: "Berat ditimbang sebelum dikupas" },
      { id: "pp_udang_pd", label_en: "Peeled & deveined (PD)", note_en: null, label: "Kupas & belah punggung (PD)", surcharge: 15000, note: null },
    ],
  },
  {
    id: "p_cumi", slug: "cumi-segar", category_id: "c_udang", name: "Cumi Segar", name_en: "Squid",
    scientific_name: "Loligo spp.", aliases: ["squid", "sotong", "cumi-cumi"],
    description: "Cumi segar hasil lelang subuh, bisa dibersihkan dan dipotong ring.",
    origin: "Muara Baru, didaratkan subuh", origin_en: "Muara Baru, landed at dawn", description_en: "Fresh squid from the dawn auction; can be cleaned and cut into rings.", storage_class: "chilled", storage_note: CHILLED, is_catch_weight: true,
    available_today: true, is_featured: true, icon: "squid",
    variants: [v("8–12 ekor/kg", "kg", 95000, 78000, 66000, { id: "v_cumi" })],
    prep_options: [
      { id: "pp_cumi_bersih", label_en: "Cleaned (ink & quill removed)", note_en: null, label: "Bersihkan (buang tinta & tulang)", surcharge: 5000, note: null },
      { id: "pp_cumi_ring", label_en: "Cleaned & cut into rings", note_en: null, label: "Bersihkan & potong ring", surcharge: 8000, note: null },
    ],
  },
  // ---- Seafood beku ----
  {
    id: "p_udang_beku", slug: "udang-kupas-beku", category_id: "c_beku", name: "Udang Vaname Kupas PD Beku", name_en: "Peeled & Deveined Shrimp",
    scientific_name: "Litopenaeus vannamei", aliases: ["udang beku", "frozen shrimp", "pd shrimp"],
    description: "Udang kupas belah punggung, IQF, siap tumis. Andalan stok freezer rumah tangga.",
    origin: "Cold storage Lampung", origin_en: "Lampung cold storage", description_en: "Peeled, deveined, IQF shrimp ready to stir-fry. The household freezer staple.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: true, icon: "shrimp",
    variants: [v("500 g", "pack", 72000, 62000, 54000, { id: "v_udang_beku", stock_qty: 40 })],
  },
  {
    id: "p_dori", slug: "dori-fillet", category_id: "c_beku", name: "Dori Fillet Beku", name_en: "Pangasius Fillet",
    scientific_name: "Pangasius hypophthalmus", aliases: ["dory", "patin fillet", "ikan dori"],
    description: "Fillet dori tanpa duri untuk fish & chips, kafe dan menu anak.",
    origin: "Pengolah Lampung (SKP/HACCP)", origin_en: "Lampung processor (SKP/HACCP)", description_en: "Boneless pangasius fillet for fish and chips, cafés and children's menus.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "fillet",
    variants: [v("1 kg", "pack", 68000, 55000, 47000, { id: "v_dori", stock_qty: 30 })],
  },
  {
    id: "p_tuna", slug: "tuna-saku", category_id: "c_beku", name: "Tuna Saku Beku", name_en: "Yellowfin Tuna Saku",
    scientific_name: "Thunnus albacares", aliases: ["tuna", "saku", "tuna loin"],
    description: "Tuna saku grade sashimi-ready setelah dicairkan dengan benar.",
    origin: "Bitung, via distributor Jakarta", origin_en: "Bitung, via Jakarta distributor", description_en: "Tuna saku, sashimi-ready when thawed correctly.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "fillet",
    variants: [v("250 g", "pack", 58000, 48000, 40000, { id: "v_tuna", stock_qty: 25 })],
  },
  {
    id: "p_salmon", slug: "salmon-fillet", category_id: "c_beku", name: "Salmon Fillet Beku", name_en: "Atlantic Salmon Portion",
    scientific_name: "Salmo salar", aliases: ["salmon", "salmon norway"],
    description: "Portion salmon impor dari importir berizin, dipotong 200 g siap panggang.",
    origin: "Norwegia, importir berizin Jakarta", origin_en: "Norway, licensed Jakarta importer", description_en: "Imported salmon portions from a licensed importer, cut to 200 g ready to grill.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: true, icon: "fillet",
    variants: [v("200 g", "pack", 95000, 82000, 70000, { id: "v_salmon", stock_qty: 20 })],
  },
  {
    id: "p_tenggiri", slug: "tenggiri-steak", category_id: "c_beku", name: "Tenggiri Steak Beku", name_en: "Spanish Mackerel Steak",
    scientific_name: "Scomberomorus commerson", aliases: ["tenggiri", "mackerel steak"],
    description: "Steak tenggiri untuk bakar dan goreng, atau bahan pempek dan otak-otak.",
    origin: "Muara Baru, dibekukan dalam 4 jam", origin_en: "Muara Baru, frozen within 4 hours", description_en: "Spanish mackerel steaks for grilling and frying, or for pempek and otak-otak.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "fillet",
    variants: [v("500 g", "pack", 75000, 62000, 53000, { id: "v_tenggiri", stock_qty: 18 })],
  },
  // ---- Ayam ----
  {
    id: "p_sayap", slug: "sayap-ayam-beku", category_id: "c_ayam", name: "Sayap Ayam Beku", name_en: "Chicken Wings",
    scientific_name: null, aliases: ["wings", "chicken wing"],
    description: "Sayap ayam dari RPHU bersertifikat halal dan NKV, dibekukan segar.",
    origin: "RPHU bersertifikat halal, Jawa Barat", origin_en: "Halal-certified slaughterhouse, West Java", description_en: "Chicken wings from a halal-certified, NKV-registered slaughterhouse, frozen fresh.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "chicken",
    variants: [v("1 kg", "pack", 46000, 40000, 36000, { id: "v_sayap", stock_qty: 40 })],
  },
  {
    id: "p_paha", slug: "paha-ayam-beku", category_id: "c_ayam", name: "Paha Ayam Beku", name_en: "Chicken Thigh",
    scientific_name: null, aliases: ["thigh", "paha bawah", "paha atas"],
    description: "Paha ayam utuh, ukuran seragam 180–220 g per potong.",
    origin: "RPHU bersertifikat halal, Jawa Barat", origin_en: "Halal-certified slaughterhouse, West Java", description_en: "Whole chicken thighs, uniform 180–220 g pieces.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "chicken",
    variants: [v("1 kg", "pack", 44000, 38000, 34000, { id: "v_paha", stock_qty: 40 })],
  },
  {
    id: "p_dada", slug: "dada-fillet-ayam", category_id: "c_ayam", name: "Dada Fillet Ayam Beku", name_en: "Boneless Chicken Breast",
    scientific_name: null, aliases: ["fillet ayam", "chicken breast", "dada ayam"],
    description: "Dada tanpa tulang dan kulit, untuk geprek, katsu dan menu sehat.",
    origin: "RPHU bersertifikat halal, Jawa Barat", origin_en: "Halal-certified slaughterhouse, West Java", description_en: "Boneless, skinless breast for geprek, katsu and healthy menus.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: true, icon: "chicken",
    variants: [v("1 kg", "pack", 52000, 45000, 40000, { id: "v_dada", stock_qty: 40 })],
  },
  {
    id: "p_ayam_segar", slug: "ayam-potong-segar", category_id: "c_ayam", name: "Ayam Potong Segar", name_en: "Fresh Chicken, cut",
    scientific_name: null, aliases: ["ayam segar", "ayam potong 8", "broiler"],
    description: "Ayam broiler segar dipotong 8 atau 12, dari RPHU bersertifikat halal. Khusus akun restoran, harga mengikuti indeks pasar mingguan.",
    origin: "RPHU bersertifikat halal, Bogor", origin_en: "Halal-certified slaughterhouse, Bogor", description_en: "Fresh broiler cut into 8 or 12 from a halal-certified slaughterhouse. Business accounts only; priced to the weekly market index.", storage_class: "chilled", storage_note: "Simpan 0–4 °C, dikemas terpisah dari ikan.", is_catch_weight: true,
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
    description: "Nugget ayam merek nasional ber-BPOM MD dan berlogo halal.",
    origin: "Distributor resmi", origin_en: "Authorised distributor", description_en: "National-brand chicken nuggets, BPOM-registered with a halal logo.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: true, icon: "box",
    variants: [v("500 g", "pack", 42000, 36000, 31000, { id: "v_nugget", stock_qty: 36 })],
  },
  {
    id: "p_sosis", slug: "sosis-ayam", category_id: "c_olahan", name: "Sosis Ayam", name_en: "Chicken Sausage",
    scientific_name: null, aliases: ["sosis", "sausage"],
    description: "Sosis ayam premium untuk sarapan, bento dan menu kafe.",
    origin: "Distributor resmi", origin_en: "Authorised distributor", description_en: "Premium chicken sausages for breakfast, bento and café menus.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "box",
    variants: [v("500 g (12 pcs)", "pack", 38000, 32000, 27000, { id: "v_sosis", stock_qty: 30, label_en: "500 g (12 pcs)" })],
  },
  {
    id: "p_bakso", slug: "bakso-ikan", category_id: "c_olahan", name: "Bakso Ikan", name_en: "Fish Balls",
    scientific_name: null, aliases: ["fish ball", "baso ikan"],
    description: "Bakso ikan kenyal untuk sup, tomyam dan steamboat.",
    origin: "Distributor resmi", origin_en: "Authorised distributor", description_en: "Springy fish balls for soups, tom yum and steamboat.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "box",
    variants: [v("500 g", "pack", 35000, 30000, 25000, { id: "v_bakso", stock_qty: 30 })],
  },
  {
    id: "p_otak", slug: "otak-otak", category_id: "c_olahan", name: "Otak-otak Tenggiri", name_en: "Grilled Fish Cake",
    scientific_name: null, aliases: ["otak otak", "otak-otak bakar"],
    description: "Otak-otak tenggiri beku, tinggal bakar atau kukus 10 menit.",
    origin: "Produsen UMKM bersertifikat PIRT", origin_en: "PIRT-certified small producer", description_en: "Frozen Spanish-mackerel otak-otak; grill or steam for 10 minutes.", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "box",
    variants: [v("10 pcs", "pack", 28000, 24000, 20000, { id: "v_otak", stock_qty: 24 })],
  },
  // ---- Telur ----
  {
    id: "p_telur", slug: "telur-ayam", category_id: "c_telur", name: "Telur Ayam Negeri", name_en: "Chicken Eggs",
    scientific_name: null, aliases: ["telur", "egg", "telor"],
    description: "Telur segar dari peternakan Blitar dan Bogor, diantar 2× seminggu ke gudang kami.",
    origin: "Peternakan Blitar & Bogor", origin_en: "Blitar and Bogor farms", description_en: "Fresh eggs from Blitar and Bogor farms, delivered to our store twice a week.", storage_class: "ambient", storage_note: "Simpan di tempat sejuk, gunakan dalam 2 minggu.", is_catch_weight: false,
    available_today: true, is_featured: false, icon: "egg",
    variants: [
      v("Tray 30 butir", "tray", 58000, 52000, 48000, { id: "v_telur_tray", stock_qty: 30, label_en: "Tray of 30" }),
      v("Peti 15 kg (±240 butir)", "crate", 0, 410000, 385000, { id: "v_telur_peti", business_only: true, stock_qty: 6, label_en: "15 kg crate (±240 eggs)" }),
    ],
  },
  // ---- Bumbu & dapur ----
  {
    id: "p_minyak", slug: "minyak-goreng", category_id: "c_bumbu", name: "Minyak Goreng", name_en: "Cooking Oil",
    scientific_name: null, aliases: ["minyak", "oil"],
    description: "Minyak goreng sawit kemasan, merek nasional.",
    origin: "Distributor FMCG", origin_en: "FMCG distributor", description_en: "Packaged palm cooking oil, national brand.", storage_class: "ambient", storage_note: AMBIENT, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "bottle",
    variants: [
      v("2 L", "bottle", 38000, 35000, 32000, { id: "v_minyak_2l", stock_qty: 24 }),
      v("Jerigen 18 L", "box", 0, 305000, 285000, { id: "v_minyak_18l", business_only: true, stock_qty: 6 }),
    ],
  },
  {
    id: "p_kecap", slug: "kecap-manis", category_id: "c_bumbu", name: "Kecap Manis", name_en: "Sweet Soy Sauce",
    scientific_name: null, aliases: ["kecap", "soy sauce"],
    description: "Kecap manis merek nasional, botol atau jerigen untuk dapur restoran.",
    origin: "Distributor FMCG", origin_en: "FMCG distributor", description_en: "National-brand sweet soy sauce, bottle or jerrycan for restaurant kitchens.", storage_class: "ambient", storage_note: AMBIENT, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "bottle",
    variants: [
      v("520 ml", "bottle", 22000, 19000, 17000, { id: "v_kecap_520", stock_qty: 24 }),
      v("Jerigen 5 L", "box", 0, 125000, 112000, { id: "v_kecap_5l", business_only: true, stock_qty: 8 }),
    ],
  },
  {
    id: "p_sambal", slug: "sambal-bawang", category_id: "c_bumbu", name: "Sambal Bawang", name_en: "Shallot Chili Paste",
    scientific_name: null, aliases: ["sambal", "chili"],
    description: "Sambal bawang siap pakai, teman ikan bakar dan ayam goreng.",
    origin: "Produsen UMKM ber-BPOM", origin_en: "BPOM-registered small producer", description_en: "Ready-to-use shallot chilli paste, the partner of grilled fish and fried chicken.", storage_class: "ambient", storage_note: "Simpan di kulkas setelah dibuka.", is_catch_weight: false,
    available_today: true, is_featured: false, icon: "bottle",
    variants: [v("200 g", "bottle", 28000, 24000, 20000, { id: "v_sambal", stock_qty: 20 })],
  },
  {
    id: "p_bawang", slug: "bawang-putih-kupas", category_id: "c_bumbu", name: "Bawang Putih Kupas", name_en: "Peeled Garlic",
    scientific_name: null, aliases: ["garlic", "bawang"],
    description: "Bawang putih kupas, hemat 30 menit kerja dapur setiap hari.",
    origin: "Pasar Induk Kramat Jati", origin_en: "Kramat Jati wholesale market", description_en: "Peeled garlic: saves 30 minutes of kitchen work every day.", storage_class: "chilled", storage_note: "Simpan 0–4 °C, gunakan dalam 5 hari.", is_catch_weight: false,
    available_today: true, is_featured: false, icon: "bottle",
    variants: [v("500 g", "pack", 32000, 26000, 22000, { id: "v_bawang", stock_qty: 20 })],
  },
  {
    id: "p_tepung", slug: "tepung-bumbu", category_id: "c_bumbu", name: "Tepung Bumbu Serbaguna", name_en: "Seasoned Flour",
    scientific_name: null, aliases: ["tepung", "flour", "tepung crispy"],
    description: "Tepung bumbu untuk ayam dan seafood goreng tepung.",
    origin: "Distributor FMCG", origin_en: "FMCG distributor", description_en: "Seasoned flour for crispy fried chicken and seafood.", storage_class: "ambient", storage_note: AMBIENT, is_catch_weight: false,
    available_today: true, is_featured: false, icon: "bottle",
    variants: [v("1 kg", "pack", 24000, 21000, 18000, { id: "v_tepung", stock_qty: 20 })],
  },
  // ---- Paket hemat ----
  {
    id: "p_box_keluarga", slug: "kotak-freezer-keluarga", category_id: "c_paket", name: "Kotak Freezer Keluarga", name_en: "Family Freezer Box",
    scientific_name: null, aliases: ["paket", "bundle", "freezer box", "kotak hemat"],
    description: "Udang kupas PD 500 g, dori fillet 1 kg, nugget ayam 500 g dan sayap ayam 1 kg. Stok protein seminggu untuk keluarga, Rp 9.000 lebih murah dari membeli satuan.",
    description_en: "Peeled & deveined shrimp 500 g, dori fillet 1 kg, chicken nuggets 500 g and chicken wings 1 kg. A week of family protein, Rp 9,000 below buying separately.",
    origin: "Dikemas di meja packing kami", origin_en: "Packed at our packing table", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: true, icon: "box",
    variants: [v("1 kotak (4 item)", "box", 219000, 199000, 168000, { id: "v_box_keluarga", stock_qty: 12, label_en: "1 box (4 items)" })],
  },
  {
    id: "p_box_seafood", slug: "kotak-seafood-weekend", category_id: "c_paket", name: "Kotak Seafood Weekend", name_en: "Weekend Seafood Box",
    scientific_name: null, aliases: ["paket", "bundle", "salmon box", "kotak seafood"],
    description: "Salmon fillet 2 × 200 g, tuna saku 250 g dan udang kupas PD 500 g. Untuk dua makan malam istimewa dan satu tumisan cepat, Rp 21.000 lebih murah dari satuan.",
    description_en: "Salmon fillet 2 × 200 g, tuna saku 250 g and peeled & deveined shrimp 500 g. Two special dinners and one quick stir-fry, Rp 21,000 below buying separately.",
    origin: "Dikemas di meja packing kami", origin_en: "Packed at our packing table", storage_class: "frozen", storage_note: FROZEN, is_catch_weight: false,
    available_today: true, is_featured: true, icon: "box",
    variants: [v("1 kotak (3 item)", "box", 299000, 275000, 234000, { id: "v_box_seafood", stock_qty: 10, label_en: "1 box (3 items)" })],
  },
];

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

export const seedProducts: Product[] = productSeeds.map((p, pi) => ({
  ...p,
  description_en: p.description_en ?? null,
  origin_en: p.origin_en ?? null,
  storage_note_en: p.storage_note_en ?? STORAGE_EN[p.storage_note] ?? null,
  is_active: true,
  image_url: PHOTO_SLUGS.has(p.slug) ? `/images/products/${p.slug}.jpg` : null,
  sort: pi + 1,
  variants: p.variants.map((x, i) => ({
    ...x,
    label_en: x.label_en ?? x.label.replace("/ekor", "/fish").replace("ekor/kg", "pcs/kg").replace("butir", "eggs").replace("Jerigen", "Jerrycan").replace("Peti", "Crate").replace("Potong", "Cut"),
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
  { id: "a_barat_timur", name: "Jakarta Barat & Timur", fee: 25000, is_active: true, sort: 4 },
  { id: "a_tangerang", name: "Tangerang, BSD & Gading Serpong", fee: 35000, is_active: true, sort: 5 },
];

export const seedSlots: DeliverySlot[] = [
  { id: "s_dapur", label: "Dapur restoran", start_time: "05:00", end_time: "08:00", segment: "business", capacity: 15, is_active: true, sort: 1 },
  { id: "s_pagi", label: "Pagi", start_time: "10:00", end_time: "13:00", segment: "all", capacity: 12, is_active: true, sort: 2 },
  { id: "s_sore", label: "Sore", start_time: "15:00", end_time: "18:00", segment: "retail", capacity: 12, is_active: true, sort: 3 },
];

export const seedPromos: Promo[] = [
  { id: "pr_welcome", code: "SELAMATDATANG", type: "percent", value: 10, min_spend: 150000, segment: "retail", quota: 200, used_count: 0, first_order_only: true, starts_at: null, ends_at: null, is_active: true, description: "Diskon 10% pesanan pertama rumah tangga" },
  { id: "pr_ongkir", code: "GRATISONGKIR", type: "free_delivery", value: 0, min_spend: 200000, segment: "retail", quota: null, used_count: 0, first_order_only: false, starts_at: null, ends_at: null, is_active: true, description: "Gratis ongkir belanja di atas Rp 200.000" },
  { id: "pr_mitra", code: "MITRA50", type: "fixed", value: 50000, min_spend: 1500000, segment: "business", quota: 50, used_count: 0, first_order_only: false, starts_at: null, ends_at: null, is_active: true, description: "Potongan Rp 50.000 untuk pesanan restoran di atas Rp 1,5 jt" },
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
    address: "Jl. Kemang Raya No. 8, Jakarta Selatan", area_id: "a_selatan", business_type: "Kafe / cloud kitchen",
    discount_pct: 0, payment_terms: "prepaid", allow_cod: false, status: "pending", access_code: null,
    preferred_slot_id: null, notes: "", applied_at: "2026-10-30T14:30:00Z", approved_at: null,
  },
];
