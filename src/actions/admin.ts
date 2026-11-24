"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepo } from "@/lib/data";
import { adminLogin, adminLogout, isAdmin } from "@/lib/auth";
import type { BusinessAccount, Campaign, Quotation, Refund, DeliveryArea, DeliverySlot, Order, OrderStatus, PaymentStatus, PrepOption, Product, Promo, Settings, Variant } from "@/lib/types";
import { runStandingOrders, type RunOutcome } from "@/lib/standing";
import type { StandingOrder } from "@/lib/types";
import { expireIfDue } from "@/lib/expiry";
import { cancelOpenAtGateway, syncPayment } from "@/lib/payments/service";
import { notify, deliver, waApiEnabled, notifyRestock } from "@/lib/notify/service";
import type { Purchase } from "@/lib/types";
import { rupiah } from "@/lib/format";
import { after } from "next/server";
import { cleanNpwp, npwpError } from "@/lib/sales";
import { quoteUrl } from "@/lib/quoteLink";
import { buildBrief } from "@/lib/brief";
import { alert } from "@/lib/monitor";

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
  if (patch.npwp !== undefined) {
    const e = npwpError(patch.npwp);
    if (e) return wrap<BusinessAccount>({ ok: false, error: e });
    patch = { ...patch, npwp: cleanNpwp(patch.npwp) };
  }
  for (const k of ["tax_name", "tax_address"] as const) if (patch[k] !== undefined) patch = { ...patch, [k]: String(patch[k] ?? "").trim().slice(0, 200) || null };
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
  const repo = await getRepo();
  const before = (await repo.getProducts({ includeInactive: true })).find((p) => p.variants.some((v) => v.id === id));
  const wasOut = before?.variants.find((v) => v.id === id)?.stock_qty === 0;
  const r = await repo.updateVariant(id, patch);
  // stock back from zero: tell the customers who asked to be told ("Kabari saya")
  if (r.ok && before && wasOut && patch.stock_qty !== undefined && (patch.stock_qty === null || Number(patch.stock_qty) > 0) && before.available_today) {
    const p = before;
    after(() => notifyRestock({ id: p.id, name: p.name, slug: p.slug }));
  }
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
  const repo = await getRepo();
  const r = await repo.setProductAvailability(productId, available);
  if (r.ok && available) {
    const p = (await repo.getProducts({ includeInactive: true })).find((x) => x.id === productId);
    if (p && p.variants.some((v) => v.is_active && v.stock_qty !== 0)) after(() => notifyRestock({ id: p.id, name: p.name, slug: p.slug }));
  }
  revalidatePath("/", "layout");
  return wrap(r);
}

export async function upsertProductAction(p: Omit<Product, "variants" | "prep_options">) {
  await guard();
  // a pre-order is paid in advance, so its products have a price known at checkout (products_campaign_fixed_price)
  if (p.campaign_id && p.is_catch_weight) return wrap<Product>({ ok: false, error: "Produk pre-order harus berharga tetap (tidak ditimbang), agar dapat dibayar di muka." });
  const r = await (await getRepo()).upsertProduct({ ...p, campaign_id: p.campaign_id || null });
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
  if (patch.npwp !== undefined) {
    const e = npwpError(patch.npwp);
    if (e) return wrap({ ok: false as const, error: e });
    patch = { ...patch, npwp: cleanNpwp(patch.npwp) };
  }
  if (patch.legal_name !== undefined) patch = { ...patch, legal_name: String(patch.legal_name ?? "").trim().slice(0, 120) || null };
  if (patch.terms_grace_days !== undefined) {
    const g = Math.round(Number(patch.terms_grace_days));
    if (!Number.isFinite(g) || g < 0 || g > 60) return wrap({ ok: false as const, error: "Toleransi jatuh tempo harus 0–60 hari." });
    patch = { ...patch, terms_grace_days: g };
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

// ---------- Delivery mode ----------

/** Proof of delivery: completes the order and tells the customer (with the guarantee link). */
export async function markDeliveredAction(id: string, note: string, cod: number | null): Promise<ActionResult<Order>> {
  await guard();
  const cash = cod === null || cod === undefined || String(cod).trim() === "" ? null : Math.round(Number(cod));
  if (cash !== null && !Number.isFinite(cash)) return { ok: false, error: "Jumlah uang tunai tidak valid." };
  const r = await (await getRepo()).markDelivered(String(id), typeof note === "string" ? note : null, cash);
  if (r.ok) { const o = r.data; after(() => notify(o, "delivered")); }
  revalidatePath("/admin", "layout");
  return wrap(r);
}

/** Could not deliver: noted on the order (it stays out for delivery, to be retried or cancelled). */
export async function deliveryFailedAction(id: string, reason: string): Promise<ActionResult<Order>> {
  await guard();
  const repo = await getRepo();
  const o = await repo.getOrder(String(id));
  if (!o) return { ok: false, error: "Pesanan tidak ditemukan." };
  const why = String(reason ?? "").trim().slice(0, 200) || "tanpa keterangan";
  const stamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });
  const r = await repo.updateOrderInternalNote(o.id, [o.internal_note, `[Antar ${stamp}] Gagal: ${why}`].filter(Boolean).join("\n"));
  revalidatePath("/admin", "layout");
  return wrap(r);
}

// ---------- Freshness-guarantee claims ----------

const DECISION_TEXT = { replace: "kami ganti pada pengiriman berikutnya", refund: "dana Anda kami kembalikan", declined: "belum dapat kami ganti" } as const;

