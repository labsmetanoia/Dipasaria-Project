// Prepared WhatsApp messages. The owner taps a button in the back-office, WhatsApp opens with the text filled in.
import type { Order, Settings, BusinessAccount } from "./types";
import { rupiah, formatDate, waLink } from "./format";
import { SITE_URL } from "./config";

export function trackingUrl(o: Order): string {
  return `${SITE_URL}/pesanan/${o.code}?hp=${o.phone}`;
}

function itemLines(o: Order, final = false): string {
  return o.items
    .map((i) => {
      const q = final && i.qty_final !== null ? i.qty_final : i.qty_ordered;
      const prep = i.prep_label ? ` (${i.prep_label.toLowerCase()})` : "";
      const total = final && i.line_total_final !== null ? i.line_total_final : i.line_total_est;
      return `• ${i.product_name} ${i.variant_label}${prep}: ${q} ${i.unit} — ${rupiah(total)}`;
    })
    .join("\n");
}

export function msgOrderConfirmed(o: Order, s: Settings): string {
  const est = o.has_catch_weight ? " (perkiraan, ditimbang sebelum dikirim)" : "";
  return [
    `Halo ${o.customer_name}, pesanan Anda di ${s.store_name} sudah kami terima. 🙏`,
    ``,
    `No. pesanan: *${o.code}*`,
    `Pengiriman: ${formatDate(o.delivery_date)}, ${o.slot_label}`,
    ``,
    itemLines(o),
    ``,
    `Total${est}: *${rupiah(o.total_est)}*`,
    o.has_catch_weight ? `\nIkan segar ditimbang subuh; invoice final menyusul sebelum pengiriman.` : "",
    `Lacak pesanan: ${trackingUrl(o)}`,
  ].join("\n");
}

export function msgFinalInvoice(o: Order, s: Settings): string {
  const total = o.total_final ?? o.total_est;
  const pay =
    o.payment_method === "qris" ? `Pembayaran QRIS a.n. ${s.bank_holder}. Scan QR di halaman pesanan, lalu tekan "Saya sudah bayar".`
    : o.payment_method === "transfer" ? `Transfer ke ${s.bank_name} ${s.bank_account} a.n. ${s.bank_holder}.`
    : o.payment_method === "cod" ? `Pembayaran saat barang diterima.`
    : `Ditagihkan sesuai tempo akun Anda.`;
  return [
    `Invoice final ${s.store_name} — *${o.code}*`,
    `${o.customer_name} · ${formatDate(o.delivery_date)}, ${o.slot_label}`,
    ``,
    itemLines(o, true),
    ``,
    o.discount ? `Diskon: −${rupiah(o.discount)}` : "",
    `Ongkir: ${o.delivery_fee ? rupiah(o.delivery_fee) : "Gratis"}`,
    `*Total: ${rupiah(total)}*`,
    ``,
    pay,
    `Detail: ${trackingUrl(o)}`,
  ].filter((l) => l !== "").join("\n");
}

export function msgOutForDelivery(o: Order, s: Settings): string {
  return `Halo ${o.customer_name}, pesanan *${o.code}* dari ${s.store_name} sedang dalam perjalanan untuk slot ${o.slot_label}. Mohon siapkan penerimaan di: ${o.address}. Terima kasih! 🐟`;
}

export function msgAccessCode(a: BusinessAccount, s: Settings): string {
  return [
    `Halo ${a.contact_name}, akun bisnis *${a.business_name}* di ${s.store_name} sudah aktif. 🎉`,
    ``,
    `Masuk di ${SITE_URL}/akun dengan:`,
    `• Nomor WhatsApp: ${a.phone}`,
    `• Kode akses: *${a.access_code}*`,
    ``,
    `Setelah masuk, Anda melihat harga grosir, slot dapur 05:00–08:00 dan bisa "Pesan lagi" dari pesanan sebelumnya. Batas pesan untuk pengiriman besok: 20:00 WIB.`,
  ].join("\n");
}

export function waTo(phone: string, text: string): string {
  return waLink(phone, text);
}

export function msgCustomerPaid(o: Order, s: Settings): string {
  return `Halo ${s.store_name}, saya sudah membayar pesanan *${o.code}* sebesar ${rupiah(o.total_final ?? o.total_est)}. Mohon dicek. Terima kasih.`;
}

export function msgCustomerAsk(code: string, s: Settings): string {
  return `Halo ${s.store_name}, saya ingin bertanya tentang pesanan *${code}*.`;
}
