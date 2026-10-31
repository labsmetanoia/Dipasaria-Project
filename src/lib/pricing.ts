// Shared business rules. The browser uses these for live estimates; the memory adapter
// uses them as its authority; in production the SQL function place_order() re-implements
// the same rules so nothing from the browser is trusted.

import type {
  BusinessAccount,
  CartLine,
  DeliveryArea,
  DeliverySlot,
  PrepOption,
  Product,
  Promo,
  Quote,
  Segment,
  Settings,
  Variant,
} from "./types";
import { addDays, parseTime } from "./format";

export interface QuoteContext {
  settings: Settings;
  products: Product[];
  areas: DeliveryArea[];
  promos: Promo[];
  account: BusinessAccount | null;
  /** Jakarta "now" — ISO date + minutes of day */
  now: { date: string; minutesOfDay: number };
  /** true when the phone has never ordered before (for first-order promos); undefined = unknown */
  isFirstOrder?: boolean;
}

export function segmentOf(account: BusinessAccount | null): Segment {
  return account && account.status === "approved" ? "business" : "retail";
}

export function unitPrice(variant: Variant, segment: Segment, account: BusinessAccount | null): number {
  if (segment === "business") {
    const base = variant.price_business;
    const disc = account?.discount_pct ?? 0;
    return Math.round(base * (1 - disc / 100));
  }
  return variant.price_retail;
}

export function roundQty(q: number, v: Variant): number {
  const steps = Math.round((q - v.min_qty) / v.step_qty);
  const r = v.min_qty + Math.max(0, steps) * v.step_qty;
  return Math.round(r * 1000) / 1000;
}

export function lineKey(l: CartLine): string {
  return `${l.variant_id}|${l.prep_option_id ?? ""}`;
}

export function findVariant(products: Product[], variantId: string): { product: Product; variant: Variant } | null {
  for (const p of products) {
    const v = p.variants.find((x) => x.id === variantId);
    if (v) return { product: p, variant: v };
  }
  return null;
}

export function deliveryFee(area: DeliveryArea | null, subtotal: number, segment: Segment, settings: Settings): number {
  if (!area) return 0;
  const threshold = segment === "business" ? settings.free_delivery_business : settings.free_delivery_retail;
  return subtotal >= threshold ? 0 : area.fee;
}

export function validatePromo(
  promo: Promo | undefined,
  segment: Segment,
  subtotal: number,
  nowIso: string,
  isFirstOrder: boolean | undefined,
): { promo: Promo | null; error: string | null } {
  if (!promo) return { promo: null, error: "Kode promo tidak ditemukan." };
  if (!promo.is_active) return { promo: null, error: "Kode promo tidak aktif." };
  if (promo.segment !== "all" && promo.segment !== segment) return { promo: null, error: "Kode promo tidak berlaku untuk akun ini." };
  if (promo.starts_at && nowIso < promo.starts_at) return { promo: null, error: "Promo belum dimulai." };
  if (promo.ends_at && nowIso > promo.ends_at) return { promo: null, error: "Promo sudah berakhir." };
  if (promo.quota !== null && promo.used_count >= promo.quota) return { promo: null, error: "Kuota promo sudah habis." };
  if (subtotal < promo.min_spend) return { promo: null, error: `Minimum belanja promo Rp ${promo.min_spend.toLocaleString("id-ID")}.` };
  if (promo.first_order_only && isFirstOrder === false) return { promo: null, error: "Promo hanya untuk pesanan pertama." };
  return { promo, error: null };
}

export function promoDiscount(promo: Promo | null, subtotal: number, fee: number): { discount: number; feeAfter: number } {
  if (!promo) return { discount: 0, feeAfter: fee };
  if (promo.type === "percent") return { discount: Math.round((subtotal * promo.value) / 100), feeAfter: fee };
  if (promo.type === "fixed") return { discount: Math.min(promo.value, subtotal), feeAfter: fee };
  return { discount: 0, feeAfter: 0 };
}

