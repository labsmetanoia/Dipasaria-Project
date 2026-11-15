// Demo gateway (demo mode only): issues a QR that encodes a demo payload, keeps no state of its own,
// and is "paid" with the Simulasikan pembayaran button on the tracking page.
import "server-only";
import type { Gateway } from "./gateway";

export const mockGateway: Gateway = {
  name: "mock",
  label: "Gateway demo (tanpa uang sungguhan)",
  async createQris({ id, amount, expiresAt }) {
    return { qr_string: `DIPASARIA-DEMO-QRIS|${id}|IDR${Math.round(amount)}`, qr_url: null, expires_at: expiresAt.toISOString() };
  },
  async getStatus() {
    return null;
  },
  async cancel() {},
};
