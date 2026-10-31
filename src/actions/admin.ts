"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepo } from "@/lib/data";
import { adminLogin, adminLogout, isAdmin } from "@/lib/auth";
import type { BusinessAccount, DeliveryArea, DeliverySlot, OrderStatus, PaymentStatus, PrepOption, Product, Promo, Settings, Variant } from "@/lib/types";

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
  const r = await (await getRepo()).updateOrderStatus(id, status, note);
  revalidatePath("/admin", "layout");
  return wrap(r);
}

export async function weighOrderAction(id: string, items: Array<{ item_id: string; qty_final: number }>) {
  await guard();
  const r = await (await getRepo()).weighOrder(id, items);
  revalidatePath("/admin", "layout");
  return wrap(r);
}

export async function setPaymentStatusAction(id: string, status: PaymentStatus) {
  await guard();
  const r = await (await getRepo()).setPaymentStatus(id, status);
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
