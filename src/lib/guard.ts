// Protection for public endpoints (server actions are callable by anyone): per-IP and per-phone rate limits,
// plus an optional Cloudflare Turnstile check when TURNSTILE_SECRET_KEY and TURNSTILE_SITE_KEY are set.
import { headers } from "next/headers";
import { getRepo } from "./data";
import { reportError } from "./monitor";

/** The visitor's IP as set by the hosting proxy (Vercel sets x-real-ip and x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip && ip.length <= 64 ? ip : "local";
}

/** Limits are generous for real customers (a family orders once or twice a day) and tight for scripts. */
export const LIMITS = {
  order: { windowSeconds: 3600, max: 10 }, // per IP: orders placed
  orderPhone: { windowSeconds: 86400, max: 6 }, // per phone number, households only
  login: { windowSeconds: 900, max: 20 }, // per IP, on top of the 5-per-phone lockout
  apply: { windowSeconds: 3600, max: 5 }, // per IP: business account applications
  quotePhone: { windowSeconds: 600, max: 40 }, // per IP: quotes that check a phone's first-order status
  lookup: { windowSeconds: 600, max: 60 }, // per IP: order lookups, "I have paid", issuing a QR
  paymentPoll: { windowSeconds: 600, max: 400 }, // per IP: payment status polling while a QR is on screen
  clientError: { windowSeconds: 600, max: 30 }, // per IP: browser error reports
} as const;

export const TOO_MANY = "Terlalu banyak percobaan dari perangkat ini. Coba lagi beberapa menit lagi, atau pesan melalui WhatsApp.";
export const NOT_HUMAN = "Verifikasi keamanan belum selesai. Tunggu hingga kotak verifikasi menampilkan tanda centang, lalu coba lagi.";

/** Count a hit; false when the limit is reached. If the counter itself fails, let the customer through (and log it). */
export async function allow(name: keyof typeof LIMITS, id: string): Promise<boolean> {
  const l = LIMITS[name];
  try {
    return await (await getRepo()).hitRateLimit(`${name}:${id}`.slice(0, 200), l.windowSeconds, l.max);
  } catch (e) {
    await reportError("action", e, { path: `rate-limit/${name}` });
    return true;
  }
}

export function turnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.TURNSTILE_SITE_KEY);
}

/**
 * Verify a Turnstile token with Cloudflare. Without keys configured this is a no-op (rate limits still apply).
 * If Cloudflare cannot be reached the request is allowed and the outage is logged: a checkout must not depend on a third party being up.
 */
export async function verifyHuman(token: string | null | undefined, ip: string): Promise<boolean> {
  if (!turnstileEnabled()) return true;
  if (!token || typeof token !== "string" || token.length > 4096) return false;
  try {
    const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token });
    if (ip !== "local") body.set("remoteip", ip);
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: AbortSignal.timeout(5000) });
    const j = (await r.json()) as { success?: boolean };
    return j.success === true;
  } catch (e) {
    await reportError("action", e, { path: "turnstile/siteverify" });
    return true;
  }
}
