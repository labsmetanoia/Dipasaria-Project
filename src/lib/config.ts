export const BRAND = {
  name: "Dipasaria",
  legalName: "Dipasaria",
  tagline: "Dari lelang subuh Muara Baru ke dapur Jakarta",
  promise: "Ikan pilihan dengan jenis dan ukuran yang jelas, serta ayam halal dan telur untuk dapur Anda, dalam satu pengiriman.",
  city: "Jakarta",
  cutoffLabel: "20.00 WIB",
};

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const STORAGE_LABEL: Record<string, string> = {
  chilled: "Segar 0–4 °C",
  frozen: "Beku −18 °C",
  ambient: "Suhu ruang",
};

export const UNIT_LABEL: Record<string, string> = {
  kg: "kg",
  pack: "kemasan",
  tray: "rak",
  pcs: "buah",
  bottle: "botol",
  crate: "peti",
  box: "kotak",
};

export const STATUS_LABEL: Record<string, string> = {
  new: "Baru",
  confirmed: "Dikonfirmasi",
  packing: "Dikemas",
  delivering: "Dalam pengiriman",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export const PAYMENT_LABEL: Record<string, string> = {
  qris: "QRIS",
  transfer: "Transfer bank",
  cod: "Bayar di tempat (COD)",
  terms: "Bayar tempo",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  unpaid: "Belum dibayar",
  awaiting_confirmation: "Menunggu konfirmasi",
  paid: "Lunas",
  void: "Dibatalkan",
};

export const TERMS_LABEL: Record<string, string> = {
  prepaid: "Bayar di muka",
  days3: "Tempo 3 hari",
  weekly: "Tempo mingguan",
};

export const BUSINESS_TYPES = [
  "Restoran seafood",
  "Restoran Padang / Sunda / Manado",
  "Restoran masakan Tionghoa",
  "Ayam geprek / ayam goreng tepung",
  "Kafe / dapur daring",
  "Katering",
  "Warung / pengecer produk beku",
  "Lainnya",
];
