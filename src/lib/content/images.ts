// Page photography. Temporary images are Pexels-licensed (free commercial use; see docs/photo-credits.md)
// and self-hosted under /public/images. Replace any entry with your own photo path or URL.
// Product photos live on each product (image_url, editable in the back-office).
export const IMAGES = {
  hero: ["/images/site/hero-harbour.jpg", "/images/site/hero-chef.jpg", "/images/site/hero-freezer.jpg"] as [string, string, string],
  category: {
    "ikan-segar": "/images/site/cat-ikan-segar.jpg",
    "udang-cumi": "/images/site/cat-udang-cumi.jpg",
    "seafood-beku": "/images/site/cat-seafood-beku.jpg",
    ayam: "/images/site/cat-ayam.jpg",
    "frozen-food": "/images/site/cat-frozen-food.jpg",
    telur: "/images/site/cat-telur.jpg",
    "bumbu-dapur": "/images/site/cat-bumbu-dapur.jpg",
    "paket-hemat": "/images/products/kotak-freezer-keluarga.jpg",
  } as Record<string, string | null>,
  story: "/images/site/story-surabaya.jpg",
  standards: "/images/site/standards-ice.jpg",
  box: "/images/products/kotak-freezer-keluarga.jpg",
  kitchen: "/images/site/kitchen-salmon.jpg",
  restaurant: "/images/site/hero-chef.jpg",
  fishermen: "/images/site/fishermen-eastjava.jpg",
  market: "/images/site/market-woman.jpg",
  display: "/images/site/fish-display.jpg",
  butcher: "/images/site/chef-butcher.jpg",
  guides: {
    "cara-memilih-kakap-merah-asli": "/images/products/kakap-merah.jpg",
    "ukuran-udang-vaname": "/images/products/udang-vaname.jpg",
    "menyimpan-ikan-segar-di-rumah": "/images/site/standards-ice.jpg",
    "ayam-halal-rphu-nkv": "/images/site/cat-ayam.jpg",
    "menghitung-biaya-ikan-restoran": "/images/site/kitchen-salmon.jpg",
    "isi-freezer-seminggu": "/images/products/kotak-freezer-keluarga.jpg",
  } as Record<string, string>,
};
