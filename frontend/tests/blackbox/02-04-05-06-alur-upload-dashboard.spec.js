import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";
import { registerAccount, uploadFile, uniqueEmail } from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VALID_CSV = path.join(__dirname, "fixtures", "valid_customers.csv");
const VALID_CSV_BATCH2 = path.join(__dirname, "fixtures", "valid_customers_batch2.csv");
const VALID_CSV_ROWS = 7;
const VALID_CSV_BATCH2_ROWS = 2;

// Skenario 2, 4, 5, 6 digabung jadi satu alur berurutan (test.describe.serial)
// karena secara alami mengikuti perjalanan pengguna sungguhan: upload -> lihat
// dashboard -> buka detail salah satu pelanggan -> upload lagi -> cek riwayat.
// Satu akun dipakai bersama sepanjang file ini (bukan reset tiap test).
test.describe.serial("alur upload -> dashboard -> detail -> riwayat", () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    const email = uniqueEmail("skenario2456");
    await registerAccount(page, { businessName: "Toko Skenario Alur", email, password: "PasswordUji123" });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("Skenario 2: upload file CSV valid diterima dan diproses", async () => {
    await uploadFile(page, VALID_CSV);

    // Diterima & diproses: redirect ke dashboard dengan upload_session_id,
    // TIDAK ada pesan error tersisa di halaman.
    await expect(page).toHaveURL(/\/dashboard\?upload_session_id=\d+/);
    await expect(page.locator(".error-banner")).toHaveCount(0);
    await page.screenshot({ path: "tests/blackbox/screenshots/02-upload-valid-diterima.png", fullPage: true });
  });

  test("Skenario 4: dashboard menyajikan ringkasan hasil prediksi sesuai data yang diupload", async () => {
    await page.goto("/dashboard");
    await page.waitForTimeout(600); // animasi count-up MetricCard

    const totalCard = page.locator(".metric-card", { hasText: "Total Pelanggan" });
    await expect(totalCard.locator(".metric-card-value")).toHaveText(String(VALID_CSV_ROWS));

    const akurasiCard = page.locator(".metric-card", { hasText: "Akurasi Model" });
    await expect(akurasiCard.locator(".metric-card-value")).toHaveText("98,05%");

    // Jumlah baris pelanggan yang benar-benar tampil di daftar harus sama
    // dengan jumlah baris file yang diupload.
    await expect(page.locator(".customer-row")).toHaveCount(VALID_CSV_ROWS);

    await page.screenshot({ path: "tests/blackbox/screenshots/04-dashboard-ringkasan.png", fullPage: true });
  });

  test("Skenario 5: detail pelanggan menampilkan kelas prediksi dan faktor penyebab", async () => {
    await page.goto("/dashboard");
    await page.locator(".customer-row").first().click();

    await expect(page).toHaveURL(/\/customers\/\d+$/);

    // Kelas prediksi (badge Aman/Risiko Tinggi) + skor persen harus tampil.
    const badge = page.locator(".badge").first();
    await expect(badge).toBeVisible();
    await expect(page.locator(".customer-detail-score-value")).toBeVisible();
    const scoreText = await page.locator(".customer-detail-score-value").textContent();
    expect(scoreText.trim()).toMatch(/^\d+%$/);

    // Minimal satu faktor penyebab (feature importance) tampil dengan nama + nilai.
    await expect(page.getByText("Faktor Utama Penyebab")).toBeVisible();
    const factorRows = page.locator(".feature-bar-item");
    expect(await factorRows.count()).toBeGreaterThan(0);

    await page.screenshot({ path: "tests/blackbox/screenshots/05-detail-pelanggan.png", fullPage: true });
  });

  test("Skenario 6: riwayat upload menampilkan semua sesi yang terasosiasi ke akun ini", async () => {
    await uploadFile(page, VALID_CSV_BATCH2);
    await expect(page).toHaveURL(/\/dashboard\?upload_session_id=\d+/);

    await page.goto("/riwayat");
    await expect(page.locator(".history-row")).toHaveCount(2);

    // Kedua riwayat memang tercatat dengan jumlah pelanggan sesuai file masing-masing.
    const rowsText = await page.locator(".history-row").allTextContents();
    expect(rowsText.some((t) => t.includes(`${VALID_CSV_ROWS} pelanggan`))).toBeTruthy();
    expect(rowsText.some((t) => t.includes(`${VALID_CSV_BATCH2_ROWS} pelanggan`))).toBeTruthy();

    await page.screenshot({ path: "tests/blackbox/screenshots/06-riwayat-upload.png", fullPage: true });
  });
});
