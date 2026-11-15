// Automatic cancellation of unpaid household orders (see expire_unpaid_orders in schema.sql).
// Hosting plans that run cron only daily cannot do this every few minutes, so it also runs lazily:
// on checkout (frees slots and stock for the next customer), order lookups and back-office visits.
import { getRepo } from "./data";
import { reportError } from "./monitor";

let lastRun = 0;

/** Run the expiry at most once a minute per server instance (or now, with force). Never throws. */
export async function expireIfDue(force = false): Promise<number> {
  if (!force && Date.now() - lastRun < 60_000) return 0;
  lastRun = Date.now();
  try {
    return await (await getRepo()).expireUnpaidOrders();
  } catch (e) {
    await reportError("job", e, { path: "expire_unpaid_orders" });
    return 0;
  }
}
