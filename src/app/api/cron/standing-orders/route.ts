// Scheduled job: turns tomorrow's standing orders into real orders.
// Vercel Cron calls this daily at 12:45 UTC (19:45 WIB, before the 20:00 cut-off) with "Authorization: Bearer $CRON_SECRET".
import { NextResponse } from "next/server";
import { getRepo } from "@/lib/data";
import { nowJakarta } from "@/lib/format";
import { jakartaTomorrow, runStandingOrders } from "@/lib/standing";
import { expireIfDue } from "@/lib/expiry";
import { reportError } from "@/lib/monitor";
import { notify } from "@/lib/notify/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const repo = await getRepo();
  const url = new URL(req.url);
  // Always prepare tomorrow's deliveries. If the job runs after the cut-off, place_order refuses and the run is
  // recorded as failed (visible and retryable in the back-office) instead of silently targeting a later day.
  const date = url.searchParams.get("date") ?? jakartaTomorrow(nowJakarta());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "invalid date" }, { status: 400 });
  await expireIfDue(true);
  const results = await runStandingOrders(repo, date);
  for (const r of results) if (r.status === "placed" && r.order_id) await notify(r.order_id, "standing", { missing: r.missing });
  for (const r of results.filter((x) => x.status === "failed")) await reportError("job", `Pesanan rutin gagal: ${r.account_name}: ${r.error}`, { path: "/api/cron/standing-orders" });
  return NextResponse.json({
    date,
    placed: results.filter((r) => r.status === "placed").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  });
}
