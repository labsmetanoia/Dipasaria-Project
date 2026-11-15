// Health check for an uptime monitor (for example UptimeRobot, free): 200 when the app and the database answer.
// It reveals nothing beyond up/down.
import { NextResponse } from "next/server";
import { getRepo } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  let db = false;
  try {
    db = await (await getRepo()).ping();
  } catch {
    db = false;
  }
  return NextResponse.json({ ok: db, db, ms: Date.now() - started }, { status: db ? 200 : 503, headers: { "cache-control": "no-store" } });
}