export function quote(
  ctx: QuoteContext,
  input: { lines: CartLine[]; area_id?: string | null; promo_code?: string | null },
): Quote {
  const segment = segmentOf(ctx.account);
  const errors: string[] = [];
  const lines: Quote["lines"] = [];
  let hasCatch = false;

  for (const l of input.lines) {
    const hit = findVariant(ctx.products, l.variant_id);
    if (!hit) {
      errors.push("Salah satu produk sudah tidak tersedia.");
      continue;
    }
    const { product, variant } = hit;
    if (!product.is_active || !variant.is_active) {
      errors.push(`${product.name} sudah tidak dijual.`);
      continue;
    }
    if (!product.available_today) {
      errors.push(`${product.name} habis hari ini.`);
      continue;
    }
    if (variant.business_only && segment !== "business") {
      errors.push(`${product.name} (${variant.label}) hanya untuk akun bisnis.`);
      continue;
    }
    const q = roundQty(l.qty, variant);
    if (q < variant.min_qty) {
      errors.push(`${product.name}: minimum ${variant.min_qty} ${variant.unit}.`);
      continue;
    }
    if (variant.stock_qty !== null && q > variant.stock_qty) {
      errors.push(`${product.name} (${variant.label}): stok tersisa ${variant.stock_qty} ${variant.unit}.`);
      continue;
    }
    let prep: PrepOption | null = null;
    if (l.prep_option_id) {
      prep = product.prep_options.find((p) => p.id === l.prep_option_id) ?? null;
      if (!prep) errors.push(`${product.name}: opsi penyiapan tidak tersedia.`);
    }
    const price = unitPrice(variant, segment, ctx.account) + (prep?.surcharge ?? 0);
    const lineTotal = Math.round(price * q);
    if (product.is_catch_weight) hasCatch = true;
    lines.push({ key: lineKey(l), product, variant, prep, qty: q, unit_price: price, line_total: lineTotal });
  }

  const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
  const minOrder = segment === "business" ? ctx.settings.min_order_business : ctx.settings.min_order_retail;
  const area = ctx.areas.find((a) => a.id === input.area_id && a.is_active) ?? null;
  const fee = deliveryFee(area, subtotal, segment, ctx.settings);

  let promo: Promo | null = null;
  let promoError: string | null = null;
  if (input.promo_code && input.promo_code.trim()) {
    const code = input.promo_code.trim().toUpperCase();
    const found = ctx.promos.find((p) => p.code.toUpperCase() === code);
    const nowIso = new Date().toISOString();
    const res = validatePromo(found, segment, subtotal, nowIso, ctx.isFirstOrder);
    promo = res.promo;
    promoError = res.error;
  }
  const { discount, feeAfter } = promoDiscount(promo, subtotal, fee);
  const total = Math.max(0, subtotal - discount + feeAfter);

  return {
    segment,
    lines,
    subtotal,
    discount,
    delivery_fee: feeAfter,
    total,
    min_order: minOrder,
    min_order_met: subtotal >= minOrder,
    has_catch_weight: hasCatch,
    promo,
    promo_error: promoError,
    errors,
  };
}

/** Delivery dates a customer may pick right now: from tomorrow (if before cut-off) up to max_days_ahead. */
export function availableDates(settings: Settings, now: { date: string; minutesOfDay: number }): string[] {
  const cutoff = parseTime(settings.cutoff_time);
  const firstOffset = now.minutesOfDay < cutoff ? 1 : 2;
  const dates: string[] = [];
  for (let i = firstOffset; i <= settings.max_days_ahead; i++) dates.push(addDays(now.date, i));
  return dates;
}

export function slotsForSegment(slots: DeliverySlot[], segment: Segment): DeliverySlot[] {
  return slots.filter((s) => s.is_active && (s.segment === "all" || s.segment === segment)).sort((a, b) => a.sort - b.sort);
}

export function minutesToCutoff(settings: Settings, now: { minutesOfDay: number }): number {
  return parseTime(settings.cutoff_time) - now.minutesOfDay;
}
