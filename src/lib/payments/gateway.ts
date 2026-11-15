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

export interface GatewayStatus {
  status: Payment["status"];
  amount: number | null;
  raw: unknown;
}

export interface Gateway {
  name: Payment["provider"];
  label: string;
  /** Create a dynamic QRIS for exactly `amount` rupiah. `id` becomes the gateway's order id. */
  createQris(input: { id: string; amount: number; expiresAt: Date; order: Order }): Promise<QrisCharge>;
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
