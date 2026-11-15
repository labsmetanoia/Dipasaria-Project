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
import { allow, clientIp, NOT_HUMAN, TOO_MANY, verifyHuman } from "@/lib/guard";
import { reportError } from "@/lib/monitor";
import { expireIfDue } from "@/lib/expiry";
import { after } from "next/server";
import { notify } from "@/lib/notify/service";
import { normalizePhone } from "@/lib/format";

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
  // Whether a phone has ordered before is only revealed at a human pace (it decides first-order promos).
  const isFirst = input.phone && (await allow("quotePhone", await clientIp())) ? !(await repo.hasOrderedBefore(input.phone)) : undefined;
  return quote({ settings, products, areas, promos, account, now: nowJakarta(), isFirstOrder: isFirst }, input);
}

export async function placeOrderAction(input: PlaceOrderInput, opts?: { turnstileToken?: string | null }): Promise<ActionResult<Order>> {
  // Server actions are public endpoints: reject malformed payloads before any work.
  if (!input || !Array.isArray(input.lines) || input.lines.length === 0 || input.lines.length > 60 || typeof input.phone !== "string") return { ok: false, error: "Isi keranjang tidak valid." };
  const repo = await getRepo();
  const account = await getCurrentAccount();
  const ip = await clientIp();
  // Signed-in business accounts are vetted; households prove they are human and are rate-limited per device and per phone.
  if (!account) {
    if (!(await verifyHuman(opts?.turnstileToken, ip))) return { ok: false, error: NOT_HUMAN };
    if (!(await allow("orderPhone", normalizePhone(input.phone)))) return { ok: false, error: "Nomor WhatsApp ini sudah membuat banyak pesanan hari ini. Hubungi kami melalui WhatsApp bila ingin menambah pesanan." };
  }
  if (!(await allow("order", ip))) return { ok: false, error: TOO_MANY };
  await expireIfDue(); // frees slots and stock held by orders that were never paid
  try {
    const r = await repo.placeOrder(input, account);
    if (r.ok) { const order = r.data; after(() => notify(order, "received")); } // sent after the response: checkout stays fast
    return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
  } catch (e) {
    await reportError("action", e, { path: "/checkout (placeOrder)" });
    return { ok: false, error: "Pesanan belum dapat dibuat karena gangguan sistem. Coba lagi sebentar, atau pesan melalui WhatsApp." };
  }
}

export async function lookupOrderAction(code: string, phone: string): Promise<Order | null> {
  const repo = await getRepo();
  if (typeof code !== "string" || typeof phone !== "string" || !code.trim() || !phone.trim()) return null;
  if (!(await allow("lookup", await clientIp()))) return null;
  await expireIfDue();
  return repo.lookupOrder(code, phone);
}

export async function lookupOrdersAction(refs: Array<{ code: string; phone: string }>): Promise<Order[]> {
  const repo = await getRepo();
  if (!Array.isArray(refs) || !(await allow("lookup", await clientIp()))) return [];
  await expireIfDue();
  const out: Order[] = [];
  for (const r of refs.slice(0, 30)) {
    if (typeof r?.code !== "string" || typeof r?.phone !== "string") continue;
    const o = await repo.lookupOrder(r.code, r.phone);
    if (o) out.push(o);
  }
  return out;
}

export async function confirmPaymentAction(code: string, phone: string): Promise<ActionResult<Order>> {
  const repo = await getRepo();
  if (!(await allow("lookup", await clientIp()))) return { ok: false, error: TOO_MANY };
  const r = await repo.customerConfirmPayment(code, phone);
  return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function applyAccountAction(input: AccountApplication, opts?: { turnstileToken?: string | null }): Promise<ActionResult<{ id: string }>> {
  const repo = await getRepo();
  const ip = await clientIp();
  if (!(await verifyHuman(opts?.turnstileToken, ip))) return { ok: false, error: NOT_HUMAN };
  if (!(await allow("apply", ip))) return { ok: false, error: TOO_MANY };
  const r = await repo.applyAccount(input);
  return r.ok ? { ok: true, data: { id: r.data.id } } : { ok: false, error: r.error };
}

export async function businessLoginAction(phone: string, code: string, opts?: { turnstileToken?: string | null }): Promise<ActionResult<{ name: string }>> {
  const repo = await getRepo();
  const ip = await clientIp();
  if (!(await verifyHuman(opts?.turnstileToken, ip))) return { ok: false, error: NOT_HUMAN };
  if (!(await allow("login", ip))) return { ok: false, error: TOO_MANY };
  let res: Awaited<ReturnType<typeof repo.businessLogin>>;
  try { res = await repo.businessLogin(phone, code); } catch (e) { return { ok: false, error: (e as Error).message }; }
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
  const [settings, areas] = await Promise.all([repo.getSettings(), repo.getAreas()]);
  const err = validateStanding(input, account, products, slots, { settings, areas, now: nowJakarta() });
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
  const repo = await getRepo();
  // Once the evening job has created the order for that date, skipping can no longer stop it: say so instead of pretending.
  const done = (await repo.listStandingRuns({ standingOrderId: id, date })).find((r) => r.order_id);
  if (done) return { ok: false, error: `Pesanan untuk tanggal ini sudah dibuat (${done.order_code}). Hubungi kami melalui WhatsApp bila ingin membatalkannya.` };
  const r = await repo.setStandingSkip(id, date, skip);
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
