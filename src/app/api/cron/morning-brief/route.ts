// Scheduled job: the owner's morning brief. Vercel Cron calls this daily at 19:00 UTC (02:00 WIB, before the auction)
// with "Authorization: Bearer $CRON_SECRET"; the brief goes to ALERT_WEBHOOK_URL (Telegram, Slack or Discord).
import { NextResponse } from "next/server";
import { getRepo } from "@/lib/data";
import { nowJakarta } from "@/lib/format";
import { buildBrief } from "@/lib/brief";
import { expireIfDue } from "@/lib/expiry";
import { alert, reportError } from "@/lib/monitor";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const date = url.searchParams.get("date") ?? nowJakarta().date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "invalid date" }, { status: 400 });
  try {
    await expireIfDue("force"); // unpaid orders past their deadline must not appear in the buying list
    const repo = await getRepo();
    const brief = await buildBrief(repo, date);
    const sent = Boolean(process.env.ALERT_WEBHOOK_URL);
    if (sent) await alert(brief.text);
    try { await repo.recordJob("morning_brief", `${date}: ${sent ? "terkirim" : "ALERT_WEBHOOK_URL belum diatur"}, ${brief.attention} hal perlu perhatian`); } catch { /* informational */ }
    return NextResponse.json({ date, sent, attention: brief.attention, text: brief.text });
  } catch (e) {
    await reportError("job", e, { path: "/api/cron/morning-brief" });
    return NextResponse.json({ error: "brief failed" }, { status: 500 });
  }
}
