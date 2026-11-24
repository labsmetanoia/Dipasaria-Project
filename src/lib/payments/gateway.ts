// Payment gateway contract. Midtrans in production; a built-in demo gateway in demo mode so the whole
// QRIS flow (QR, polling, automatic confirmation) can be tried without keys.
import "server-only";
import type { Order, Payment } from "../types";
import { isDemoMode } from "../data";
import { midtrans, midtransConfigured } from "./midtrans";
import { mockGateway } from "./mock";

export interface QrisCharge {
  qr_string: string;
  qr_url: string | null;
  expires_at: string; // ISO
}

export interface VaCharge {
  bank: string;
  va_number: string;
  expires_at: string; // ISO
}

/** Banks a virtual account can be opened at. Midtrans calls Mandiri's "echannel" (a bill key), which is not offered. */
export const VA_BANK_LABEL: Record<string, string> = { bca: "BCA", bni: "BNI", bri: "BRI", permata: "Permata", cimb: "CIMB Niaga" };

/** The banks offered, from MIDTRANS_VA_BANKS (comma-separated; default bca,bni,bri). Each must be active in the Midtrans account. */
export function vaBanks(): string[] {
  const list = (process.env.MIDTRANS_VA_BANKS || "bca,bni,bri").split(",").map((b) => b.trim().toLowerCase()).filter((b) => b in VA_BANK_LABEL);
  return [...new Set(list)];
}

export interface GatewayStatus {
  status: Payment["status"];
  amount: number | null;
  raw: unknown;
}

export interface Gateway {
  name: Payment["provider"];
  label: string;
  /** Create a dynamic QRIS for exactly `amount` rupiah. `id` becomes the gateway's order id. */
  createQris(input: { id: string; amount: number; expiresAt: Date; order: Pick<Order, "customer_name" | "phone"> }): Promise<QrisCharge>;
  /** Open a virtual account for exactly `amount` rupiah at `bank`, paid by an ordinary bank transfer. */
  createVa(input: { id: string; amount: number; expiresAt: Date; bank: string; name: string; phone: string }): Promise<VaCharge>;
  /** The gateway's own view of a payment; null when the gateway does not know it (or keeps no state, like the demo). */
  getStatus(id: string): Promise<GatewayStatus | null>;
  /** Best effort: stop a pending QR from being paid (amount changed or order cancelled). */
  cancel(id: string): Promise<void>;
}

export function getGateway(): Gateway | null {
  if (midtransConfigured()) return midtrans;
  if (isDemoMode()) return mockGateway;
  return null;
}
