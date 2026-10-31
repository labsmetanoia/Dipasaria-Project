// Photo registry. Fill in direct image URLs (Unsplash: https://images.unsplash.com/photo-<id>?w=1600&q=80,
// or your own uploads). Empty values render the designed placeholder. Product photos live on each product (image_url).
export const IMAGES: {
  hero: [string | null, string | null, string | null];
  category: Record<string, string | null>;
  story: string | null;
  standards: string | null;
  box: string | null;
  kitchen: string | null;
  restaurant: string | null;
} = {
  hero: [null, null, null],
  category: {
    "ikan-segar": null,
    "udang-cumi": null,
    "seafood-beku": null,
    ayam: null,
    "frozen-food": null,
    telur: null,
    "bumbu-dapur": null,
    "paket-hemat": null,
  },
  story: null,
  standards: null,
  box: null,
  kitchen: null,
  restaurant: null,
};
