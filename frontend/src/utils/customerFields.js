// Harus sinkron dengan backend/constants.py (CUSTOMER_FEATURE_FIELDS) dan
// backend/ml/predictor.py (CATEGORY_MAPS) -- urutan & nama field snake_case.
export const CUSTOMER_FEATURE_FIELDS = [
  "tenure",
  "warehouse_to_home",
  "hour_spend_on_app",
  "number_of_device_registered",
  "satisfaction_score",
  "number_of_address",
  "complain",
  "order_amount_hike",
  "coupon_used",
  "order_count",
  "day_since_last_order",
  "cashback_amount",
  "preferred_login_device",
  "preferred_payment_mode",
  "gender",
  "prefered_order_cat",
  "marital_status",
  "city_tier",
];

export const CATEGORY_OPTIONS = {
  preferred_login_device: ["Computer", "Mobile Phone", "Phone"],
  preferred_payment_mode: ["CC", "COD", "Cash on Delivery", "Credit Card", "Debit Card", "E wallet", "UPI"],
  gender: ["Female", "Male"],
  prefered_order_cat: ["Fashion", "Grocery", "Laptop & Accessory", "Mobile", "Mobile Phone", "Others"],
  marital_status: ["Divorced", "Married", "Single"],
  city_tier: ["1", "2", "3"],
};

export const MANUAL_FORM_FIELDS = [
  { name: "tenure", label: "Lama Berlangganan (bulan)", type: "number", step: "0.1" },
  { name: "warehouse_to_home", label: "Jarak Gudang ke Rumah (km)", type: "number", step: "0.1" },
  { name: "hour_spend_on_app", label: "Jam Pemakaian Aplikasi", type: "number", step: "0.1" },
  { name: "number_of_device_registered", label: "Jumlah Perangkat Terdaftar", type: "number", step: "1" },
  { name: "satisfaction_score", label: "Skor Kepuasan (1-5)", type: "number", step: "1" },
  { name: "number_of_address", label: "Jumlah Alamat", type: "number", step: "1" },
  { name: "order_amount_hike", label: "Kenaikan Order dari Tahun Lalu (%)", type: "number", step: "0.1" },
  { name: "coupon_used", label: "Jumlah Kupon Dipakai", type: "number", step: "1" },
  { name: "order_count", label: "Jumlah Order", type: "number", step: "1" },
  { name: "day_since_last_order", label: "Hari Sejak Order Terakhir", type: "number", step: "1" },
  { name: "cashback_amount", label: "Rata-rata Cashback", type: "number", step: "0.1" },
  { name: "preferred_login_device", label: "Perangkat Login", type: "select" },
  { name: "preferred_payment_mode", label: "Metode Pembayaran", type: "select" },
  { name: "gender", label: "Gender", type: "select" },
  { name: "prefered_order_cat", label: "Kategori Favorit", type: "select" },
  { name: "marital_status", label: "Status Pernikahan", type: "select" },
  { name: "city_tier", label: "Tingkat Kota", type: "select" },
];

export function emptyManualForm() {
  const base = { name: "", phone: "", email: "", complain: false };
  for (const field of MANUAL_FORM_FIELDS) {
    if (field.type === "select") {
      base[field.name] = CATEGORY_OPTIONS[field.name][0];
    } else {
      base[field.name] = "";
    }
  }
  return base;
}

export function buildCustomerPayload(form) {
  const payload = {
    name: form.name || null,
    phone: form.phone || null,
    email: form.email || null,
  };
  for (const field of MANUAL_FORM_FIELDS) {
    const raw = form[field.name];
    if (field.type === "select") {
      payload[field.name] = field.name === "city_tier" ? Number(raw) : raw;
    } else {
      payload[field.name] = raw === "" ? null : Number(raw);
    }
  }
  payload.complain = form.complain ? 1 : 0;
  return payload;
}
