// Anonymous funnel counter. The browser reports a step at most once per visit (it remembers that in its own session
// storage); the server adds one to today's counter. Nothing about the visitor is stored: no id, no IP, no cookie.
import { NextResponse } from "next/server";
import { getRepo } from "@/lib/data";
import { isAdmin } from "@/lib/auth";
import { allow, clientIp } from "@/lib/guard";
import type { FunnelEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

// Every step is reported by the browser, so all five are counted the same way (same visits, same exclusions).
// The numbers guide decisions; sales themselves are always read from the orders, never from these counters.
const FROM_BROWSER: FunnelEvent[] = ["visit", "product_view", "add_to_cart", "checkout_start", "order_placed"];
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|curl|wget|python|scrapy|facebookexternalhit|whatsapp/i;

export async function POST(req: Request) {
  const done = new NextResponse(null, { status: 204 });
  try {
    if (BOT.test(req.headers.get("user-agent") ?? "") || (await isAdmin())) return done; // crawlers and the owner's own visits are not customers
    const body = (await req.json().catch(() => null)) as { e?: unknown; p?: unknown } | null;
    const event = FROM_BROWSER.find((e) => e === body?.e);
    if (!event) return done;
    if (!(await allow("track", await clientIp()))) return done;
    const repo = await getRepo();
    let productId = "";
    if (typeof body?.p === "string" && body.p && (event === "product_view" || event === "add_to_cart")) {
      if (!(await repo.getProducts()).some((p) => p.id === body.p)) return done; // only real products get a counter
      productId = body.p;
    }
    await repo.trackEvent(event, productId);
  } catch { /* counting must never break a page */ }
  return done;
}
