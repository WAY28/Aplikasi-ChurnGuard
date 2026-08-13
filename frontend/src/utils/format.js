export const CONTACT_STATUS_LABELS = {
  belum_dihubungi: "Belum Dihubungi",
  dihubungi_wa: "Sudah Dihubungi (WA)",
  dihubungi_email: "Sudah Dihubungi (Email)",
  retensi_berhasil: "Retensi Berhasil",
};

export const CONTACT_STATUS_TONE = {
  belum_dihubungi: "neutral",
  dihubungi_wa: "success",
  dihubungi_email: "info",
  retensi_berhasil: "success",
};

export function contactStatusLabel(status) {
  return CONTACT_STATUS_LABELS[status] ?? status;
}

export function contactStatusTone(status) {
  return CONTACT_STATUS_TONE[status] ?? "neutral";
}

export function riskLabel(churnPrediction) {
  return churnPrediction === 1 ? "Risiko Tinggi" : "Aman";
}

export function riskTone(churnPrediction) {
  return churnPrediction === 1 ? "danger" : "success";
}

export function formatPercent(value) {
  if (value === null || value === undefined) return "-";
  return `${Math.round(value * 100)}%`;
}

export function formatDate(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + second).toUpperCase();
}

const FEATURE_LABELS = {
  Tenure: "Lama Berlangganan",
  PreferredLoginDevice: "Perangkat Login",
  CityTier: "Tingkat Kota",
  WarehouseToHome: "Jarak Gudang ke Rumah",
  PreferredPaymentMode: "Metode Pembayaran",
  Gender: "Gender",
  HourSpendOnApp: "Jam Pemakaian Aplikasi",
  NumberOfDeviceRegistered: "Jumlah Perangkat Terdaftar",
  PreferedOrderCat: "Kategori Favorit",
  SatisfactionScore: "Skor Kepuasan",
  MaritalStatus: "Status Pernikahan",
  NumberOfAddress: "Jumlah Alamat",
  Complain: "Riwayat Komplain",
  OrderAmountHikeFromlastYear: "Kenaikan Jumlah Order",
  CouponUsed: "Kupon Dipakai",
  OrderCount: "Jumlah Order",
  DaySinceLastOrder: "Hari Sejak Order Terakhir",
  CashbackAmount: "Cashback",
};

export function featureLabel(featureName) {
  return FEATURE_LABELS[featureName] ?? featureName;
}