export async function resolveClaimAction(id: string, status: "replace" | "refund" | "declined", note: string, refund: number | null): Promise<ActionResult<null>> {
  await guard();
  if (!["replace", "refund", "declined"].includes(status)) return { ok: false, error: "Keputusan tidak valid." };
  const amount = status === "refund" ? Math.round(Number(refund)) : null;
  const text = String(note ?? "").trim().slice(0, 500);
  const r = await (await getRepo()).resolveClaim(String(id), status, text, amount);
  if (!r.ok) return { ok: false, error: r.error };
  const decision = `${DECISION_TEXT[status]}${status === "refund" && amount ? ` (${rupiah(amount)})` : ""}${text ? `. ${text}` : ""}`;
  const orderId = r.data;
  after(() => notify(orderId, "claim", { decision, dedupe: String(id) }));
  revalidatePath("/admin", "layout");
  return { ok: true, data: null };
}

// ---------- Dawn buying log ----------

export async function addPurchaseAction(p: Omit<Purchase, "id" | "created_at">): Promise<ActionResult<Purchase>> {
  await guard();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p?.delivery_date))) return { ok: false, error: "Tanggal tidak valid." };
  if (!["purchase", "leftover", "waste"].includes(p.kind)) return { ok: false, error: "Jenis catatan tidak valid." };
  const qty = Number(p.qty), cost = p.kind === "purchase" ? Math.round(Number(p.total_cost)) : 0;
  if (!(qty > 0) || qty > 10000) return { ok: false, error: "Isi jumlah lebih dari 0." };
  if (!Number.isFinite(cost) || cost < 0) return { ok: false, error: "Harga tidak valid." };
  const r = await (await getRepo()).addPurchase({ delivery_date: p.delivery_date, product_id: String(p.product_id), kind: p.kind, qty, unit: String(p.unit).slice(0, 20), total_cost: cost, supplier: String(p.supplier ?? "").trim().slice(0, 80), note: String(p.note ?? "").trim().slice(0, 200) });
  revalidatePath("/admin/belanja-subuh");
  return wrap(r);
}

export async function deletePurchaseAction(id: string): Promise<ActionResult<null>> {
  await guard();
  await (await getRepo()).deletePurchase(String(id));
  revalidatePath("/admin/belanja-subuh");
  return { ok: true, data: null };
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

// ---------- Trader's-pick boxes ----------

export async function setWeeklyContentsAction(productId: string, text: string, textEn: string): Promise<ActionResult> {
  await guard();
  const id = String(text ?? "").trim().slice(0, 400);
  const en = String(textEn ?? "").trim().slice(0, 400) || null;
  const r = await (await getRepo()).setWeeklyContents(String(productId), id, en);
  revalidatePath("/admin/belanja-subuh");
  revalidatePath("/belanja", "layout");
  return wrap(r);
}

// ---------- Morning brief ----------

/** Send the morning brief for a delivery date to the alert chat now (the same text the 02.00 job sends). */
export async function sendBriefAction(date: string): Promise<ActionResult<{ sent: boolean }>> {
  await guard();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return { ok: false, error: "Tanggal tidak valid." };
  if (!process.env.ALERT_WEBHOOK_URL) return { ok: false, error: "Chat peringatan belum diatur: isi ALERT_WEBHOOK_URL (lihat README, bagian Protection and monitoring)." };
  const brief = await buildBrief(await getRepo(), date);
  await alert(brief.text);
  return { ok: true, data: { sent: true } };
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

// ---- seasonal pre-orders ----
export async function saveCampaignAction(c: Omit<Campaign, "id" | "created_at"> & { id?: string }) {
  await guard();
  const clean = {
    ...c, slug: c.slug.trim().toLowerCase(), name: c.name.trim(), name_en: c.name_en?.trim() || null,
    intro: (c.intro ?? "").trim().slice(0, 1000), intro_en: c.intro_en?.trim().slice(0, 1000) || null, image_url: c.image_url?.trim() || null,
  };
  const r = await (await getRepo()).saveCampaign(clean);
  revalidatePath("/", "layout");
  return wrap(r);
}

// ---- refunds ----
export async function recordRefundAction(orderId: string, r: { amount: number; refunded_on: string; method: Refund["method"]; reference: string; note: string; proof: string | null; claim_id: string | null }) {
  await guard();
  const res = await (await getRepo()).recordRefund(orderId, { ...r, amount: Math.round(Number(r.amount)), reference: String(r.reference ?? ""), note: String(r.note ?? ""), proof: r.proof || null, claim_id: r.claim_id || null });
  revalidatePath(`/admin/pesanan/${orderId}`);
  return wrap(res);
}

// ---- quotations (restaurant sales kit) ----
export async function saveQuoteAction(q: Omit<Quotation, "id" | "code" | "status" | "accepted_at" | "accepted_name" | "created_at"> & { id?: string }) {
  await guard();
  const r = await (await getRepo()).saveQuote({ ...q, lines: (q.lines ?? []).map((l) => ({ variant_id: String(l.variant_id), price: Math.round(Number(l.price)), note: String(l.note ?? "").slice(0, 120) })) });
  revalidatePath("/admin/penawaran");
  return wrap(r);
}

/** "sent" returns the signed link to share; "draft" takes a quotation back for editing; "declined" closes it. */
export async function setQuoteStatusAction(id: string, status: "draft" | "sent" | "declined") {
  await guard();
  if (!["draft", "sent", "declined"].includes(status)) return wrap<{ quote: Quotation; link: string }>({ ok: false, error: "Status tidak valid." });
  const r = await (await getRepo()).setQuoteStatus(id, status);
  revalidatePath("/admin/penawaran");
  return wrap(r.ok ? { ok: true as const, data: { quote: r.data, link: quoteUrl(id) } } : r);
}
