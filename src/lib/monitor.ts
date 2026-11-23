// Error monitoring without a paid service: errors are grouped in the database (error_events), shown on
// /admin/sistem, and a new error can be pushed to a chat via ALERT_WEBHOOK_URL (Telegram, Slack or Discord).
import { getRepo } from "./data";
import { SITE_URL } from "./config";
import type { AppError } from "./types";

/** Strip order codes, ids and query strings so one bug on many orders is one entry, not hundreds. */
export function normalizePath(path: string | undefined | null): string {
  if (!path) return "";
  return path
    .split("?")[0]
    .replace(/DP-\d{6}-[A-Z0-9]{4}/gi, ":code")
    .replace(/\/(o|oi|ba|so|sr|p|v)_[A-Za-z0-9]+/g, "/:id")
    .slice(0, 300);
}

/** Record an error. Never throws: monitoring must not break the request it is reporting on. */
export async function reportError(source: AppError["source"], err: unknown, ctx: { path?: string; digest?: string | null; detail?: string | null } = {}): Promise<void> {
  const message = (err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err ?? "unknown")).slice(0, 1000) || "Unknown error";
  const path = normalizePath(ctx.path);
  const detail = ctx.detail ?? (err instanceof Error ? err.stack?.slice(0, 3000) ?? null : null);
  console.error(`[${source}] ${message}${path ? ` (${path})` : ""}`);
  try {
    const repo = await getRepo();
    const count = await repo.logError({ source, message, path, digest: ctx.digest ?? null, detail });
    // Alert on the first occurrence, then again at 10 and 100 so a flood is visible without spamming the phone.
    // Browser reports carry text anyone can send, so they are logged but never pushed to the owner's chat.
    if (source !== "client" && (count === 1 || count === 10 || count === 100)) await alert(`${count === 1 ? "Error baru" : `Error terulang ${count}×`} (${source}): ${message}${path ? `\nHalaman: ${path}` : ""}\n${SITE_URL}/admin/sistem`);
  } catch (e) {
    console.error("[monitor] could not record error:", e instanceof Error ? e.message : e);
  }
}

/** Send a short text to ALERT_WEBHOOK_URL (JSON with both `text` and `content`, so Telegram, Slack and Discord all accept it). */
export async function alert(text: string): Promise<void> {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url || !/^https:\/\//.test(url)) return;
  try {
    const repo = await getRepo();
    if (!(await repo.hitRateLimit("alert:webhook", 3600, 30))) return;
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: `Dipasaria · ${text}`, content: `Dipasaria · ${text}` }),
      signal: AbortSignal.timeout(4000),
    });
  } catch (e) {
    console.error("[monitor] alert failed:", e instanceof Error ? e.message : e);
  }
}
