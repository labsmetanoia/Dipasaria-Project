"use server";

import { redirect } from "next/navigation";
import { getRepo } from "@/lib/data";
import { getCurrentAccount, setBusinessSession, clearBusinessSession } from "@/lib/auth";
import type { AccountApplication, CartLine, Order, PlaceOrderInput, Promo, Quote } from "@/lib/types";
import { quote } from "@/lib/pricing";
import { nowJakarta } from "@/lib/format";
import type { StandingOrder, StandingOrderInput } from "@/lib/types";
import { validateStanding } from "@/lib/standing";
import { revalidatePath } from "next/cache";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Server-side quote so the browser can show validated promo results and totals without seeing the promo table. */
export async function quoteCart(input: { lines: CartLine[]; area_id?: string | null; promo_code?: string | null; phone?: string | null }): Promise<Quote> {
  const repo = await getRepo();
  const account = await getCurrentAccount();
  const [settings, products, areas] = await Promise.all([repo.getSettings(), repo.getProducts(), repo.getAreas()]);
  const promos: Promo[] = [];
  if (input.promo_code) {
    const p = await repo.getPromoByCode(input.promo_code);
    if (p) promos.push(p);
  }
  const isFirst = input.phone ? !(await repo.hasOrderedBefore(input.phone)) : undefined;
  return quote({ settings, products, areas, promos, account, now: nowJakarta(), isFirstOrder: isFirst }, input);
}

export async function placeOrderAction(input: PlaceOrderInput): Promise<ActionResult<Order>> {
  const repo = await getRepo();
  const account = await getCurrentAccount();
  try {
    const r = await repo.placeOrder(input, account);
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Gagal membuat pesanan." };
  }
}

export async function lookupOrderAction(code: string, phone: string): Promise<Order | null> {
  const repo = await getRepo();
  if (!code?.trim() || !phone?.trim()) return null;
  return repo.lookupOrder(code, phone);
}

export async function lookupOrdersAction(refs: Array<{ code: string; phone: string }>): Promise<Order[]> {
  const repo = await getRepo();
  const out: Order[] = [];
  for (const r of refs.slice(0, 30)) {
    const o = await repo.lookupOrder(r.code, r.phone);
    if (o) out.push(o);
  }
  return out;
}

export async function confirmPaymentAction(code: string, phone: string): Promise<ActionResult<Order>> {
  const repo = await getRepo();
  const r = await repo.customerConfirmPayment(code, phone);
  return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function applyAccountAction(input: AccountApplication): Promise<ActionResult<{ id: string }>> {
  const repo = await getRepo();
  const r = await repo.applyAccount(input);
  return r.ok ? { ok: true, data: { id: r.data.id } } : { ok: false, error: r.error };
}

export async function businessLoginAction(phone: string, code: string): Promise<ActionResult<{ name: string }>> {
  const repo = await getRepo();
  const res = await repo.businessLogin(phone, code);
  if (!res) return { ok: false, error: "Nomor WhatsApp atau kode akses tidak cocok. Kode akses dikirim melalui WhatsApp setelah akun disetujui." };
  await setBusinessSession(res.token);
  return { ok: true, data: { name: res.account.business_name } };
}

export async function businessLogoutAction() {
  await clearBusinessSession();
  redirect("/belanja");
}

export async function accountOrdersAction(): Promise<Order[]> {
  const account = await getCurrentAccount();
  if (!account) return [];
  return (await getRepo()).getOrdersForAccount(account.id, 10);
}

// ---------- Standing orders (business accounts only) ----------

async function requireBusiness() {
  const account = await getCurrentAccount();
  if (!account || account.status !== "approved") return null;
  return account;
}

async function ownStanding(id: string, accountId: string) {
  const list = await (await getRepo()).listStandingOrders({ accountId });
  return list.find((s) => s.id === id) ?? null;
}

export async function saveStandingOrderAction(input: StandingOrderInput): Promise<ActionResult<StandingOrder>> {
  const account = await requireBusiness();
  if (!account) return { ok: false, error: "Masuk dengan akun bisnis untuk membuat pesanan rutin." };
  const repo = await getRepo();
  if (input.id && !(await ownStanding(input.id, account.id))) return { ok: false, error: "Pesanan rutin tidak ditemukan." };
  const [products, slots] = await Promise.all([repo.getProducts(), repo.getSlots()]);
  const err = validateStanding(input, account, products, slots);
  if (err) return { ok: false, error: err };
  const r = await repo.saveStandingOrder(account.id, input);
  revalidatePath("/akun");
  return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function setStandingStatusAction(id: string, status: StandingOrder["status"]): Promise<ActionResult<StandingOrder>> {
  const account = await requireBusiness();
  if (!account || !(await ownStanding(id, account.id))) return { ok: false, error: "Pesanan rutin tidak ditemukan." };
  const r = await (await getRepo()).setStandingOrderStatus(id, status);
  revalidatePath("/akun");
  return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function setStandingSkipAction(id: string, date: string, skip: boolean): Promise<ActionResult<StandingOrder>> {
  const account = await requireBusiness();
  if (!account || !(await ownStanding(id, account.id))) return { ok: false, error: "Pesanan rutin tidak ditemukan." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Tanggal tidak valid." };
  const r = await (await getRepo()).setStandingSkip(id, date, skip);
  revalidatePath("/akun");
  return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function deleteStandingOrderAction(id: string): Promise<ActionResult<null>> {
  const account = await requireBusiness();
  if (!account || !(await ownStanding(id, account.id))) return { ok: false, error: "Pesanan rutin tidak ditemukan." };
  const r = await (await getRepo()).deleteStandingOrder(id);
  revalidatePath("/akun");
  return r.ok ? { ok: true, data: null } : { ok: false, error: r.error };
}
