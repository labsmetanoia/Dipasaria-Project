// Product feed for Google Merchant Center (free listings in Google's Shopping tab). Optional: paste this address
// into Merchant Center → Products → Feeds ("scheduled fetch"). One item per size sold to households, with the
// same price and availability the product page shows. Prices of items sold by weight are per kilogram.
import { getRepo } from "@/lib/data";
import { BRAND, SITE_URL } from "@/lib/config";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const abs = (p: string) => (/^https?:\/\//.test(p) ? p : `${SITE_URL}${p}`);

export async function GET() {
  const repo = await getRepo();
  const [products, categories] = await Promise.all([repo.getProducts(), repo.getCategories()]);
  const items: string[] = [];
  for (const p of products) {
    if (!p.is_active || !p.image_url) continue; // Google requires a photo
    const category = categories.find((c) => c.id === p.category_id)?.name ?? "";
    for (const v of p.variants) {
      if (!v.is_active || v.business_only || v.price_retail <= 0) continue;
      const available = p.available_today && (v.stock_qty === null || v.stock_qty >= v.min_qty);
      items.push([
        "<item>",
        `<g:id>${esc(v.id)}</g:id>`,
        `<g:item_group_id>${esc(p.id)}</g:item_group_id>`,
        `<title>${esc(`${p.name} ${v.label}`.slice(0, 150))}</title>`,
        `<description>${esc(p.description.slice(0, 4900))}</description>`,
        `<link>${esc(`${SITE_URL}/belanja/produk/${p.slug}`)}</link>`,
        `<g:image_link>${esc(abs(p.image_url))}</g:image_link>`,
        `<g:availability>${available ? "in_stock" : "out_of_stock"}</g:availability>`,
        `<g:price>${Math.round(v.price_retail)} IDR</g:price>`,
        ...(p.is_catch_weight ? ["<g:unit_pricing_measure>1 kg</g:unit_pricing_measure>"] : []),
        `<g:brand>${esc(BRAND.name)}</g:brand>`,
        "<g:condition>new</g:condition>",
        "<g:identifier_exists>no</g:identifier_exists>",
        ...(category ? [`<g:product_type>${esc(category)}</g:product_type>`] : []),
        "</item>",
      ].join(""));
    }
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>${esc(BRAND.name)}</title><link>${SITE_URL}</link><description>${esc(BRAND.promise)}</description>${items.join("")}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=900" } });
}
