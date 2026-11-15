// Automatic cancellation of unpaid household orders (see expire_unpaid_orders in schema.sql).
// Hosting plans that run cron only daily cannot do this every few minutes, so it also runs lazily:
// on checkout (frees slots and stock for the next customer), order lookups and back-office visits.
import { getRepo } from "./data";
import { reportError } from "./monitor";
import { flushOutbox, notify, sweepReminders } from "./notify/service";
import { checkBackupFreshness } from "./backup";

let lastRun = 0;

/** Run the expiry at most once a minute per server instance (or now, with force). Never throws. */
export async function expireIfDue(force = false): Promise<number> {
  if (!force && Date.now() - lastRun < 60_000) return 0;
  lastRun = Date.now();
  let n = 0;
  try {
    const repo = await getRepo();
    const due = await repo.listOrdersPastPayBy();
    n = await repo.expireUnpaidOrders();
    for (const o of due) {
      const now = await repo.getOrder(o.id);
      if (now?.status === "cancelled") await notify(now, "cancelled", { reason: "pembayaran belum kami terima sampai batas waktu" });
    }
    await sweepReminders(30);
    await flushOutbox(20);
    await checkBackupFreshness();
  } catch (e) {
    await reportError("job", e, { path: "expire_unpaid_orders" });
  }
  return n;
}
