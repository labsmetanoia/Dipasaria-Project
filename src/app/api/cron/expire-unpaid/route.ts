// Cancels household orders that were not paid in time (see expire_unpaid_orders in schema.sql).
// Call it every 10–15 minutes from any scheduler with "Authorization: Bearer $CRON_SECRET" (for example
// cron-job.org, or pg_cron inside Supabase). The app also runs the expiry on checkout and back-office visits.
import { NextResponse } from "next/server";
import { expireIfDue } from "@/lib/expiry";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const cancelled = await expireIfDue(true);
  return NextResponse.json({ cancelled });
}
