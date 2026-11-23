// WhatsApp message templates (category: Utility, language: Indonesian "id").
// Each must be created and approved in WhatsApp Manager with exactly this name and body before the API can send it;
// docs/whatsapp-templates.md lists them for copy-paste. Variables {{1}}… are filled from the order.
import type { Order, Settings, WaKind } from "../types";
import { formatDate, formatDateTime, rupiah } from "../format";
import { trackingUrl } from "../wa";

export interface Template { name: string; label: string; body: string }

export const TEMPLATES: Record<WaKind, Template> = {
  received: {
    name: "dipasaria_pesanan_diterima",
    label: "Pesanan diterima",
    body: "Halo {{1}}, pesanan Dipasaria {{2}} sudah kami terima untuk pengiriman {{3}}. Total {{4}}.\n\nLihat status dan cara bayar: {{5}}\n\nTerima kasih.",
  },
  invoice: {
    name: "dipasaria_tagihan_akhir",
    label: "Tagihan akhir setelah ditimbang",
    body: "Halo {{1}}, pesanan {{2}} sudah ditimbang. Total akhir {{3}}. {{4}}\n\nRincian per produk: {{5}}\n\nTerima kasih.",
  },
  paid: {
    name: "dipasaria_pembayaran_diterima",
    label: "Pembayaran diterima",
    body: "Terima kasih {{1}}, pembayaran {{2}} untuk pesanan {{3}} sudah kami terima. Pesanan dikirim {{4}}.\n\nSalam segar, Dipasaria.",
  },
  delivering: {
    name: "dipasaria_dalam_pengiriman",
    label: "Dalam pengiriman",
    body: "Halo {{1}}, pesanan {{2}} sedang diantar ke alamat Anda ({{3}}).\n\nLacak pesanan: {{4}}\n\nTerima kasih.",
  },
  reminder: {
    name: "dipasaria_pengingat_bayar",
    label: "Pengingat pembayaran",
    body: "Halo {{1}}, pesanan {{2}} sebesar {{3}} belum dibayar. Mohon selesaikan sebelum {{4}} WIB agar pesanan tidak dibatalkan otomatis.\n\nBayar di sini: {{5}}\n\nTerima kasih.",
  },
  cancelled: {
    name: "dipasaria_pesanan_dibatalkan",
    label: "Pesanan dibatalkan",
    body: "Halo {{1}}, pesanan {{2}} dibatalkan karena {{3}}. Bila Anda sudah membayar, dana akan kami kembalikan.\n\nPesan kembali: {{4}}\n\nTerima kasih.",
  },
  delivered: {
    name: "dipasaria_pesanan_sampai",
    label: "Pesanan sudah diterima",
    body: "Halo {{1}}, pesanan {{2}} sudah diterima. Terima kasih!\n\nBila ada produk yang kurang segar atau tidak sesuai, laporkan dengan foto dalam 2 jam dan kami ganti atau kembalikan dananya: {{3}}\n\nSalam segar, Dipasaria.",
  },
  claim: {
    name: "dipasaria_keputusan_garansi",
    label: "Keputusan laporan garansi",
    body: "Halo {{1}}, laporan Anda untuk pesanan {{2}} sudah kami proses: {{3}}\n\nTerima kasih sudah memberi tahu kami.",
  },
  restock: {
    name: "dipasaria_stok_tersedia",
    label: "Produk tersedia lagi",
    body: "Kabar baik: {{1}} sudah tersedia lagi untuk pengiriman berikutnya.\n\nPesan di sini: {{2}}\n\nAnda menerima pesan ini karena meminta dikabari di situs Dipasaria.",
  },
  standing: {
    name: "dipasaria_pesanan_rutin",
    label: "Pesanan rutin dibuat",
    body: "Halo {{1}}, pesanan rutin untuk pengiriman {{2}} sudah dibuat dengan nomor {{3}}. {{4}}\n\nRincian: {{5}}\n\nTerima kasih.",
  },
};

/** WhatsApp rejects template parameters with line breaks, tabs or long runs of spaces. */
export function cleanParam(s: string): string {
  return s.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim().slice(0, 900) || "-";
}

export function render(body: string, params: string[]): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_, n) => params[Number(n) - 1] ?? "");
}

function payInstruction(o: Order, s: Settings, gatewayQris: boolean): string {
  switch (o.payment_method) {
    case "qris":
      return gatewayQris ? "Silakan bayar dengan QRIS di tautan di bawah; pembayaran terkonfirmasi otomatis." : "Silakan bayar dengan QRIS sesuai petunjuk di tautan di bawah.";
    case "transfer":
      return `Silakan transfer ke ${s.bank_name} ${s.bank_account} a.n. ${s.bank_holder}.`;
    case "cod":
      return "Dibayar tunai saat pesanan tiba.";
    default:
      return "Ditagihkan sesuai tempo pembayaran akun Anda.";
  }
}

const when = (o: Order) => `${formatDate(o.delivery_date, "long")}, ${o.slot_label}`;
const amount = (o: Order) => rupiah(o.total_final ?? o.total_est);

export interface BuildContext { settings: Settings; gatewayQris: boolean; reason?: string; missing?: string[]; decision?: string }

/** Template parameters for an order event, in {{1}}, {{2}}… order. */
export function buildParams(kind: WaKind, o: Order, ctx: BuildContext): string[] {
  const link = trackingUrl(o);
  const raw: Record<WaKind, string[]> = {
    received: [o.customer_name, o.code, when(o), o.total_final === null ? `± ${rupiah(o.total_est)} (final setelah ditimbang subuh)` : amount(o), link],
    invoice: [o.customer_name, o.code, amount(o), payInstruction(o, ctx.settings, ctx.gatewayQris), link],
    paid: [o.customer_name, amount(o), o.code, when(o)],
    delivering: [o.customer_name, o.code, o.slot_label, link],
    reminder: [o.customer_name, o.code, amount(o), o.pay_by ? formatDateTime(o.pay_by) : "-", link],
    cancelled: [o.customer_name, o.code, ctx.reason ?? "permintaan atau ketersediaan barang", `${link.split("/pesanan/")[0]}/belanja`],
    delivered: [o.customer_name, o.code, link],
    claim: [o.customer_name, o.code, ctx.decision ?? "-"],
    restock: [], // not tied to an order: see restockParams
    standing: [o.customer_name, when(o), o.code, ctx.missing?.length ? `Tidak tersedia malam ini: ${ctx.missing.join(" ")} Produk lainnya tetap dikirim.` : "Semua produk tersedia.", link],
  };
  return raw[kind].map(cleanParam);
}

/** Back-in-stock alert parameters: product name and the product page. */
export function restockParams(productName: string, url: string): string[] {
  return [productName, url].map(cleanParam);
}
