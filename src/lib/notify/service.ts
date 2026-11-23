// Automatic WhatsApp messages to customers: each order event is written to an outbox (wa_messages) once, then sent
// through the WhatsApp Cloud API. Without API credentials the message waits in Back-office → Pesan WA, where it can
// be sent by hand with one tap (wa.me with the same text).
import "server-only";
import type { Order, WaKind, WaMessage } from "../types";
import { getRepo } from "../data";
import { newId } from "../ids";
import { reportError } from "../monitor";
import { getGateway } from "../payments/gateway";
import { TEMPLATES, buildParams, render, restockParams } from "./templates";
import { SITE_URL } from "../config";
import { nowJakarta } from "../format";
import { cloudConfigured, sendTemplate } from "./cloud";

export function waApiEnabled(): boolean {
  return cloudConfigured();
}

/** Queue (and try to send) one message for an order event. Never throws. */
export async function notify(orderOrId: Order | string, kind: WaKind, opts: { dedupe?: string; reason?: string; missing?: string[]; decision?: string } = {}): Promise<WaMessage | null> {
  try {
    const repo = await getRepo();
    const order = typeof orderOrId === "string" ? await repo.getOrder(orderOrId) : orderOrId;
    if (!order || order.wa_opt_in === false) return null;
    const settings = await repo.getSettings();
    if (!(settings.wa_events ?? []).includes(kind)) return null;
    const t = TEMPLATES[kind];
    const params = buildParams(kind, order, { settings, gatewayQris: getGateway() !== null, reason: opts.reason, missing: opts.missing, decision: opts.decision });
    const msg = await repo.enqueueWa({
      id: newId("wa"), order_id: order.id, kind, dedupe: opts.dedupe ?? "", phone: order.phone, template: t.name, params,
      body: render(t.body, params), status: cloudConfigured() ? "queued" : "manual",
    });
    if (msg && msg.status === "queued") return await deliver(msg);
    return msg;
  } catch (e) {
    await reportError("action", e, { path: `notify/${kind}` });
    return null;
  }
}

/** Send one queued or failed message through the API and record the result. */
export async function deliver(msg: WaMessage): Promise<WaMessage> {
  const repo = await getRepo();
  // Claim first: a sweep running at the same moment must not send the same message a second time.
  if (!(await repo.claimWa(msg.id, msg.attempts))) return msg;
  const r = await sendTemplate(msg.phone, msg.template, msg.params);
  const attempts = msg.attempts + 1;
  if (r.ok) {
    const patch = { status: "sent" as const, provider_id: r.id, error: null, attempts, sent_at: new Date().toISOString() };
    await repo.updateWa(msg.id, patch);
    return { ...msg, ...patch };
  }
  const patch = { status: "failed" as const, error: r.error.slice(0, 500), attempts: r.retry ? attempts : 3 };
  await repo.updateWa(msg.id, patch);
  if (attempts === 1 || patch.attempts >= 3) await reportError("action", `WhatsApp ${msg.template}: ${r.error}`, { path: "notify/send" });
  return { ...msg, ...patch };
}

/** Retry queued/failed messages (called by the expiry sweep and the cron jobs). */
export async function flushOutbox(limit = 20): Promise<number> {
  if (!cloudConfigured()) return 0;
  const repo = await getRepo();
  let sent = 0;
  for (const m of await repo.listWaPending(limit)) if ((await deliver(m)).status === "sent") sent++;
  return sent;
}

/** Remind customers whose payment deadline is near (once per order). */
export async function sweepReminders(minutes = 30): Promise<void> {
  const repo = await getRepo();
  for (const o of await repo.listOrdersPayBySoon(minutes)) await notify(o, "reminder");
}

/**
 * "Kabari saya": tell everyone waiting for this product that it is available again. Each waiting customer is taken
 * off the list in the same step, so they are told once. Never throws.
 */
export async function notifyRestock(product: { id: string; name: string; slug: string }): Promise<number> {
  try {
    const repo = await getRepo();
    const settings = await repo.getSettings();
    if (!(settings.wa_events ?? []).includes("restock")) return 0;
    const phones = await repo.takeStockAlerts(product.id);
    const t = TEMPLATES.restock;
    const params = restockParams(product.name, `${SITE_URL}/belanja/produk/${product.slug}`);
    for (const phone of phones) {
      const msg = await repo.enqueueWa({
        id: newId("wa"), order_id: null, kind: "restock", dedupe: `${product.id}:${phone}:${nowJakarta().date}`, phone, template: t.name, params,
        body: render(t.body, params), status: cloudConfigured() ? "queued" : "manual",
      });
      if (msg && msg.status === "queued") await deliver(msg);
    }
    return phones.length;
  } catch (e) {
    await reportError("action", e, { path: "notify/restock" });
    return 0;
  }
}
