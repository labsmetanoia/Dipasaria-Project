// Automatic cancellation of unpaid household orders (see expire_unpaid_orders in schema.sql), plus the follow-up work
// that rides along: payment reminders, retrying WhatsApp messages and the backup freshness check.
// Hosting plans that run cron only daily cannot do this every few minutes, so it also runs lazily on traffic.
import { after } from "next/server";
import { getRepo } from "./data";
import { reportError } from "./monitor";
import { flushOutbox, notify, sweepReminders } from "./notify/service";
import { cancelOpenAtGateway, syncPayment } from "./payments/service";
import { checkBackupFreshness } from "./backup";
import type { Payment } from "./types";

let lastRun = 0;
const REASON = "pembayaran belum kami terima sampai batas waktu";

async function job(): Promise<number> {
  const repo = await getRepo();
  // A payment may have arrived while its notification was lost: ask the gateway before cancelling anything.
  const due = await repo.listOrdersPastPayBy();
  const open: Payment[] = [];
  for (const o of due) {
    for (const p of await repo.listPayments(o.id)) {
      if (p.status !== "pending") continue;
      await syncPayment(p, true);
      open.push(p);
    }
  }
  const n = await repo.expireUnpaidOrders();
  // QR codes of orders that were just cancelled must not stay payable at the gateway.
  await cancelOpenAtGateway(open);
  // Tell customers once, also for orders cancelled by the database scheduler (pg_cron); the outbox prevents repeats.
  for (const o of await repo.listOrdersAutoCancelled(24)) await notify(o, "cancelled", { reason: REASON });
  await sweepReminders(30);
  await flushOutbox(20);
  await checkBackupFreshness();
  return n;
}

async function safeJob(): Promise<number> {
  try {
    return await job();
  } catch (e) {
    await reportError("job", e, { path: "expire_unpaid_orders" });
    return 0;
  }
}

/**
 * - "background" (checkout, order pages): at most once a minute per server instance, after the response is sent,
 *   so a slow WhatsApp or payment API never slows a customer down.
 * - "wait" (back-office pages): at most once a minute, finished before the page renders, so the buying list is current.
 * - "force" (cron endpoints, "run now"): always, finished before returning. Returns the number of orders cancelled.
 */
export async function expireIfDue(mode: "background" | "wait" | "force" = "background"): Promise<number> {
  if (mode !== "force" && Date.now() - lastRun < 60_000) return 0;
  lastRun = Date.now();
  if (mode !== "background") return safeJob();
  try {
    after(safeJob);
  } catch {
    void safeJob(); // outside a request (should not happen): run without blocking
  }
  return 0;
}
