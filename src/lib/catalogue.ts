// Catalogue helpers shared by pages.
import type { Product } from "./types";

/**
 * Products without their descriptive texts, for client components that only price things (cart drawer, cart,
 * checkout): names, sizes, prices, stock and photos stay; descriptions, origin and storage notes are not sent.
 * Cuts the catalogue sent with every page by about 40%.
 */
export function slimProducts(products: Product[]): Product[] {
  return products.map((p) => ({ ...p, description: "", description_en: null, origin: "", origin_en: null, storage_note: "", storage_note_en: null, aliases: [], scientific_name: null }));
}
