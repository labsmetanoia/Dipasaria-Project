"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepo } from "@/lib/data";
import { adminLogin, adminLogout, isAdmin } from "@/lib/auth";
import type { BusinessAccount, DeliveryArea, DeliverySlot, Order, OrderStatus, PaymentStatus, PrepOption, Product, Promo, Settings, Variant } from "@/lib/types";
import { runStandingOrders, type RunOutcome } from "@/lib/standing";
import type { StandingOrder } from "@/lib/types";
import { expireIfDue } from "@/lib/expiry";
import { cancelOpenAtGateway, syncPayment } from "@/lib/payments/service";
import { notify, deliver, waApiEnabled } from "@/lib/notify/service";
import { after } from "next/server";

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

async function guard() {
  if (!(await isAdmin())) throw new Error("Tidak berwenang.");
}

function wrap<T>(r: { ok: true; data: T } | { ok: false; error: string }): ActionResult<T> {
  return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function adminLoginAction(_prev: { error?: string } | undefined, form: FormData): Promise<{ error?: string }> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const r = await adminLogin(email, password);
  if (!r.ok) return { error: r.error };
  redirect("/admin");
}

export async function adminLogoutAction() {
  await adminLogout();
  redirect("/admin/login");
}

// ---- orders ----
export async function setOrderStatusAction(id: string, status: OrderStatus, note?: string) {
  await guard();
  const repo = await getRepo();
  const open = status === "cancelled" ? await repo.listPayments(id) : [];
  const r = await repo.updateOrderStatus(id, status, note);
  if (r.ok) await cancelOpenAtGateway(open);
  if (r.ok && status === "delivering") { const o = r.data; after(() => notify(o, "delivering")); }
  if (r.ok && status === "cancelled") { const o = r.data; after(() => notify(o, "cancelled", { reason: "dibatalkan oleh tim Dipasaria; kami akan menghubungi Anda bila perlu" })); }
  revalidatePath("/admin", "layout");
  return wrap(r);
}

export async function weighOrderAction(id: string, items: Array<{ item_id: string; qty_final: number }>) {
  await guard();
  const repo = await getRepo();
  const open = await repo.listPayments(id);
  const r = await repo.weighOrder(id, items);
  if (r.ok) await cancelOpenAtGateway(open); // a QR for the old amount must not be paid
  // final invoice once per amount (re-weighing to a different total sends a corrected one)
  if (r.ok && r.data.has_catch_weight) { const o = r.data; after(() => notify(o, "invoice", { dedupe: String(o.total_final) })); }
  revalidatePath("/admin", "layout");
  return wrap(r);
}

export async function setPaymentStatusAction(id: string, status: PaymentStatus) {
  await guard();
  const r = await (await getRepo()).setPaymentStatus(id, status);
  if (r.ok && status === "paid") { const o = r.data; after(() => notify(o, "paid")); }
  revalidatePath("/admin", "layout");
  return wrap(r);
}

/** Give an unpaid household order 2 more hours, or switch its automatic cancellation off. */
export async function setOrderPayByAction(id: string, mode: "extend" | "off"): Promise<ActionResult<Order>> {
  await guard();
  const repo = await getRepo();
  const o = await repo.getOrder(id);
  if (!o) return { ok: false, error: "Pesanan tidak ditemukan." };
  const base = Math.max(Date.now(), o.pay_by ? Date.parse(o.pay_by) : 0);
  const r = await repo.setOrderPayBy(id, mode === "off" ? null : new Date(base + 2 * 3600_000).toISOString());
  revalidatePath("/admin", "layout");
  return wrap(r);
}

export async function updateInternalNoteAction(id: string, note: string) {
  await guard();
  const r = await (await getRepo()).updateOrderInternalNote(id, note);
  return wrap(r);
}

