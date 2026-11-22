import { downloadFile } from "../api/client";

// Template dibuat di backend (GET /api/template) supaya dropdown dan batas
// nilainya selalu sinkron dengan model. Dipakai halaman Upload dan Coba Tanpa Akun.
export async function downloadTemplateXlsx() {
  const blob = await downloadFile("/template");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "template-churnguard.xlsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
