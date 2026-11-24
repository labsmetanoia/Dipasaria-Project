// Demo gateway (demo mode only): issues a QR that encodes a demo payload, or a made-up virtual-account number, keeps
// no state of its own, and is "paid" with the Simulasikan pembayaran button on the tracking or statement page.
import "server-only";
import type { Gateway } from "./gateway";

export const mockGateway: Gateway = {
  name: "mock",
  label: "Gateway demo (tanpa uang sungguhan)",
  async createQris({ id, amount, expiresAt }) {
    return { qr_string: `DIPASARIA-DEMO-QRIS|${id}|IDR${Math.round(amount)}`, qr_url: null, expires_at: expiresAt.toISOString() };
  },
  async createVa({ id, bank, expiresAt }) {
    // a made-up number in the shape of a real one: bank prefix + 12 digits derived from the payment id
    let h = 0;
    for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return { bank, va_number: `8808${String(h).padStart(10, "0").slice(-10)}${String(id.length).padStart(2, "0")}`, expires_at: expiresAt.toISOString() };
  },
  async getStatus() {
    return null;
  },
  async cancel() {},
};
