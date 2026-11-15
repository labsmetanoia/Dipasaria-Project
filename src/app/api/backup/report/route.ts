// The nightly backup workflow (GitHub Actions) reports its result here, so Back-office → Sistem shows when the last
// verified backup ran and the owner is alerted when one fails. Authenticated with CRON_SECRET.
import { NextResponse } from "next/server";
import { getRepo } from "@/lib/data";
import { alert, reportError } from "@/lib/monitor";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let b: { ok?: unknown; size?: unknown; counts?: unknown; verified?: unknown; run_url?: unknown; error?: unknown };
  try { b = await req.json(); } catch { return NextResponse.json({ error: "bad request" }, { status: 400 }); }
  const str = (v: unknown, n = 40) => (typeof v === "string" ? v.replace(/[^\w .,:/\-+()]/g, "").slice(0, n) : "");
  const run = typeof b.run_url === "string" && b.run_url.startsWith("https://github.com/") ? b.run_url.slice(0, 200) : "";
  const orders = b.counts && typeof b.counts === "object" && Number.isFinite(Number((b.counts as Record<string, unknown>).orders)) ? Number((b.counts as Record<string, unknown>).orders) : null;
  const result = b.ok === true
    ? `OK · ${str(b.size, 12) || "?"}${orders !== null ? ` · ${orders} pesanan` : ""}${b.verified === true ? " · terverifikasi" : ""}`
    : `GAGAL${str(b.error, 120) ? ` · ${str(b.error, 120)}` : ""}${run ? ` · ${run}` : ""}`;
  const repo = await getRepo();
  await repo.recordJob("backup", result);
  if (b.ok !== true) {
    await reportError("job", "Cadangan harian gagal", { path: "/api/backup/report", detail: result });
    await alert(`Cadangan harian GAGAL. Lihat ${run || "GitHub → Actions → Daily database backup"}`);
  }
  return NextResponse.json({ ok: true, recorded: result });
}
