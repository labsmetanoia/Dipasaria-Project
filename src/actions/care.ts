"use server";
// Customer care: freshness-guarantee reports and "Kabari saya" back-in-stock requests.
import { getRepo } from "@/lib/data";
import { allow, clientIp, TOO_MANY } from "@/lib/guard";
import { isValidPhone } from "@/lib/format";
import { alert, reportError } from "@/lib/monitor";
import { getCurrentCustomer } from "@/lib/customer";
import { CLAIM_WINDOW_HOURS, RATING_WINDOW_DAYS } from "@/lib/config";
import type { ClaimReason } from "@/lib/types";

type R<T> = { ok: true; data: T } | { ok: false; error: string };
const REASONS: ClaimReason[] = ["not_fresh", "wrong_item", "short_weight", "damaged", "missing", "other"];

/** Report a problem with delivered items (photos are JPEGs compressed in the browser, at most 3). */
export async function createClaimAction(code: string, phone: string, input: { item_ids: string[]; reason: ClaimReason; note: string; photos: string[] }): Promise<R<string>> {
  if (!(await allow("claim", await clientIp()))) return { ok: false, error: TOO_MANY };
  if (typeof code !== "string" || typeof phone !== "string" || !input || !Array.isArray(input.item_ids) || !Array.isArray(input.photos)) return { ok: false, error: "Laporan tidak lengkap." };
  if (!REASONS.includes(input.reason)) return { ok: false, error: "Pilih alasan laporan." };
  const photos = input.photos.slice(0, 3);
  if (photos.some((p) => typeof p !== "string" || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p) || p.length > 800_000)) return { ok: false, error: "Foto tidak dapat dibaca. Coba foto lain." };
  const repo = await getRepo();
  const order = await repo.lookupOrder(code, phone);
  if (!order) return { ok: false, error: "Pesanan tidak ditemukan." };
  const items = input.item_ids.slice(0, 40).map(String).map((id) => ({ item_id: id, product_name: order.items.find((i) => i.id === id)?.product_name }));
  const r = await repo.createClaim(code, phone, { items, reason: input.reason, note: String(input.note ?? "").slice(0, 500), photos }, CLAIM_WINDOW_HOURS);
  if (!r.ok) return r;
  try { await alert(`Laporan garansi baru untuk ${order.code} (${order.customer_name}). Putuskan di /admin/garansi`); } catch (e) { await reportError("action", e, { path: "claim/alert" }); }
  return r;
}

/**
 * Rate a delivered order: 1-5 stars overall, optional stars per item and a comment. Only the customer who placed the
 * order can rate it (order code + phone), once. A low rating reaches the owner at once.
 */
export async function rateOrderAction(code: string, phone: string, input: { stars: number; comment: string; items: Array<{ item_id: string; stars: number }> }): Promise<R<{ stars: number }>> {
  if (!(await allow("claim", await clientIp()))) return { ok: false, error: TOO_MANY };
  const stars = Math.round(Number(input?.stars));
  if (typeof code !== "string" || typeof phone !== "string" || !Number.isFinite(stars) || stars < 1 || stars > 5) return { ok: false, error: "Pilih 1 sampai 5 bintang." };
  const items = (Array.isArray(input.items) ? input.items : []).slice(0, 40).map((i) => ({ item_id: String(i?.item_id ?? ""), stars: Math.round(Number(i?.stars)) }));
  if (items.some((i) => !i.item_id || !(i.stars >= 1 && i.stars <= 5))) return { ok: false, error: "Penilaian produk tidak valid." };
  const comment = String(input.comment ?? "").trim().slice(0, 500);
  const repo = await getRepo();
  const r = await repo.createRating(code, phone, { stars, comment, items }, RATING_WINDOW_DAYS);
  if (!r.ok) return r;
  if (stars <= 2) {
    try {
      const order = await repo.lookupOrder(code, phone);
      await alert(`Penilaian rendah (${stars} dari 5) untuk ${order?.code ?? code} (${order?.customer_name ?? "pelanggan"})${comment ? `: “${comment.slice(0, 200)}”` : ""}. Lihat /admin/laporan`);
    } catch (e) { await reportError("action", e, { path: "rating/alert" }); }
  }
  return { ok: true, data: { stars } };
}

/** "Kabari saya": one WhatsApp message when a sold-out product is available again. */
export async function stockAlertAction(productId: string, phone?: string): Promise<R<null>> {
  if (!(await allow("stockAlert", await clientIp()))) return { ok: false, error: TOO_MANY };
  const customer = await getCurrentCustomer();
  const p = customer?.phone ?? (typeof phone === "string" ? phone : "");
  if (!isValidPhone(p)) return { ok: false, error: "Nomor WhatsApp tidak valid." };
  const repo = await getRepo();
  const product = (await repo.getProducts()).find((x) => x.id === productId);
  if (!product) return { ok: false, error: "Produk tidak ditemukan." };
  await repo.addStockAlert(product.id, p);
  return { ok: true, data: null };
}