// ---- accounts ----
export async function approveAccountAction(id: string, patch: { discount_pct: number; payment_terms: BusinessAccount["payment_terms"]; allow_cod: boolean; preferred_slot_id?: string | null }) {
  await guard();
  const r = await (await getRepo()).approveAccount(id, patch);
  revalidatePath("/admin/pelanggan");
  return wrap(r);
}

export async function updateAccountAction(id: string, patch: Partial<BusinessAccount>) {
  await guard();
  const r = await (await getRepo()).updateAccount(id, patch);
  revalidatePath("/admin/pelanggan");
  return wrap(r);
}

export async function regenerateCodeAction(id: string) {
  await guard();
  const r = await (await getRepo()).regenerateAccessCode(id);
  revalidatePath("/admin/pelanggan");
  return wrap(r);
}

// ---- catalogue ----
export async function updateVariantAction(id: string, patch: Partial<Variant>) {
  await guard();
  const r = await (await getRepo()).updateVariant(id, patch);
  revalidatePath("/", "layout");
  return wrap(r);
}

export async function createVariantAction(v: Omit<Variant, "id">) {
  await guard();
  const r = await (await getRepo()).createVariant(v);
  revalidatePath("/", "layout");
  return wrap(r);
}

export async function setAvailabilityAction(productId: string, available: boolean) {
  await guard();
  const r = await (await getRepo()).setProductAvailability(productId, available);
  revalidatePath("/", "layout");
  return wrap(r);
}

export async function upsertProductAction(p: Omit<Product, "variants" | "prep_options">) {
  await guard();
  const r = await (await getRepo()).upsertProduct(p);
  revalidatePath("/", "layout");
  return wrap(r);
}

export async function upsertPrepOptionAction(p: PrepOption) {
  await guard();
  const r = await (await getRepo()).upsertPrepOption(p);
  revalidatePath("/", "layout");
  return wrap(r);
}

export async function deletePrepOptionAction(id: string) {
  await guard();
  const r = await (await getRepo()).deletePrepOption(id);
  revalidatePath("/", "layout");
  return wrap(r);
}

// ---- promos, settings, delivery ----
export async function upsertPromoAction(p: Promo) {
  await guard();
  const r = await (await getRepo()).upsertPromo(p);
  revalidatePath("/admin/promo");
  return wrap(r);
}

export async function deletePromoAction(id: string) {
  await guard();
  const r = await (await getRepo()).deletePromo(id);
  revalidatePath("/admin/promo");
  return wrap(r);
}

export async function updateSettingsAction(patch: Partial<Settings>) {
  await guard();
  if (patch.cutoff_time !== undefined) {
    // "20.00" is how times are written on the site; the database needs "20:00" (a wrong format would stop every checkout)
    const t = String(patch.cutoff_time).trim().replace(".", ":");
    const m = t.match(/^(\d{1,2}):(\d{2})$/);
    if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return wrap({ ok: false as const, error: "Batas pemesanan harus berupa jam, misalnya 20:00." });
    patch = { ...patch, cutoff_time: `${m[1].padStart(2, "0")}:${m[2]}` };
  }
  for (const k of ["min_order_retail", "min_order_business", "free_delivery_retail", "free_delivery_business", "catch_weight_buffer_pct", "max_days_ahead"] as const) {
    if (patch[k] !== undefined && (!Number.isFinite(Number(patch[k])) || Number(patch[k]) < 0)) return wrap({ ok: false as const, error: "Angka di pengaturan tidak boleh negatif." });
  }
  if (patch.max_days_ahead !== undefined && (Number(patch.max_days_ahead) < 1 || Number(patch.max_days_ahead) > 30)) return wrap({ ok: false as const, error: "Maksimal hari pemesanan ke depan: 1–30 hari." });
  if (patch.wa_events !== undefined) {
    const allowed = ["received", "invoice", "paid", "delivering", "reminder", "cancelled", "standing", "delivered", "claim", "restock"];
    patch = { ...patch, wa_events: (Array.isArray(patch.wa_events) ? patch.wa_events : []).filter((k) => allowed.includes(k)) };
  }
  if (patch.payment_window_minutes !== undefined) {
    const m = Math.round(Number(patch.payment_window_minutes));
    if (!Number.isFinite(m) || m < 0 || m > 10080) return wrap({ ok: false as const, error: "Batas waktu pembayaran harus 0–10.080 menit (0 = tidak dibatalkan otomatis)." });
    patch = { ...patch, payment_window_minutes: m };
  }
  const r = await (await getRepo()).updateSettings(patch);
  revalidatePath("/", "layout");
  return wrap(r);
}

