// The daily price card: which sizes go on it and at which price, grouped by category. Shared by the image (for
// WhatsApp Status, Instagram and restaurant groups) and the printable price list (PDF for restaurants).
import type { Category, Product } from "./types";
import { UNIT_LABEL } from "./config";

export type CardVersion = "retail" | "business";
export type CardFormat = "story" | "post";
/** `lines`: product rows plus category headings that fit at a legible size. */
export const CARD_SIZE: Record<CardFormat, { width: number; height: number; lines: number; header: number }> = {
  story: { width: 1080, height: 1920, lines: 20, header: 420 }, // WhatsApp Status, Instagram story (9:16)
  post: { width: 1080, height: 1350, lines: 12, header: 360 }, // Instagram feed, WhatsApp group (4:5)
};

export interface CardRow { variant_id: string; name: string; label: string; price: number; unit: string; weighed: boolean }
export interface CardGroup { category: string; rows: CardRow[] }

/**
 * Sizes from `ids` that can go on the card: active, available today, not pre-order; household prices skip
 * restaurant-only sizes. `maxLines` counts product rows and category headings together.
 */
export function cardRows(products: Product[], categories: Category[], ids: string[], version: CardVersion, maxLines = Infinity): { groups: CardGroup[]; total: number; more: number; lines: number } {
  const want = new Set(ids);
  const rows: Array<CardRow & { cat: string; sort: number; vsort: number }> = [];
  for (const p of products) {
    if (!p.is_active || !p.available_today || p.campaign_id) continue;
    for (const v of p.variants) {
      if (!want.has(v.id) || !v.is_active || (version === "retail" && v.business_only)) continue;
      const price = version === "retail" ? v.price_retail : v.price_business;
      if (!(price > 0)) continue;
      rows.push({ variant_id: v.id, name: p.name, label: v.label, price, unit: UNIT_LABEL[v.unit] ?? v.unit, weighed: p.is_catch_weight, cat: p.category_id, sort: p.sort, vsort: v.sort });
    }
  }
  const catOrder = (id: string) => categories.find((c) => c.id === id)?.sort ?? 99;
  rows.sort((a, b) => catOrder(a.cat) - catOrder(b.cat) || a.sort - b.sort || a.vsort - b.vsort);
  const groups: CardGroup[] = [];
  let lines = 0, kept = 0;
  for (const r of rows) {
    const name = categories.find((c) => c.id === r.cat)?.name ?? "Lainnya";
    const g = groups.at(-1);
    const needs = g && g.category === name ? 1 : 2; // a new category also needs its heading
    if (lines + needs > maxLines) break;
    const row = { variant_id: r.variant_id, name: r.name, label: r.label, price: r.price, unit: r.unit, weighed: r.weighed };
    if (needs === 1) g!.rows.push(row); else groups.push({ category: name, rows: [row] });
    lines += needs; kept++;
  }
  return { groups, total: rows.length, more: rows.length - kept, lines };
}

export function parseIds(raw: string | null): string[] {
  return String(raw ?? "").split(",").map((s) => s.trim()).filter((s) => /^[A-Za-z0-9_-]{1,64}$/.test(s)).slice(0, 80);
}
