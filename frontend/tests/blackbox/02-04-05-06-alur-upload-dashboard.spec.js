import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";
import { registerAccount, uploadFile, uniqueEmail } from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VALID_CSV = path.join(__dirname, "fixtures", "valid_customers.csv");
const VALID_CSV_BATCH2 = path.join(__dirname, "fixtures", "valid_customers_batch2.csv");
const VALID_CSV_ROWS = 7;
const VALID_CSV_BATCH2_ROWS = 2;

// 18 atribut valid yang boleh muncul di "Faktor Utama Penyebab" -- versi label
// yang terlihat pengguna dari 18 fitur model (FEATURE_FIELD_MAP di
// backend/ml/predictor.py). Sengaja ditulis ulang di sini, BUKAN di-import
// dari frontend/src/utils/format.js, supaya test tidak sekadar mencocokkan
// kode aplikasi dengan dirinya sendiri.
const VALID_FEATURE_LABELS = [
  "Lama Berlangganan",
  "Perangkat Login",
  "Tingkat Kota",
  "Jarak Gudang ke Rumah",
  "Metode Pembayaran",
  "Gender",
  "Jam Pemakaian Aplikasi",
  "Jumlah Perangkat Terdaftar",
  "Kategori Favorit",
  "Skor Kepuasan",
  "Status Pernikahan",
  "Jumlah Alamat",
  "Riwayat Komplain",
  "Kenaikan Jumlah Order",
  "Kupon Dipakai",
  "Jumlah Order",
  "Hari Sejak Order Terakhir",
  "Cashback",
];

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
    // Baris pelanggan = tautan yang nama aksesibelnya memuat "skor risiko".
    await page.getByRole("link", { name: /skor risiko/ }).first().click();

    await expect(page).toHaveURL(/\/customers\/\d+$/);

    // Skor risiko tampil sebagai persen. (Satu-satunya elemen yang dicari lewat
    // data-testid: nilainya tidak punya role maupun teks unik -- "65%" mirip
    // dengan nilai faktor seperti "0%".)
    const score = page.getByTestId("risk-score");
    await expect(score).toBeVisible();
    const scoreText = (await score.textContent()).trim();
    expect(scoreText).toMatch(/^\d+%$/);
    const scorePercent = parseInt(scoreText, 10);

    // Badge KELAS PREDIKSI dicari lewat teksnya yang persis ("Risiko Tinggi" atau
    // "Aman"), jadi badge status kontak ("Belum Dihubungi", dst.) di halaman yang
    // sama tidak mungkin ikut terambil. toHaveCount(1) memastikan memang hanya
    // ada satu.
    const classBadge = page.getByText(/^(Risiko Tinggi|Aman)$/);
    await expect(classBadge).toHaveCount(1);
    const classLabel = (await classBadge.textContent()).trim();

    // Badge harus cocok dengan skor. Skor ditampilkan dibulatkan, jadi tepat di
    // 50% tidak bisa ditentukan kelasnya dari angka yang terlihat (mis. 49,6%
    // tampil "50%" tapi kelasnya Aman) -- pada kasus itu keduanya diterima.
    if (scorePercent > 50) {
      expect(classLabel).toBe("Risiko Tinggi");
    } else if (scorePercent < 50) {
      expect(classLabel).toBe("Aman");
    } else {
      expect(["Risiko Tinggi", "Aman"]).toContain(classLabel);
    }

    // Faktor penyebab: judul bagian + daftar faktor.
    await expect(page.getByRole("heading", { name: "Faktor Utama Penyebab" })).toBeVisible();
    const factorItems = page
      .getByRole("list", { name: "Faktor utama penyebab churn" })
      .getByRole("listitem");
    await expect(factorItems.first()).toBeVisible();
    const factorTexts = (await factorItems.allTextContents()).map((t) => t.trim());
    expect(factorTexts.length).toBeGreaterThan(0);
    expect(factorTexts.length).toBeLessThanOrEqual(VALID_FEATURE_LABELS.length);

    // Tiap baris berbentuk "<nama atribut><+/-nilai>%"; nama harus salah satu
    // dari 18 atribut valid, dan tidak boleh ada atribut yang muncul dua kali.
    const factorNames = factorTexts.map((text) => {
      const parsed = text.match(/^(.+?)([+-]?\d+%)$/);
      expect(parsed, `baris faktor tidak berbentuk "<nama><nilai>%": "${text}"`).not.toBeNull();
      expect(VALID_FEATURE_LABELS, `atribut "${parsed[1]}" bukan salah satu dari 18 atribut valid`).toContain(parsed[1]);
      return parsed[1];
    });
    expect(new Set(factorNames).size).toBe(factorNames.length);

    // Tunggu animasi bar selesai (transisi 0,7s + jeda bertahap) supaya
    // screenshot menunjukkan bar terisi penuh, bukan di tengah animasi.
    await page.waitForTimeout(1500);

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
