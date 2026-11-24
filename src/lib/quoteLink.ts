// Signed link to a quotation (sent by WhatsApp to a prospect or a restaurant, opened without signing in). The
// signature uses SESSION_SECRET, so the link cannot be forged or pointed at another quotation. How long it can be
// accepted is decided by the quotation's own acceptance day, checked again in the database.
import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { secret } from "./auth";
import { SITE_URL } from "./config";

const sign = (id: string) => createHmac("sha256", secret()).update(`quote:${id}`).digest("base64url").slice(0, 32);

export function quoteToken(id: string): string {
  return `${id}.${sign(id)}`;
}

export function quoteUrl(id: string): string {
  return `${SITE_URL}/penawaran/${quoteToken(id)}`;
}

/** The quotation id the token was issued for, or null when it is forged or malformed. */
export function verifyQuoteToken(token: string): string | null {
  const m = /^([A-Za-z0-9_-]{1,64})\.([A-Za-z0-9_-]{32})$/.exec(token);
  if (!m) return null;
  const want = Buffer.from(sign(m[1]));
  const got = Buffer.from(m[2]);
  return want.length === got.length && timingSafeEqual(want, got) ? m[1] : null;
}
