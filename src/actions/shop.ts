"use server";

import { redirect } from "next/navigation";
import { getRepo } from "@/lib/data";
import { getCurrentAccount, setBusinessSession, clearBusinessSession } from "@/lib/auth";
import type { AccountApplication, CartLine, Order, PlaceOrderInput, Promo, Quote } from "@/lib/types";
import { quote } from "@/lib/pricing";
import { nowJakarta } from "@/lib/format";

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
