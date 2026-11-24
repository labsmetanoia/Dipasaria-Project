"use server";
// Public side of the restaurant sales kit: accepting a quotation from its signed link (no sign-in).
import { revalidatePath } from "next/cache";
import { getRepo } from "@/lib/data";
import { allow, clientIp, TOO_MANY } from "@/lib/guard";
import { verifyQuoteToken } from "@/lib/quoteLink";
import { alert } from "@/lib/monitor";

type R<T> = { ok: true; data: T } | { ok: false; error: string };

/** Accepting turns the quotation's lines into contract prices; a prospect gets a business account awaiting approval. */
export async function acceptQuoteAction(token: string, name: string): Promise<R<{ approved: boolean }>> {
  if (!(await allow("lookup", await clientIp()))) return { ok: false, error: TOO_MANY };
  const id = typeof token === "string" ? verifyQuoteToken(token) : null;
  if (!id) return { ok: false, error: "Tautan penawaran tidak berlaku." };
  const repo = await getRepo();
  const r = await repo.acceptQuote(id, String(name ?? "").trim());
  if (!r.ok) return r;
  const [q, account] = await Promise.all([repo.getQuote(id), repo.getAccount(r.data)]);
  await alert(`Penawaran ${q?.code ?? id} diterima oleh ${String(name).trim()} (${q?.business_name ?? ""}). ${account?.status === "approved" ? "Harga kontrak sudah berlaku." : "Setujui akunnya di menu Pelanggan agar mereka dapat memesan."}`);
  revalidatePath("/admin/penawaran");
  return { ok: true, data: { approved: account?.status === "approved" } };
}
