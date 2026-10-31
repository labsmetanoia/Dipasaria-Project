import { randomBytes, randomUUID } from "crypto";

export function newId(prefix = ""): string {
  return prefix ? `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 12)}` : randomUUID();
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

export function randomCode(len = 6): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

/** Order code like DP-261101-K7M2 (prefix, delivery date, 4 chars). */
export function orderCode(deliveryDate: string): string {
  const d = deliveryDate.replace(/-/g, "").slice(2);
  return `DP-${d}-${randomCode(4)}`;
}

export function sessionToken(): string {
  return randomBytes(32).toString("base64url");
}
