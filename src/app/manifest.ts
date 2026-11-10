import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} — ${BRAND.tagline}`,
    short_name: BRAND.name,
    description: BRAND.promise,
    start_url: "/belanja?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf8f4",
    theme_color: "#000000",
    lang: "id",
    categories: ["food", "shopping", "business"],
    icons: [
      { src: "/icons/icon-192.png?v=4", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png?v=4", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png?v=4", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Pesan lagi", url: "/akun", description: "Ulangi pesanan terakhir" },
      { name: "Lacak pesanan", url: "/pesanan", description: "Status pesanan Anda" },
    ],
  };
}
