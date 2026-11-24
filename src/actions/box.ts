"use server";
// Household weekly boxes ("Kotak mingguan"): a signed-in household subscribes to a box of its own items, delivered
// every week or every second week. The evening job (src/lib/standing.ts) turns each box into a normal order.
import { revalidatePath } from "next/cache";
import { everyday } from "@/lib/campaigns";
import { getRepo } from "@/lib/data";
import { getCurrentCustomer } from "@/lib/customer";
import { allow, clientIp, TOO_MANY } from "@/lib/guard";
import { nowJakarta } from "@/lib/format";
import { availableDates } from "@/lib/pricing";
import { MAX_BOXES, boxSkippable, upcomingDates, validateBox } from "@/lib/standing";
import type { BoxInput, Order, StandingOrder } from "@/lib/types";

type R<T> = { ok: true; data: T } | { ok: false; error: string };
const SIGN_IN = "Silakan masuk kembali.";
const NOT_FOUND = "Kotak mingguan tidak ditemukan.";

async function ownBox(id: string, customerId: string) {
  return (await (await getRepo()).listStandingOrders({ customerId })).find((s) => s.id === id) ?? null;
}

export async function saveBoxAction(input: BoxInput): Promise<R<StandingOrder>> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: SIGN_IN };
  const repo = await getRepo();
  const mine = await repo.listStandingOrders({ customerId: customer.id });
  const existing = input?.id ? mine.find((s) => s.id === input.id) : null;
  if (input?.id && !existing) return { ok: false, error: NOT_FOUND };
  if (!existing && mine.length >= MAX_BOXES) return { ok: false, error: `Maksimal ${MAX_BOXES} kotak mingguan per akun.` };
  const [addresses, products, slots, areas, settings] = await Promise.all([repo.listAddresses(customer.id), repo.getProducts().then(everyday), repo.getSlots(), repo.getAreas(), repo.getSettings()]);
  // keep only what is validated: one real weekday, positive quantities, short texts
  const clean: BoxInput = {
    id: existing?.id,
    name: String(input?.name ?? "").trim().slice(0, 60) || "Kotak mingguan",
    weekdays: [...new Set((Array.isArray(input?.weekdays) ? input.weekdays : []).map(Number))].filter((d) => d >= 1 && d <= 7),
    slot_id: String(input?.slot_id ?? ""),
    payment_method: input?.payment_method,
    lines: (Array.isArray(input?.lines) ? input.lines : []).map((l) => ({ variant_id: String(l.variant_id), qty: Number(l.qty), prep_option_id: l.prep_option_id ? String(l.prep_option_id) : null })).filter((l) => l.qty > 0),
    note: input?.note ? String(input.note).trim().slice(0, 140) : null,
    address_id: String(input?.address_id ?? ""),
    every_weeks: Number(input?.every_weeks),
  };
  const err = validateBox(clean, addresses, products, slots, areas, settings);
  if (err) return { ok: false, error: err };
  // The first delivery fixes which weeks a two-weekly box falls on; it only moves when the day or rhythm changes.
  const sameRhythm = existing && existing.anchor_date && existing.every_weeks === clean.every_weeks && existing.weekdays[0] === clean.weekdays[0];
  const anchor = sameRhythm ? existing.anchor_date! : upcomingDates({ weekdays: clean.weekdays }, availableDates(settings, nowJakarta())[0], 1)[0];
  const r = await repo.saveBox(customer.id, { ...clean, anchor_date: anchor });
  revalidatePath("/akun");
  return r;
}

export async function setBoxStatusAction(id: string, status: StandingOrder["status"]): Promise<R<StandingOrder>> {
  if (status !== "active" && status !== "paused") return { ok: false, error: "Status tidak valid." };
  const customer = await getCurrentCustomer();
  if (!customer || !(await ownBox(String(id), customer.id))) return { ok: false, error: customer ? NOT_FOUND : SIGN_IN };
  const r = await (await getRepo()).setStandingOrderStatus(String(id), status);
  revalidatePath("/akun");
  return r;
}

export async function setBoxSkipAction(id: string, date: string, skip: boolean): Promise<R<StandingOrder>> {
  const customer = await getCurrentCustomer();
  if (!customer || !(await ownBox(String(id), customer.id))) return { ok: false, error: customer ? NOT_FOUND : SIGN_IN };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return { ok: false, error: "Tanggal tidak valid." };
  const repo = await getRepo();
  const done = (await repo.listStandingRuns({ standingOrderId: id, date })).find((r) => r.order_id);
  if (done) return { ok: false, error: `Pesanan untuk tanggal ini sudah dibuat (${done.order_code}). Buka pesanan itu untuk melewatinya.` };
  const r = await repo.setStandingSkip(String(id), date, Boolean(skip));
  revalidatePath("/akun");
  return r;
}

export async function deleteBoxAction(id: string): Promise<R<null>> {
  const customer = await getCurrentCustomer();
  if (!customer || !(await ownBox(String(id), customer.id))) return { ok: false, error: customer ? NOT_FOUND : SIGN_IN };
  const r = await (await getRepo()).deleteStandingOrder(String(id));
  revalidatePath("/akun");
  return r.ok ? { ok: true, data: null } : r;
}

/**
 * "Lewati minggu ini" on a box order that was already created: cancels it (stock and the delivery slot are released)
 * while it is unpaid and before the cut-off for its delivery day. The box itself stays active for the following weeks.
 */
export async function skipBoxOrderAction(code: string, phone: string): Promise<R<Order>> {
  if (typeof code !== "string" || typeof phone !== "string") return { ok: false, error: "Pesanan tidak ditemukan." };
  if (!(await allow("lookup", await clientIp()))) return { ok: false, error: TOO_MANY };
  const repo = await getRepo();
  const o = await repo.lookupOrder(code, phone);
  if (!o) return { ok: false, error: "Pesanan tidak ditemukan." };
  if (!boxSkippable(o, availableDates(await repo.getSettings(), nowJakarta()))) {
    return { ok: false, error: "Pesanan ini sudah tidak dapat dilewati. Hubungi kami melalui WhatsApp bila ada perubahan." };
  }
  const r = await repo.updateOrderStatus(o.id, "cancelled", "Dilewati pelanggan (kotak mingguan)");
  revalidatePath("/akun");
  return r;
}
