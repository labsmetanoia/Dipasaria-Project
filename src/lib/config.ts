export const BRAND = {
  name: "Dipasaria",
  legalName: "Dipasaria",
  tagline: "Protein pilihan untuk dapur Jakarta",
  promise: "Ikan yang benar, bernama dan bergrade, bersama semua kebutuhan protein dapur Anda dalam satu pengiriman.",
  city: "Jakarta",
  cutoffLabel: "20:00 WIB",
};

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const STORAGE_LABEL: Record<string, string> = {
  chilled: "Segar 0–4 °C",
  frozen: "Beku −18 °C",
  ambient: "Suhu ruang",
};

export const UNIT_LABEL: Record<string, string> = {
  kg: "kg",
  pack: "pack",
  tray: "tray",
  pcs: "pcs",
  bottle: "botol",
  crate: "peti",
  box: "box",
};

export const STATUS_LABEL: Record<string, string> = {
  new: "Baru",
  confirmed: "Dikonfirmasi",
  packing: "Dikemas",
  delivering: "Dikirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export const PAYMENT_LABEL: Record<string, string> = {
  qris: "QRIS",
  transfer: "Transfer bank",
  cod: "Bayar saat terima (COD)",
  terms: "Tempo mingguan",
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
  "Chinese-Indonesian",
  "Ayam geprek / fried chicken",
  "Kafe / cloud kitchen",
  "Katering",
  "Warung / reseller frozen",
  "Lainnya",
];
