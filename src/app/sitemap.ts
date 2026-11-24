// /sitemap.xml: every page a customer could land on from search. Built from the live catalogue on each request, so a
// new product appears without a deploy; private pages (cart, checkout, account, orders, back-office) are left out.
import type { MetadataRoute } from "next";
import { getRepo } from "@/lib/data";
import { SITE_URL } from "@/lib/config";
import { recipes } from "@/lib/content/recipes";
import { guides } from "@/lib/content/guides";
import { IMAGES } from "@/lib/content/images";
import { isListed } from "@/lib/campaigns";
import { nowJakarta } from "@/lib/format";

export const dynamic = "force-dynamic";

const url = (path: string) => `${SITE_URL}${path}`;
const img = (src: string | null | undefined) => (src ? [/^https?:\/\//.test(src) ? src : url(src)] : undefined);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const repo = await getRepo();
  const [categories, allProducts, campaigns, settings] = await Promise.all([repo.getCategories(), repo.getProducts(), repo.getCampaigns(), repo.getSettings()]);
  // seasonal pre-orders appear while their page is public (switched on and not over), with their products
  const listed = campaigns.filter((c) => isListed(c, nowJakarta(), settings.cutoff_time));
  const products = allProducts.filter((p) => !p.campaign_id || listed.some((c) => c.id === p.campaign_id));
  const page = (path: string, priority: number, changeFrequency: "daily" | "weekly" | "monthly", images?: string[]) => ({ url: url(path), priority, changeFrequency, ...(images ? { images } : {}) });
  return [
    page("/belanja", 1, "daily"),
    page("/belanja/semua", 0.8, "daily"),
    ...listed.map((c) => page(`/belanja/musim/${c.slug}`, 0.9, "daily", img(c.image_url))),
    ...categories.map((c) => page(`/belanja/kategori/${c.slug}`, 0.8, "daily", img(IMAGES.category[c.slug] ?? c.image_url))),
    ...products.filter((p) => p.is_active).map((p) => page(`/belanja/produk/${p.slug}`, 0.9, "daily", img(p.image_url))),
    page("/resep", 0.7, "weekly"),
    ...recipes.map((r) => page(`/resep/${r.slug}`, 0.7, "monthly", img(r.image))),
    page("/rumah-tangga", 0.7, "monthly"),
    page("/restoran", 0.7, "monthly"),
    page("/akun/daftar", 0.5, "monthly"),
    page("/panduan", 0.6, "weekly"),
    ...guides.map((g) => ({ ...page(`/panduan/${g.slug}`, 0.6, "monthly", img(IMAGES.guides[g.slug])), lastModified: g.date })),
    page("/tentang", 0.5, "monthly"),
    page("/kontak", 0.5, "monthly"),
    page("/privasi", 0.2, "monthly"),
  ];
}
