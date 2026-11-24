// /robots.txt: search engines may read the shop and the guides; carts, accounts, orders, statements and the
// back-office are off limits (they are private or have no value in search results).
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/akun$", "/akun?", "/keranjang", "/checkout", "/pesanan", "/tagihan", "/offline"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
