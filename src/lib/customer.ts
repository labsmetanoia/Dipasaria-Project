// Household customer sessions. Login proves the customer holds the phone number (one-time code on WhatsApp);
// the database only ever sees hashes of codes and session tokens.
import "server-only";
import { cookies } from "next/headers";
import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import { getRepo, isDemoMode } from "./data";
import { secret } from "./auth";
import { cloudConfigured } from "./notify/cloud";
import type { Customer } from "./types";

const COOKIE = "dp_cust";
const NINETY_DAYS = 90 * 24 * 3600;

export const codeHash = (phone: string, code: string) => createHmac("sha256", secret()).update(`otp:${phone}:${code}`).digest("hex");
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");
export const newToken = () => randomBytes(32).toString("base64url");

/** How login codes reach the customer: WhatsApp (Cloud API), shown on screen in demo mode, or not available. */
export function otpChannel(): "whatsapp" | "demo" | null {
  if (cloudConfigured()) return "whatsapp";
  if (isDemoMode()) return "demo";
  return null;
}

export async function getCurrentCustomer(): Promise<Customer | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length > 100) return null;
  return (await getRepo()).getCustomerBySession(tokenHash(token));
}

export async function setCustomerSession(token: string) {
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: NINETY_DAYS });
}

export async function clearCustomerSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await (await getRepo()).endCustomerSession(tokenHash(token)).catch(() => undefined);
  jar.delete(COOKIE);
}
