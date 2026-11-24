// Midtrans Core API, QRIS (dynamic QR). Server key from MIDTRANS_SERVER_KEY; sandbox keys start with "SB-",
// or set MIDTRANS_ENV=sandbox|production explicitly.
//  - Charge:  POST /v2/charge  { payment_type: "qris", transaction_details, qris: { acquirer }, custom_expiry }
//             POST /v2/charge  { payment_type: "bank_transfer", bank_transfer: { bank }, ... }  (virtual account;
//             the number comes back in va_numbers[0].va_number, or permata_va_number for Permata)
//  - Status:  GET  /v2/{order_id}/status   (the source of truth: webhooks are only a trigger to look)
//  - Cancel:  POST /v2/{order_id}/cancel
//  - Webhook signature: SHA512(order_id + status_code + gross_amount + server_key), fields exactly as received.
import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { Gateway, GatewayStatus } from "./gateway";
import type { Payment } from "../types";
import { SITE_URL } from "../config";

export function midtransConfigured(): boolean {
  return Boolean(process.env.MIDTRANS_SERVER_KEY);
}

function key(): string {
  return process.env.MIDTRANS_SERVER_KEY ?? "";
}

export function midtransSandbox(): boolean {
  if (process.env.MIDTRANS_ENV === "production") return false;
  if (process.env.MIDTRANS_ENV === "sandbox") return true;
  return key().startsWith("SB-");
}

function base(): string {
  // MIDTRANS_API_BASE points automated tests at a local stand-in; only localhost is accepted, so it cannot redirect money.
  const override = process.env.MIDTRANS_API_BASE;
  if (override && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(override)) return override;
  return midtransSandbox() ? "https://api.sandbox.midtrans.com" : "https://api.midtrans.com";
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Basic ${Buffer.from(`${key()}:`).toString("base64")}`,
  };
  // Point notifications at this deployment (the dashboard setting is used when this is absent, e.g. on localhost).
  if (SITE_URL.startsWith("https://")) h["X-Override-Notification"] = `${SITE_URL}/api/payments/midtrans`;
  return h;
}

type MidtransBody = {
  status_code?: string;
  status_message?: string;
  transaction_status?: string;
  gross_amount?: string;
  qr_string?: string;
  expiry_time?: string;
  actions?: Array<{ name: string; url: string }>;
  order_id?: string;
  va_numbers?: Array<{ bank: string; va_number: string }>;
  permata_va_number?: string;
};

async function call(path: string, init: RequestInit = {}): Promise<MidtransBody> {
  const res = await fetch(base() + path, { ...init, headers: headers(), signal: AbortSignal.timeout(10_000), cache: "no-store" });
  const body = (await res.json().catch(() => null)) as MidtransBody | null;
  // An outage or a non-JSON answer is an error, never "no information": callers must retry, not assume.
  if (!body || (res.status >= 500 && !body.status_code)) throw new Error(`Midtrans ${res.status}: tidak ada jawaban yang valid`);
  return body;
}

/** "2026-11-16 15:00:00" (Jakarta time) → ISO. */
function parseJakarta(s: string | undefined): string | null {
  if (!s || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) return null;
  return new Date(`${s.replace(" ", "T")}+07:00`).toISOString();
}

export function mapMidtransStatus(s: string | undefined): Payment["status"] {
  switch (s) {
    case "settlement":
    case "capture":
      return "paid";
    case "expire":
      return "expired";
    case "cancel":
      return "cancelled";
    case "deny":
    case "failure":
      return "failed";
    default:
      return "pending"; // pending, authorize, refund… change nothing on our side
  }
}

/** Verify a notification came from Midtrans. All fields are used exactly as received (gross_amount is e.g. "50000.00"). */
export function verifyMidtransSignature(n: { order_id?: unknown; status_code?: unknown; gross_amount?: unknown; signature_key?: unknown }): boolean {
  if (!midtransConfigured()) return false;
  const parts = [n.order_id, n.status_code, n.gross_amount, n.signature_key];
  if (!parts.every((p) => typeof p === "string" && p.length > 0 && p.length < 300)) return false;
  const expected = createHash("sha512").update(`${n.order_id}${n.status_code}${n.gross_amount}${key()}`).digest("hex");
  const got = String(n.signature_key).toLowerCase();
  return got.length === expected.length && timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

export const midtrans: Gateway = {
  name: "midtrans",
  get label() {
    return `Midtrans (${midtransSandbox() ? "sandbox" : "production"})`;
  },
  async createQris({ id, amount, expiresAt, order }) {
    const minutes = Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 60_000));
    const body = await call("/v2/charge", {
      method: "POST",
      body: JSON.stringify({
        payment_type: "qris",
        transaction_details: { order_id: id, gross_amount: Math.round(amount) },
        qris: { acquirer: process.env.MIDTRANS_QRIS_ACQUIRER || "gopay" },
        customer_details: { first_name: order.customer_name.slice(0, 50), phone: `+${order.phone}` },
        custom_expiry: { expiry_duration: minutes, unit: "minute" },
      }),
    });
    if (body.status_code !== "201" || !body.qr_string) {
      throw new Error(`Midtrans menolak pembuatan QRIS: ${body.status_code ?? "?"} ${body.status_message ?? ""}`.trim());
    }
    return {
      qr_string: body.qr_string,
      qr_url: body.actions?.find((a) => a.name === "generate-qr-code")?.url ?? null,
      expires_at: parseJakarta(body.expiry_time) ?? expiresAt.toISOString(),
    };
  },
  async createVa({ id, amount, expiresAt, bank, name, phone }) {
    const minutes = Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 60_000));
    const body = await call("/v2/charge", {
      method: "POST",
      body: JSON.stringify({
        payment_type: "bank_transfer",
        transaction_details: { order_id: id, gross_amount: Math.round(amount) },
        bank_transfer: { bank },
        customer_details: { first_name: name.slice(0, 50), phone: `+${phone}` },
        custom_expiry: { expiry_duration: minutes, unit: "minute" },
      }),
    });
    const number = body.va_numbers?.[0]?.va_number ?? body.permata_va_number;
    if (body.status_code !== "201" || !number) {
      throw new Error(`Midtrans menolak pembuatan virtual account: ${body.status_code ?? "?"} ${body.status_message ?? ""}`.trim());
    }
    return { bank, va_number: number, expires_at: parseJakarta(body.expiry_time) ?? expiresAt.toISOString() };
  },
  async getStatus(id): Promise<GatewayStatus | null> {
    const body = await call(`/v2/${encodeURIComponent(id)}/status`);
    if (body.status_code === "404" || !body.transaction_status) return null;
    const amount = body.gross_amount ? Math.round(Number(body.gross_amount)) : null;
    return { status: mapMidtransStatus(body.transaction_status), amount: Number.isFinite(amount) ? amount : null, raw: body };
  },
  async cancel(id) {
    await call(`/v2/${encodeURIComponent(id)}/cancel`, { method: "POST" }).catch(() => undefined);
  },
};
