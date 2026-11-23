// Order rules shared by the in-memory adapter and the back-office UI. The SQL functions in supabase/schema.sql
// enforce the same rules in production; scripts/sql-tests.sql covers them.
import type { Order, OrderStatus, PaymentStatus } from "./types";

export const FLOW: OrderStatus[] = ["new", "confirmed", "packing", "delivering", "completed"];
export const TEXT_LIMITS = { name: 80, address: 400, note: 400 } as const;

/** Why a status change is not allowed, or null when it is. Orders only move forward; cancel only before dispatch. */
export function statusChangeError(o: Pick<Order, "status" | "has_catch_weight" | "total_final">, to: OrderStatus): string | null {
  if (o.status === "cancelled") return "Pesanan ini sudah dibatalkan.";
  if (to === o.status) return null;
  if (to === "cancelled") {
    return o.status === "delivering" || o.status === "completed"
      ? "Pesanan yang sudah dikirim tidak dapat dibatalkan. Catat retur atau pengembalian dana di catatan internal."
      : null;
  }
  if (FLOW.indexOf(to) < FLOW.indexOf(o.status)) return "Status pesanan tidak dapat dimundurkan.";
  if ((to === "delivering" || to === "completed") && o.has_catch_weight && o.total_final === null) return "Timbang pesanan ini terlebih dahulu.";
  return null;
}

/** Statuses an admin may move this order to next (for showing only valid buttons). */
export function nextStatuses(o: Pick<Order, "status" | "has_catch_weight" | "total_final">): OrderStatus[] {
  return ([...FLOW, "cancelled"] as OrderStatus[]).filter((s) => s !== o.status && statusChangeError(o, s) === null);
}

export function paymentChangeError(o: Pick<Order, "status" | "payment_status" | "has_catch_weight" | "total_final">, to: PaymentStatus): string | null {
  if (o.status === "cancelled" && !(o.payment_status === "refund_due" && to === "void")) {
    return 'Pesanan dibatalkan: status pembayaran hanya dapat diubah dari "perlu pengembalian dana" menjadi "dibatalkan" setelah dana dikembalikan.';
  }
  if (to === "paid" && o.has_catch_weight && o.total_final === null) return "Timbang pesanan terlebih dahulu sebelum menandai lunas, agar jumlah yang dibayar sesuai tagihan akhir.";
  return null;
}

export function weighError(o: Pick<Order, "status" | "payment_status">): string | null {
  if (o.status === "cancelled" || o.status === "completed") return "Pesanan yang sudah selesai atau dibatalkan tidak dapat ditimbang ulang.";
  if (o.payment_status === "paid") return "Pesanan sudah lunas. Batalkan status lunas terlebih dahulu bila perlu menimbang ulang.";
  if (o.payment_status === "awaiting_confirmation") return "Pelanggan sudah melaporkan pembayaran untuk tagihan ini. Periksa dananya dulu: tandai lunas, atau ubah ke belum dibayar sebelum menimbang ulang.";
  return null;
}

/** Parse a weight typed by staff: accepts "1,25" or "1.25"; returns null when empty or not a sensible number. */
export function parseWeight(v: string): number | null {
  const s = v.trim().replace(",", ".");
  if (!s || !/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 500 ? n : null;
}

/** Keep only Google Maps links (they are shown to the courier as a clickable link). */
export function safeMapsUrl(url: string | null | undefined): string | null {
  const u = (url ?? "").trim();
  if (!u || u.length > 300) return null;
  return /^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)\//i.test(u) ? u : null;
}
