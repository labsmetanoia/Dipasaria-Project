// Restaurant sales kit: quotations and tax-invoice details. Acceptance itself is enforced by accept_quote in
// supabase/schema.sql; this file holds the checks shared by the back-office, the demo adapter and the quote page.
import type { Product, Quotation, QuotationLine } from "./types";
import { addDays } from "./format";

/** NPWP digits only (15 for the old format, 16 for the NIK-based number), or null when empty. */
export function cleanNpwp(raw: string | null | undefined): string | null {
  const d = String(raw ?? "").replace(/\D/g, "");
  return d ? d : null;
}

export function npwpError(raw: string | null | undefined): string | null {
  const d = cleanNpwp(raw);
  return d && !/^\d{15,16}$/.test(d) ? "NPWP harus 15 atau 16 angka." : null;
}

/** 01.234.567.8-901.000 for the 15-digit format; 16 digits in groups of four. */
export function formatNpwp(raw: string | null | undefined): string {
  const d = cleanNpwp(raw) ?? "";
  if (d.length === 15) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}.${d.slice(8, 9)}-${d.slice(9, 12)}.${d.slice(12)}`;
  if (d.length === 16) return d.replace(/(\d{4})(?=\d)/g, "$1 ");
  return d;
}

export type QuoteState = Quotation["status"] | "expired";

/** A sent quotation past its acceptance day reads as expired. */
export function quoteState(q: Pick<Quotation, "status" | "valid_until">, today: string): QuoteState {
  return q.status === "sent" && today > q.valid_until ? "expired" : q.status;
}

export const QUOTE_STATE_LABEL: Record<QuoteState, string> = { draft: "Draf", sent: "Terkirim", accepted: "Diterima", declined: "Ditolak", expired: "Kedaluwarsa" };

export function quoteCode(today: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = "";
  for (let i = 0; i < 4; i++) r += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `PN-${today.slice(2, 4)}${today.slice(5, 7)}-${r}`;
}

type QuoteDraft = Pick<Quotation, "business_name" | "phone" | "account_id" | "npwp" | "lines" | "valid_until" | "price_from" | "price_to" | "note">;

/** What is wrong with a quotation before it is saved (null when it can be saved). */
export function quoteError(q: QuoteDraft, products: Product[], today: string): string | null {
  if (q.business_name.trim().length < 2 || q.business_name.length > 120) return "Nama usaha: 2–120 karakter.";
  if (!q.account_id && !/^62\d{8,13}$/.test(String(q.phone).replace(/\D/g, "").replace(/^0/, "62"))) return "Nomor WhatsApp calon pelanggan tidak valid.";
  const n = npwpError(q.npwp);
  if (n) return n;
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(q.valid_until) || !iso.test(q.price_from) || (q.price_to !== null && !iso.test(q.price_to))) return "Lengkapi tanggal penawaran.";
  if (q.valid_until < today) return "Batas penerimaan tidak boleh sebelum hari ini.";
  if (q.valid_until > addDays(today, 90)) return "Batas penerimaan paling lama 90 hari.";
  if (q.price_to !== null && q.price_to < q.price_from) return "Akhir masa harga tidak boleh sebelum awalnya.";
  if (!q.lines.length) return "Tambahkan minimal satu produk.";
  if (q.lines.length > 60) return "Paling banyak 60 baris.";
  const seen = new Set<string>();
  for (const l of q.lines) {
    const p = products.find((x) => x.variants.some((v) => v.id === l.variant_id));
    if (!p) return "Salah satu produk sudah tidak tersedia.";
    if (seen.has(l.variant_id)) return `${p.name}: ukuran yang sama tercantum dua kali.`;
    seen.add(l.variant_id);
    if (!Number.isFinite(l.price) || l.price <= 0 || l.price !== Math.round(l.price) || l.price > 100_000_000) return `${p.name}: harga tidak valid.`;
    if (String(l.note ?? "").length > 120) return `${p.name}: catatan maksimal 120 karakter.`;
  }
  if (q.note.length > 1500) return "Catatan penawaran maksimal 1.500 karakter.";
  return null;
}

/** Lines in catalogue order with their product and size, for documents. */
export function resolveQuoteLines(lines: QuotationLine[], products: Product[]) {
  return lines.flatMap((l) => {
    const p = products.find((x) => x.variants.some((v) => v.id === l.variant_id));
    const v = p?.variants.find((x) => x.id === l.variant_id);
    return p && v ? [{ ...l, product: p, variant: v }] : [];
  });
}
