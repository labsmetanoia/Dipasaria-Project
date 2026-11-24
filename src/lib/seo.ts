// What search engines and link previews read: page metadata (title, description, canonical address, preview image)
// and structured data (schema.org JSON-LD) for products, recipes, guides and the business itself.
// Search engines see the Indonesian site (the language toggle is a cookie, not a separate address), so the texts
// here are Indonesian.
import type { Metadata } from "next";
import type { Category, Product, Settings, Variant } from "./types";
import type { Recipe } from "./content/recipes";
import type { Guide } from "./content/guides";
import { BRAND, SITE_URL, UNIT_LABEL } from "./config";
import { rupiah } from "./format";

export const abs = (path: string) => (/^https?:\/\//.test(path) ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`);

/** Shorten to about `max` characters at a word boundary (search results cut descriptions near 155–160). */
export function clip(text: string, max = 158): string {
  const s = text.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 30)).replace(/[\s,;:.·–-]+$/, "")}…`;
}

/**
 * Metadata for an indexable page: its own title and description, the canonical address (so "?sort=…" or tracking
 * parameters never count as separate pages) and a preview image for WhatsApp, Instagram and search.
 * `absoluteTitle` skips the " · Dipasaria" suffix (long article headlines).
 */
export function pageMeta(o: { title: string; description: string; path: string; image?: string | null; absoluteTitle?: boolean; type?: "website" | "article" }): Metadata {
  const description = clip(o.description);
  const images = [{ url: o.image || "/og.jpg", alt: o.title }];
  return {
    title: o.absoluteTitle ? { absolute: o.title } : o.title,
    description,
    alternates: { canonical: o.path },
    openGraph: { type: o.type ?? "website", siteName: BRAND.name, locale: "id_ID", url: o.path, title: o.title, description, images },
    twitter: { card: "summary_large_image", title: o.title, description, images: images.map((i) => i.url) },
  };
}

/** Private or utility pages (cart, checkout, account, order tracking, search results): kept out of search results. */
export const NOINDEX: Metadata["robots"] = { index: false, follow: true };

// ---------- products ----------
const retailVariants = (p: Product) => p.variants.filter((v) => v.is_active && !v.business_only && v.price_retail > 0);
const inStock = (p: Product, v: Variant) => p.is_active && p.available_today && (v.stock_qty === null || v.stock_qty >= v.min_qty);
const unitText = (p: Product, v: Variant) => (p.is_catch_weight ? "kg" : UNIT_LABEL[v.unit] ?? v.unit);

/** "Mulai Rp115.000/kg" for the cheapest household size, or "" when nothing is for sale. */
export function fromPrice(p: Product): string {
  const vs = retailVariants(p);
  if (!vs.length) return "";
  const v = vs.reduce((a, b) => (b.price_retail < a.price_retail ? b : a));
  return `${vs.length > 1 ? "Mulai " : ""}${rupiah(v.price_retail)}/${unitText(p, v)}`;
}

/**
 * "Kakap Merah – beli online, antar Jakarta": the name plus what people search for, kept within the ~60 characters
 * a search result shows (the site name is appended by the title template).
 */
export function shopTitle(name: string): string {
  if (name.length <= 19) return `${name} – beli online, antar Jakarta`;
  if (name.length <= 32) return `${name} – antar Jakarta`;
  return name;
}

export function productTitle(p: Product): string {
  return shopTitle(p.name);
}

export function productDescription(p: Product, cutoff: string): string {
  const price = fromPrice(p);
  const base = p.description.replace(/\s+/g, " ").trim().replace(/[.!]?$/, ".");
  const en = p.name_en && !base.toLowerCase().includes(p.name_en.toLowerCase()) ? ` (${p.name_en})` : "";
  return clip(`${p.name}${en}: ${base.charAt(0).toLowerCase()}${base.slice(1)}${price ? ` ${price}${p.is_catch_weight ? ", ditimbang setelah disiapkan" : ""}.` : ""} Pesan sebelum pukul ${cutoff.replace(":", ".")}, diantar dingin besok ke Jakarta dan Tangerang.`);
}

/**
 * Product data for Google: one offer per size sold to households, with price, currency and availability.
 * Items sold by weight carry the price per kilogram. Null for products sold only to restaurants.
 */
export function productLd(p: Product, category: Category | undefined) {
  // Restaurant-only products publish no household price; without an offer Google rejects the item, so none is sent.
  if (!retailVariants(p).length) return null;
  const url = abs(`/belanja/produk/${p.slug}`);
  const offers = retailVariants(p).map((v) => ({
    "@type": "Offer",
    name: `${p.name} ${v.label}`,
    sku: v.id,
    url,
    price: v.price_retail,
    priceCurrency: "IDR",
    ...(p.is_catch_weight ? { priceSpecification: { "@type": "UnitPriceSpecification", price: v.price_retail, priceCurrency: "IDR", referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "KGM" } } } : {}),
    availability: `https://schema.org/${inStock(p, v) ? "InStock" : "OutOfStock"}`,
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@type": "Organization", name: BRAND.name },
  }));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    ...(p.name_en ? { alternateName: p.name_en } : {}),
    description: p.description,
    sku: p.slug,
    url,
    ...(p.image_url ? { image: [abs(p.image_url)] } : {}),
    brand: { "@type": "Brand", name: BRAND.name },
    ...(category ? { category: category.name } : {}),
    ...(offers.length ? { offers } : {}),
  };
}

