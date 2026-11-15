// Daily backups run in GitHub Actions (.github/workflows/backup.yml) and report here; the shop only keeps track of
// whether they are happening, and raises the alarm when they stop.
import "server-only";
import type { JobRun } from "./types";
import { getRepo } from "./data";
import { alert } from "./monitor";

/** A backup older than this is treated as missing. */
export const BACKUP_MAX_AGE_HOURS = 36;

export type BackupState = { state: "none" | "ok" | "failed" | "stale"; last: JobRun | null };

export function backupState(jobs: JobRun[]): BackupState {
  const last = jobs.find((j) => j.job === "backup") ?? null;
  if (!last) return { state: "none", last };
  if (last.result.startsWith("GAGAL")) return { state: "failed", last };
  if (Date.now() - Date.parse(last.last_at) > BACKUP_MAX_AGE_HOURS * 3600_000) return { state: "stale", last };
  return { state: "ok", last };
}

/** Called by the background sweep: once backups have been set up, warn (at most twice a day) when they stop. */
export async function checkBackupFreshness(): Promise<void> {
  const repo = await getRepo();
  const s = backupState(await repo.listJobs());
  if (s.state !== "stale") return; // failures alert immediately from the report; "none" means not set up yet
  if (!(await repo.hitRateLimit("alert:backup-stale", 12 * 3600, 1))) return;
  await alert(`Cadangan harian terakhir ${s.last ? new Date(s.last.last_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "-"} WIB: lebih dari ${BACKUP_MAX_AGE_HOURS} jam lalu. Periksa GitHub → Actions → Daily database backup.`);
}
