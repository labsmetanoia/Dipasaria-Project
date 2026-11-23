// Signed links to a restaurant's statement (sent by WhatsApp, opened without signing in). The link names the account
// and an expiry day; the signature uses SESSION_SECRET, so it cannot be forged or pointed at another account.
import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { secret } from "./auth";
import { SITE_URL } from "./config";

const DAY = 86400_000;
const sign = (payload: string) => createHmac("sha256", secret()).update(`statement:${payload}`).digest("base64url").slice(0, 32);

export function statementToken(accountId: string, validDays = 45): string {
  const payload = `${accountId}.${Math.floor(Date.now() / DAY) + validDays}`;
  return `${payload}.${sign(payload)}`;
}

export function statementUrl(accountId: string): string {
  return `${SITE_URL}/tagihan/${statementToken(accountId)}`;
}

/** The account id the token was issued for, or null when it is forged, malformed or expired. */
export function verifyStatementToken(token: string): string | null {
  const m = /^([A-Za-z0-9_-]{1,64})\.(\d{1,8})\.([A-Za-z0-9_-]{32})$/.exec(token);
  if (!m) return null;
  const [, accountId, exp, sig] = m;
  const want = Buffer.from(sign(`${accountId}.${exp}`));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  if (Number(exp) < Math.floor(Date.now() / DAY)) return null;
  return accountId;
}
