"use server";
// Back-office actions for restaurant receivables: payments, credit limits, contract prices, statements by WhatsApp.
// Money rules (matching payments to invoices, the credit check at checkout) live in SQL; these validate and record.

import { revalidatePath } from "next/cache";
import { getRepo } from "@/lib/data";
import { isAdmin } from "@/lib/auth";
import type { AccountPaymentMethod, BusinessAccount, ContractPrice } from "@/lib/types";
import { addDays, nowJakarta, waLink } from "@/lib/format";
import { buildLedger } from "@/lib/receivables";
import { statementUrl } from "@/lib/statementLink";
import { notifyStatement } from "@/lib/notify/service";
import { reportError } from "@/lib/monitor";

type R<T = void> = { ok: true; data: T } | { ok: false; error: string };

async function guard() {
  if (!(await isAdmin())) throw new Error("Tidak berwenang.");
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const METHODS: AccountPaymentMethod[] = ["transfer", "cash", "qris", "giro", "other"];
const toInt = (v: unknown) => Math.round(Number(String(v ?? "").replace(/[^\d-]/g, "")));

function refresh(accountId: string) {
  revalidatePath("/admin/piutang");
  revalidatePath(`/admin/piutang/${accountId}`);
  revalidatePath("/admin", "layout");
}

export async function recordAccountPaymentAction(accountId: string, input: { amount: string | number; paid_on: string; method: string; reference: string; note: string }): Promise<R<string>> {
  await guard();
  const amount = toInt(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Isi jumlah pembayaran dalam rupiah." };
  if (!ISO.test(String(input.paid_on))) return { ok: false, error: "Isi tanggal pembayaran." };
  if (!METHODS.includes(input.method as AccountPaymentMethod)) return { ok: false, error: "Pilih cara pembayaran." };
  const r = await (await getRepo()).recordAccountPayment(String(accountId), {
    amount, paid_on: input.paid_on, method: input.method as AccountPaymentMethod, reference: String(input.reference ?? "").slice(0, 80), note: String(input.note ?? "").slice(0, 200),
  });
  refresh(accountId);
  return r;
}

export async function deleteAccountPaymentAction(accountId: string, paymentId: string): Promise<R> {
  await guard();
  const r = await (await getRepo()).deleteAccountPayment(String(paymentId));
  refresh(accountId);
  return r;
}

export async function updateCreditAction(accountId: string, input: { credit_limit: string; payment_terms: BusinessAccount["payment_terms"] }): Promise<R<BusinessAccount>> {
  await guard();
  const raw = String(input.credit_limit ?? "").trim();
  const limit = raw === "" ? null : toInt(raw);
  if (limit !== null && (!Number.isFinite(limit) || limit < 0 || limit > 10_000_000_000)) return { ok: false, error: "Batas kredit tidak valid. Kosongkan bila tanpa batas." };
  if (!["prepaid", "days3", "weekly"].includes(input.payment_terms)) return { ok: false, error: "Tempo pembayaran tidak valid." };
  const r = await (await getRepo()).updateAccount(String(accountId), { credit_limit: limit, payment_terms: input.payment_terms });
  refresh(accountId);
  revalidatePath("/admin/pelanggan");
  return r;
}

export async function addContractPriceAction(accountId: string, input: { variant_id: string; price: string | number; starts_on: string; ends_on: string; note: string }): Promise<R<ContractPrice>> {
  await guard();
  const repo = await getRepo();
  const price = toInt(input.price);
  if (!Number.isFinite(price) || price <= 0 || price > 100_000_000) return { ok: false, error: "Isi harga kontrak per satuan dalam rupiah." };
  const products = await repo.getProducts({ includeInactive: true });
  if (!products.some((p) => p.variants.some((v) => v.id === input.variant_id))) return { ok: false, error: "Pilih produk." };
  const starts = String(input.starts_on || nowJakarta().date);
  const ends = String(input.ends_on ?? "").trim() || null;
  if (!ISO.test(starts) || (ends !== null && !ISO.test(ends))) return { ok: false, error: "Tanggal tidak valid." };
  if (ends !== null && ends < starts) return { ok: false, error: "Tanggal berakhir harus sesudah tanggal mulai." };
  if (starts < addDays(nowJakarta().date, -366)) return { ok: false, error: "Tanggal mulai terlalu lama." };
  const r = await repo.addContractPrice({ account_id: String(accountId), variant_id: input.variant_id, price, starts_on: starts, ends_on: ends, note: String(input.note ?? "").trim().slice(0, 120) });
  refresh(accountId);
  return r;
}

export async function deleteContractPriceAction(accountId: string, id: string): Promise<R> {
  await guard();
  await (await getRepo()).deleteContractPrice(String(id));
  refresh(accountId);
  return { ok: true, data: undefined };
}

/** Queue the WhatsApp summary with a signed statement link; returns a wa.me link when the API is not set up. */
export async function sendStatementAction(accountId: string): Promise<R<{ status: string; link: string | null }>> {
  await guard();
  try {
    const repo = await getRepo();
    const account = await repo.getAccount(String(accountId));
    if (!account) return { ok: false, error: "Akun tidak ditemukan." };
    const { orders, payments, allocations } = await repo.listReceivables({ accountId: account.id });
    const l = buildLedger(account, orders, payments, allocations);
    const msg = await notifyStatement(account, Math.max(0, l.balance), l.overdue, statementUrl(account.id));
    if (!msg) return { ok: false, error: "Ringkasan dengan jumlah yang sama sudah dikirim hari ini. Lihat Pesan WA." };
    refresh(accountId);
    revalidatePath("/admin/whatsapp");
    return { ok: true, data: { status: msg.status, link: msg.status === "manual" ? waLink(msg.phone, msg.body) : null } };
  } catch (e) {
    await reportError("action", e, { path: "receivables/statement" });
    return { ok: false, error: "Ringkasan belum terkirim. Coba lagi sebentar lagi." };
  }
}
