// Recipe bundles: each recipe lists catalogue items (by variant) for its base servings, plus what most kitchens already have.
// The recipe page scales quantities to the chosen servings (rounded to each variant's step) and adds every item in one tap.

export interface RecipeIngredient {
  variant_id: string;
  /** quantity for `servings` people, in the variant's unit */
  qty: number;
  prep_option_id?: string | null;
  /** fixed packs (bottles, sauces) don't scale with servings */
  fixed?: boolean;
  note?: { id: string; en: string };
}

export interface Recipe {
  slug: string;
  image: string;
  servings: number;
  minutes: number;
  level: { id: string; en: string };
  tag: { id: string; en: string };
  id: { title: string; excerpt: string; steps: string[]; pantry: string[] };
  en: { title: string; excerpt: string; steps: string[]; pantry: string[] };
  ingredients: RecipeIngredient[];
}

const EASY = { id: "Mudah", en: "Easy" };
const MEDIUM = { id: "Sedang", en: "Medium" };

export const recipes: Recipe[] = [
  {
    slug: "ikan-bakar-jimbaran",
    image: "/images/products/paket-ikan-bakar.jpg",
    servings: 4, minutes: 45, level: EASY, tag: { id: "Ikan bakar", en: "Grilled fish" },
    id: {
      title: "Ikan bakar bumbu Jimbaran",
      excerpt: "Kakap putih utuh dibakar dengan olesan kecap, sambal bawang, dan perasan jeruk nipis. Hidangan akhir pekan yang selalu habis.",
      steps: [
        "Lumuri ikan yang sudah disiangi dengan perasan 2 buah jeruk nipis dan sedikit garam. Diamkan 15 menit, lalu bilas dan keringkan.",
        "Campur 4 sendok makan kecap manis, 2 sendok makan sambal bawang, dan 1 sendok makan minyak sebagai bumbu oles.",
        "Kerat kedua sisi ikan, olesi bumbu hingga masuk ke sela keratan.",
        "Bakar di atas bara sedang 10–12 menit per sisi sambil terus diolesi bumbu, hingga daging dekat tulang berwarna putih.",
        "Sajikan dengan sisa sambal, irisan jeruk nipis, dan nasi hangat.",
      ],
      pantry: ["Garam", "Minyak goreng", "Nasi putih"],
    },
    en: {
      title: "Jimbaran-style grilled fish",
      excerpt: "Whole barramundi grilled with a sweet-soy glaze, shallot sambal and lime. The weekend dish that always disappears.",
      steps: [
        "Rub the gutted fish with the juice of 2 limes and a little salt. Rest for 15 minutes, rinse and pat dry.",
        "Mix 4 tbsp sweet soy sauce, 2 tbsp shallot sambal and 1 tbsp oil for the glaze.",
        "Score both sides of the fish and brush the glaze into the cuts.",
        "Grill over medium coals for 10–12 minutes a side, basting as you go, until the flesh near the bone is white.",
        "Serve with the rest of the sambal, lime wedges and warm rice.",
      ],
      pantry: ["Salt", "Cooking oil", "Steamed rice"],
    },
    ingredients: [
      { variant_id: "v_kputih_l", qty: 1, prep_option_id: "pp_kputih_siangi", note: { id: "1 ekor, disiangi", en: "1 fish, gutted" } },
      { variant_id: "v_kecap_520", qty: 1, fixed: true },
      { variant_id: "v_sambal", qty: 1, fixed: true },
      { variant_id: "v_jeruk", qty: 1, fixed: true },
    ],
  },
  {
    slug: "udang-saus-padang",
    image: "/images/products/udang-windu.jpg",
    servings: 4, minutes: 30, level: MEDIUM, tag: { id: "Udang", en: "Prawns" },
    id: {
      title: "Udang windu saus Padang",
      excerpt: "Udang windu besar dalam saus merah pedas manis dengan bawang putih dan saus tiram. Menu andalan restoran seafood, kini di rumah.",
      steps: [
        "Tumis 8 siung bawang putih cincang hingga harum, lalu masukkan cabai dan bawang merah yang sudah dihaluskan.",
        "Tambahkan 2 sendok makan saus tiram, 3 sendok makan saus tomat, dan 100 ml air. Masak hingga mengental.",
        "Masukkan udang yang sudah dikupas, aduk 3–4 menit sampai berubah warna. Jangan dimasak terlalu lama agar tetap juicy.",
        "Tuang kocokan 1 butir telur sambil diaduk perlahan, beri perasan jeruk nipis, lalu angkat.",
      ],
      pantry: ["Cabai merah", "Bawang merah", "Saus tomat", "Telur"],
    },
    en: {
      title: "Tiger prawns in saus Padang",
      excerpt: "Large tiger prawns in a hot-sweet red sauce with garlic and oyster sauce. The seafood-restaurant favourite, at home.",
      steps: [
        "Fry 8 cloves of minced garlic until fragrant, then add blended chillies and shallots.",
        "Add 2 tbsp oyster sauce, 3 tbsp tomato ketchup and 100 ml water. Simmer until thick.",
        "Add the peeled prawns and stir for 3–4 minutes until they turn pink; don't overcook.",
        "Drizzle in a beaten egg while stirring gently, finish with lime juice and serve.",
      ],
      pantry: ["Red chillies", "Shallots", "Tomato ketchup", "Egg"],
    },
    ingredients: [
      { variant_id: "v_windu_30", qty: 1, prep_option_id: "pp_windu_kupas" },
      { variant_id: "v_bawang", qty: 1, fixed: true },
      { variant_id: "v_tiram", qty: 1, fixed: true },
      { variant_id: "v_jeruk", qty: 1, fixed: true },
    ],
  },
  {
    slug: "cumi-goreng-tepung",
    image: "/images/products/cumi-ring-beku.jpg",
    servings: 3, minutes: 20, level: EASY, tag: { id: "Gorengan", en: "Fried" },
    id: {
      title: "Cumi goreng tepung renyah",
      excerpt: "Cumi ring beku, tepung bumbu, dan minyak panas: camilan atau lauk yang siap dalam 20 menit.",
      steps: [
        "Cairkan cumi ring di kulkas, lalu keringkan dengan tisu dan lumuri sedikit perasan jeruk nipis.",
        "Gulingkan cumi ke tepung bumbu, celupkan ke air es, lalu gulingkan lagi ke tepung agar lapisannya tebal dan renyah.",
        "Goreng dalam minyak panas (170 °C) 2–3 menit hingga keemasan. Tiriskan.",
        "Sajikan segera dengan sambal atau mayones dan irisan jeruk nipis.",
      ],
      pantry: ["Air es", "Mayones atau sambal"],
    },
    en: {
      title: "Crispy fried calamari",
      excerpt: "Frozen squid rings, seasoned flour and hot oil: a snack or side dish ready in 20 minutes.",
      steps: [
        "Thaw the squid rings in the fridge, pat dry and toss with a little lime juice.",
        "Dredge in the seasoned flour, dip in iced water, then dredge again for a thick, crisp coating.",
        "Fry in hot oil (170 °C) for 2–3 minutes until golden. Drain.",
        "Serve at once with sambal or mayonnaise and lime wedges.",
      ],
      pantry: ["Iced water", "Mayonnaise or sambal"],
    },
    ingredients: [
      { variant_id: "v_cumi_ring", qty: 1 },
      { variant_id: "v_tepung", qty: 1, fixed: true },
      { variant_id: "v_minyak_2l", qty: 1, fixed: true },
      { variant_id: "v_jeruk", qty: 1, fixed: true },
    ],
  },
  {
    slug: "sup-ikan-asam-pedas",
    image: "/images/products/kakap-merah.jpg",
    servings: 4, minutes: 35, level: EASY, tag: { id: "Sup", en: "Soup" },
    id: {
      title: "Sup ikan kakap asam pedas",
      excerpt: "Potongan steak kakap merah dalam kuah bening asam pedas dengan jeruk nipis dan bawang putih. Hangat dan ringan.",
      steps: [
        "Didihkan 1,2 liter air dengan serai, daun jeruk, dan lengkuas yang dimemarkan.",
        "Tumis bawang putih dan cabai, lalu masukkan ke dalam kuah. Bumbui dengan garam dan sedikit gula.",
        "Masukkan potongan kakap, masak dengan api kecil 8–10 menit tanpa terlalu sering diaduk agar ikan tidak hancur.",
        "Matikan api, tambahkan perasan jeruk nipis dan tomat. Sajikan panas.",
      ],
      pantry: ["Serai", "Daun jeruk", "Lengkuas", "Cabai rawit", "Tomat"],
    },
    en: {
      title: "Hot-and-sour snapper soup",
      excerpt: "Red snapper steaks in a clear hot-and-sour broth with lime and garlic. Warming and light.",
      steps: [
        "Bring 1.2 litres of water to the boil with bruised lemongrass, lime leaves and galangal.",
        "Fry garlic and chillies, add them to the broth and season with salt and a little sugar.",
        "Add the snapper pieces and simmer gently for 8–10 minutes, stirring as little as possible.",
        "Turn off the heat, add lime juice and tomato, and serve hot.",
      ],
      pantry: ["Lemongrass", "Lime leaves", "Galangal", "Bird's-eye chillies", "Tomato"],
    },
    ingredients: [
      { variant_id: "v_kakap_s", qty: 1, prep_option_id: "pp_kakap_steak", note: { id: "dipotong steak", en: "cut into steaks" } },
      { variant_id: "v_bawang", qty: 1, fixed: true },
      { variant_id: "v_jeruk", qty: 1, fixed: true },
    ],
  },
  {
    slug: "ayam-bakar-kecap",
    image: "/images/products/paha-fillet-ayam.jpg",
    servings: 4, minutes: 40, level: EASY, tag: { id: "Ayam", en: "Chicken" },
    id: {
      title: "Ayam bakar kecap",
      excerpt: "Fillet paha ayam yang empuk, dimarinasi kecap manis, bawang putih, dan jeruk nipis, lalu dibakar hingga karamel.",
      steps: [
        "Marinasi ayam dengan 5 sendok makan kecap manis, 6 siung bawang putih cincang, perasan 1 jeruk nipis, dan sejumput garam selama 30 menit.",
        "Panaskan pemanggang atau teflon beroles minyak.",
        "Bakar ayam 5–6 menit per sisi sambil diolesi sisa marinasi hingga matang dan berkaramel.",
        "Istirahatkan 3 menit sebelum dipotong. Sajikan dengan sambal dan lalapan.",
      ],
      pantry: ["Garam", "Minyak goreng", "Lalapan"],
    },
    en: {
      title: "Sweet-soy grilled chicken",
      excerpt: "Tender boneless thighs marinated in sweet soy, garlic and lime, then grilled until caramelised.",
      steps: [
        "Marinate the chicken with 5 tbsp sweet soy sauce, 6 cloves of minced garlic, the juice of 1 lime and a pinch of salt for 30 minutes.",
        "Heat a grill or oiled pan.",
        "Cook 5–6 minutes a side, brushing with the leftover marinade, until done and caramelised.",
        "Rest for 3 minutes before slicing. Serve with sambal and fresh vegetables.",
      ],
      pantry: ["Salt", "Cooking oil", "Fresh vegetables"],
    },
    ingredients: [
      { variant_id: "v_paha_fillet", qty: 1 },
      { variant_id: "v_kecap_520", qty: 1, fixed: true },
      { variant_id: "v_bawang", qty: 1, fixed: true },
      { variant_id: "v_jeruk", qty: 1, fixed: true },
    ],
  },
  {
    slug: "kepiting-lada-hitam",
    image: "/images/products/kepiting-bakau.jpg",
    servings: 3, minutes: 40, level: MEDIUM, tag: { id: "Kepiting", en: "Crab" },
    id: {
      title: "Kepiting lada hitam",
      excerpt: "Kepiting bakau yang sudah dibersihkan dan dipotong, ditumis dengan lada hitam, saus tiram, dan bawang putih.",
      steps: [
        "Kukus potongan kepiting 10 menit agar setengah matang dan dagingnya tidak menempel di cangkang.",
        "Tumis 6 siung bawang putih dan 1 bawang bombai hingga harum, tambahkan 2 sendok makan lada hitam tumbuk kasar.",
        "Masukkan 3 sendok makan saus tiram, 1 sendok makan kecap manis, dan 80 ml air.",
        "Masukkan kepiting, aduk rata, masak 5–7 menit hingga saus melapisi cangkang. Sajikan panas.",
      ],
      pantry: ["Lada hitam", "Bawang bombai", "Mentega"],
    },
    en: {
      title: "Black pepper crab",
      excerpt: "Cleaned and cut mud crab tossed with black pepper, oyster sauce and garlic.",
      steps: [
        "Steam the crab pieces for 10 minutes so they are half-cooked and the meat comes away from the shell.",
        "Fry 6 cloves of garlic and 1 onion until fragrant, add 2 tbsp coarsely crushed black pepper.",
        "Add 3 tbsp oyster sauce, 1 tbsp sweet soy sauce and 80 ml water.",
        "Add the crab, toss well and cook for 5–7 minutes until the sauce coats the shells. Serve hot.",
      ],
      pantry: ["Black pepper", "Onion", "Butter"],
    },
    ingredients: [
      { variant_id: "v_kepiting", qty: 1, prep_option_id: "pp_kepiting_potong", note: { id: "dibersihkan dan dipotong", en: "cleaned and cut" } },
      { variant_id: "v_tiram", qty: 1, fixed: true },
      { variant_id: "v_bawang", qty: 1, fixed: true },
    ],
  },
  {
    slug: "salmon-panggang-wijen",
    image: "/images/products/salmon-fillet.jpg",
    servings: 2, minutes: 20, level: EASY, tag: { id: "Salmon", en: "Salmon" },
    id: {
      title: "Salmon panggang minyak wijen",
      excerpt: "Potongan salmon dipanggang dengan garam laut, minyak wijen, dan jeruk nipis. Makan malam sehat dalam 20 menit.",
      steps: [
        "Cairkan salmon di kulkas semalaman, lalu keringkan permukaannya.",
        "Olesi dengan 1 sendok teh minyak wijen dan taburi garam laut.",
        "Panggang di oven 200 °C selama 10–12 menit, atau di teflon dengan sisi kulit di bawah 4 menit lalu balik 2 menit.",
        "Beri perasan jeruk nipis dan sedikit minyak wijen sebelum disajikan.",
      ],
      pantry: ["Sayuran rebus atau salad", "Nasi"],
    },
    en: {
      title: "Sesame-roasted salmon",
      excerpt: "Salmon portions roasted with sea salt, sesame oil and lime. A healthy dinner in 20 minutes.",
      steps: [
        "Thaw the salmon in the fridge overnight, then pat dry.",
        "Brush with 1 tsp sesame oil and sprinkle with sea salt.",
        "Roast at 200 °C for 10–12 minutes, or pan-fry skin side down for 4 minutes then 2 minutes on the other side.",
        "Finish with lime juice and a drop of sesame oil.",
      ],
      pantry: ["Steamed vegetables or salad", "Rice"],
    },
    ingredients: [
      { variant_id: "v_salmon", qty: 2, note: { id: "1 potong per orang", en: "1 portion per person" } },
      { variant_id: "v_wijen", qty: 1, fixed: true },
      { variant_id: "v_garam", qty: 1, fixed: true },
      { variant_id: "v_jeruk", qty: 1, fixed: true },
    ],
  },
];

export function getRecipe(slug: string): Recipe | undefined {
  return recipes.find((r) => r.slug === slug);
}

/** Recipes that use any variant of the given product. */
export function recipesForProduct(variantIds: string[]): Recipe[] {
  const set = new Set(variantIds);
  return recipes.filter((r) => r.ingredients.some((i) => set.has(i.variant_id)));
}
