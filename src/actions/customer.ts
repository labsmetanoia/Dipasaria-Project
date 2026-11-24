"use server";
// Household customer accounts: WhatsApp one-time-code login, profile, saved addresses, consent, deletion.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getRepo } from "@/lib/data";
import { normalizePhone, isValidPhone } from "@/lib/format";
import { allow, clientIp, NOT_HUMAN, TOO_MANY, verifyHuman } from "@/lib/guard";
import { reportError } from "@/lib/monitor";
import { sendAuthCode } from "@/lib/notify/cloud";
import { safeMapsUrl } from "@/lib/orderRules";
import { clearCustomerSession, codeHash, getCurrentCustomer, newCode, newToken, otpChannel, setCustomerSession, tokenHash } from "@/lib/customer";
import type { CustomerAddress } from "@/lib/types";

type R<T> = { ok: true; data: T } | { ok: false; error: string };

export async function requestLoginCodeAction(phone: string, opts?: { turnstileToken?: string | null }): Promise<R<{ phone: string; demoCode?: string }>> {
  if (typeof phone !== "string" || !isValidPhone(phone)) return { ok: false, error: "Nomor WhatsApp tidak valid." };
  const channel = otpChannel();
  if (!channel) return { ok: false, error: "Masuk dengan WhatsApp belum tersedia. Anda tetap bisa berbelanja sebagai tamu." };
  const ip = await clientIp();
  if (!(await verifyHuman(opts?.turnstileToken, ip))) return { ok: false, error: NOT_HUMAN };
  const p = normalizePhone(phone);
  if (!(await allow("otpIp", ip)) || !(await allow("otpPhone", p))) return { ok: false, error: TOO_MANY };
  const code = newCode();
  const r = await (await getRepo()).customerRequestCode(p, codeHash(p, code));
  if (!r.ok) return { ok: false, error: r.error };
  if (channel === "demo") return { ok: true, data: { phone: p, demoCode: code } };
  const sent = await sendAuthCode(p, code);
  if (!sent.ok) {
    await reportError("action", `Kode masuk WhatsApp gagal: ${sent.error}`, { path: "/akun (kode masuk)" });
    return { ok: false, error: "Kode belum dapat dikirim ke WhatsApp. Coba lagi beberapa menit lagi." };
  }
  return { ok: true, data: { phone: p } };
}

export async function verifyLoginCodeAction(phone: string, code: string): Promise<R<null>> {
  if (typeof phone !== "string" || typeof code !== "string" || !/^\d{6}$/.test(code.trim())) return { ok: false, error: "Masukkan 6 angka kode dari WhatsApp." };
  if (!(await allow("otpVerify", await clientIp()))) return { ok: false, error: TOO_MANY };
  const p = normalizePhone(phone);
  const token = newToken();
  const r = await (await getRepo()).customerLogin(p, codeHash(p, code.trim()), tokenHash(token));
  if (r.status === "ok") { await setCustomerSession(token); revalidatePath("/", "layout"); return { ok: true, data: null }; }
  return { ok: false, error: r.status === "wrong" ? "Kode salah. Periksa lagi pesan WhatsApp dari kami." : r.status === "locked" ? "Terlalu banyak percobaan. Minta kode baru." : "Kode sudah kedaluwarsa. Minta kode baru." };
}

export async function customerLogoutAction() {
  await clearCustomerSession();
  redirect("/akun");
}

export async function updateProfileAction(patch: { name?: string; marketing_opt_in?: boolean }): Promise<R<null>> {
  const c = await getCurrentCustomer();
  if (!c) return { ok: false, error: "Silakan masuk kembali." };
  const name = typeof patch.name === "string" ? patch.name.trim().slice(0, 80) : undefined;
  await (await getRepo()).updateCustomer(c.id, { name, marketing_opt_in: typeof patch.marketing_opt_in === "boolean" ? patch.marketing_opt_in : undefined });
  revalidatePath("/akun");
  return { ok: true, data: null };
}

export async function saveAddressAction(a: Pick<CustomerAddress, "label" | "recipient" | "address" | "area_id" | "maps_url" | "is_default"> & { id?: string }): Promise<R<CustomerAddress>> {
  const c = await getCurrentCustomer();
  if (!c) return { ok: false, error: "Silakan masuk kembali." };
  const address = String(a?.address ?? "").trim();
  if (address.length < 8 || address.length > 400) return { ok: false, error: "Alamat minimal 8 dan maksimal 400 karakter." };
  const repo = await getRepo();
  if (a.area_id && !(await repo.getAreas()).some((x) => x.id === a.area_id)) return { ok: false, error: "Wilayah pengiriman tidak valid." };
  const r = await repo.saveAddress(c.id, {
    id: typeof a.id === "string" ? a.id : undefined,
    label: String(a.label ?? "").trim().slice(0, 30) || "Rumah",
    recipient: String(a.recipient ?? "").trim().slice(0, 80),
    address,
    area_id: a.area_id || null,
    maps_url: safeMapsUrl(a.maps_url),
    is_default: Boolean(a.is_default),
  });
  revalidatePath("/akun");
  return r.ok ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export async function deleteAddressAction(id: string): Promise<R<null>> {
  const c = await getCurrentCustomer();
  if (!c) return { ok: false, error: "Silakan masuk kembali." };
  // a weekly box delivers to a saved address: change the box first, so it never loses its destination silently
  if ((await (await getRepo()).listStandingOrders({ customerId: c.id })).some((s) => s.address_id === String(id))) {
    return { ok: false, error: "Alamat ini dipakai kotak mingguan Anda. Ubah alamat kotak itu atau hapus kotaknya terlebih dahulu." };
  }
  await (await getRepo()).deleteAddress(c.id, String(id));
  revalidatePath("/akun");
  return { ok: true, data: null };
}

/** Right to erasure: profile, addresses and sessions are deleted; past orders remain as the shop's transaction records. */
export async function deleteAccountAction(): Promise<void> {
  const c = await getCurrentCustomer();
  if (c) await (await getRepo()).deleteCustomer(c.id);
  await clearCustomerSession();
  redirect("/akun?dihapus=1");
}
