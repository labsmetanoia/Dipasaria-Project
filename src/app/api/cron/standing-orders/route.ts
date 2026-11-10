// Scheduled job: turns tomorrow's standing orders into real orders.
// Vercel Cron calls this daily at 12:45 UTC (19:45 WIB, before the 20:00 cut-off) with "Authorization: Bearer $CRON_SECRET".
import { NextResponse } from "next/server";
import { getRepo } from "@/lib/data";
import { availableDates } from "@/lib/pricing";
import { nowJakarta } from "@/lib/format";
import { runStandingOrders } from "@/lib/standing";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const repo = await getRepo();
  const settings = await repo.getSettings();
  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? availableDates(settings, nowJakarta())[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "invalid date" }, { status: 400 });
  const results = await runStandingOrders(repo, date);
  return NextResponse.json({
    date,
    placed: results.filter((r) => r.status === "placed").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  });
}
