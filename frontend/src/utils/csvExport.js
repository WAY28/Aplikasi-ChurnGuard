import { listCustomers } from "../api/endpoints";
import { contactStatusLabel, formatDate, riskLabel } from "./format";

const EXPORT_PAGE_SIZE = 200;
const EXPORT_COLUMNS = [
  { header: "Nama", get: (c) => c.name || "" },
  { header: "Telepon", get: (c) => c.phone || "" },
  { header: "Email", get: (c) => c.email || "" },
  { header: "Status Risiko", get: (c) => riskLabel(c.churn_prediction) },
  { header: "Skor Risiko (%)", get: (c) => (c.churn_probability != null ? Math.round(c.churn_probability * 100) : "") },
  { header: "Status Kontak", get: (c) => contactStatusLabel(c.contact_status) },
  { header: "Lama Berlangganan", get: (c) => c.tenure ?? "" },
  { header: "Skor Kepuasan", get: (c) => c.satisfaction_score ?? "" },
  { header: "Jumlah Order", get: (c) => c.order_count ?? "" },
  { header: "Hari Sejak Order Terakhir", get: (c) => c.day_since_last_order ?? "" },
  { header: "Metode Pembayaran", get: (c) => c.preferred_payment_mode || "" },
  { header: "Kategori Favorit", get: (c) => c.prefered_order_cat || "" },
  { header: "Tanggal Ditambahkan", get: (c) => formatDate(c.created_at) },
];

function escapeCsvField(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(customers) {
  const headerRow = EXPORT_COLUMNS.map((col) => escapeCsvField(col.header)).join(",");
  const rows = customers.map((c) => EXPORT_COLUMNS.map((col) => escapeCsvField(col.get(c))).join(","));
  return [headerRow, ...rows].join("\n");
}

function downloadCsv(content, filename) {
  // BOM supaya Excel mengenali UTF-8 dengan benar (karakter "é", "ü", dsb kalau ada).
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Ambil SEMUA pelanggan yang cocok filter aktif (bukan cuma halaman yang lagi
// ditampilkan) dengan menarik tiap halaman berurutan, lalu unduh sebagai CSV.
export async function exportCustomersToCsv(filters) {
  let page = 1;
  let all = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = await listCustomers({ ...filters, page, limit: EXPORT_PAGE_SIZE });
    all = all.concat(result.items);
    if (page >= result.total_pages || result.items.length === 0) break;
    page += 1;
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  downloadCsv(toCsv(all), `churnguard-dashboard-${dateStr}.csv`);
  return all.length;
}