export async function upsertAreaAction(a: DeliveryArea) {
  await guard();
  const r = await (await getRepo()).upsertArea(a);
  revalidatePath("/", "layout");
  return wrap(r);
}

export async function upsertSlotAction(s: DeliverySlot) {
  await guard();
  const r = await (await getRepo()).upsertSlot(s);
  revalidatePath("/", "layout");
  return wrap(r);
}

/** Ask the gateway about this order's open QR codes (in case a notification was missed). */
export async function syncPaymentsAction(orderId: string): Promise<ActionResult<Order>> {
  await guard();
  const repo = await getRepo();
  for (const p of await repo.listPayments(orderId)) await syncPayment(p, true);
  revalidatePath("/admin", "layout");
  const o = await repo.getOrder(orderId);
  return o ? { ok: true, data: o } : { ok: false, error: "Pesanan tidak ditemukan." };
}

// ---------- WhatsApp outbox ----------

/** Send a failed message again through the API. */
export async function resendWaAction(id: string): Promise<ActionResult<null>> {
  await guard();
  const repo = await getRepo();
  const m = await repo.getWa(id);
  if (!m) return { ok: false, error: "Pesan tidak ditemukan." };
  if (!waApiEnabled()) return { ok: false, error: "API WhatsApp belum diatur. Kirim manual dengan tombol WhatsApp." };
  await repo.updateWa(id, { status: "failed", attempts: 0 }); // a manual resend starts a fresh round of attempts
  const r = await deliver({ ...m, status: "failed", attempts: 0 });
  revalidatePath("/admin", "layout");
  return r.status === "sent" ? { ok: true, data: null } : { ok: false, error: r.error ?? "Gagal mengirim." };
}

/** The owner sent this message by hand (wa.me): record it so the queue is clear. */
export async function markWaSentAction(id: string): Promise<ActionResult<null>> {
  await guard();
  await (await getRepo()).updateWa(id, { status: "sent", provider_id: "manual", sent_at: new Date().toISOString(), error: null });
  revalidatePath("/admin", "layout");
  return { ok: true, data: null };
}

// ---------- System ----------

export async function resolveErrorsAction(fingerprints: string[] | "all"): Promise<ActionResult<null>> {
  await guard();
  await (await getRepo()).resolveErrors(fingerprints === "all" ? "all" : fingerprints.filter((f) => typeof f === "string").slice(0, 200));
  revalidatePath("/admin", "layout");
  return { ok: true, data: null };
}

export async function runExpiryNowAction(): Promise<ActionResult<number>> {
  await guard();
  const n = await expireIfDue("force");
  revalidatePath("/admin", "layout");
  return { ok: true, data: n };
}

// ---------- Standing orders ----------

export async function runStandingOrdersAction(date: string): Promise<ActionResult<RunOutcome[]>> {
  await guard();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Tanggal tidak valid." };
  const out = await runStandingOrders(await getRepo(), date);
  for (const o of out) if (o.status === "placed" && o.order_id) await notify(o.order_id, "standing", { missing: o.missing });
  revalidatePath("/admin/rutin");
  revalidatePath("/admin/pesanan");
  return { ok: true, data: out };
}

export async function adminSetStandingStatusAction(id: string, status: StandingOrder["status"]): Promise<ActionResult<StandingOrder>> {
  await guard();
  const r = await (await getRepo()).setStandingOrderStatus(id, status);
  revalidatePath("/admin/rutin");
  return wrap(r);
}