// ---------- navigation trail ----------
export function breadcrumbLd(trail: Array<[name: string, path: string]>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(path) })),
  };
}

// ---------- recipes ----------
/** Recipe data for Google's recipe results: ingredients come from the linked products plus the pantry items. */
export function recipeLd(r: Recipe, ingredients: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: r.id.title,
    description: r.id.excerpt,
    image: [abs(r.image)],
    url: abs(`/resep/${r.slug}`),
    author: { "@type": "Organization", name: BRAND.name, url: SITE_URL },
    recipeYield: `${r.servings} porsi`,
    totalTime: `PT${r.minutes}M`,
    recipeCategory: "Hidangan utama",
    recipeCuisine: "Indonesia",
    keywords: [r.tag.id, r.level.id].join(", "),
    recipeIngredient: [...ingredients, ...r.id.pantry],
    recipeInstructions: r.id.steps.map((text, i) => ({ "@type": "HowToStep", position: i + 1, text })),
  };
}

// ---------- guides ----------
export function articleLd(g: Guide, image: string | undefined) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.id.title,
    description: g.id.excerpt,
    ...(image ? { image: [abs(image)] } : {}),
    datePublished: g.date,
    dateModified: g.date,
    inLanguage: "id",
    mainEntityOfPage: abs(`/panduan/${g.slug}`),
    author: { "@type": "Organization", name: BRAND.name, url: SITE_URL },
    publisher: { "@type": "Organization", name: BRAND.name, logo: { "@type": "ImageObject", url: abs("/brand/logo-stacked.png") } },
  };
}

// ---------- the business ----------
/** Who runs the shop: shown once per page. The WhatsApp number and Instagram account come from Pengaturan. */
export function storeLd(s: Pick<Settings, "store_name" | "whatsapp_number" | "instagram" | "address_line">) {
  const placeholder = /^62811000000/.test(s.whatsapp_number) || !s.whatsapp_number;
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: s.store_name || BRAND.name,
    slogan: "Segar & terpilih",
    description: BRAND.promise,
    url: SITE_URL,
    logo: abs("/brand/logo-stacked.png"),
    image: abs("/og.jpg"),
    areaServed: [{ "@type": "City", name: "Jakarta" }, { "@type": "City", name: "Tangerang" }],
    address: { "@type": "PostalAddress", addressLocality: s.address_line || "Jakarta Utara", addressRegion: "DKI Jakarta", addressCountry: "ID" },
    ...(placeholder ? {} : { contactPoint: { "@type": "ContactPoint", contactType: "customer service", telephone: `+${s.whatsapp_number}`, availableLanguage: ["id", "en"] } }),
    ...(s.instagram ? { sameAs: [`https://www.instagram.com/${s.instagram.replace(/^@/, "")}`] } : {}),
  };
}
