import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";
import { registerAccount, uploadFile, uniqueEmail } from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VALID_CSV = path.join(__dirname, "fixtures", "valid_customers.csv");

// Skenario 7: Isolasi data antarakun -- Data akun lain tidak dapat diakses.
// Dua browser context TERPISAH (cookie tidak dibagi) supaya benar-benar
// mensimulasikan dua pengguna berbeda, bukan cuma dua tab dari sesi yang sama.

test("akun lain tidak bisa melihat atau mengakses langsung data akun ini", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    // Akun A: upload data, catat URL detail salah satu pelanggannya.
    const emailA = uniqueEmail("skenario7-a");
    await registerAccount(pageA, { businessName: "Toko Rahasia A", email: emailA, password: "PasswordUji123" });
    await uploadFile(pageA, VALID_CSV);
    await expect(pageA).toHaveURL(/\/dashboard\?upload_session_id=\d+/);

    await pageA.locator(".customer-row").first().click();
    await expect(pageA).toHaveURL(/\/customers\/(\d+)$/);
    const customerUrlA = pageA.url();
    const customerIdA = customerUrlA.match(/\/customers\/(\d+)$/)[1];

    // Akun B: akun baru, tidak pernah upload apa pun.
    const emailB = uniqueEmail("skenario7-b");
    await registerAccount(pageB, { businessName: "Toko Lain B", email: emailB, password: "PasswordUji123" });

    // Dashboard Akun B harus kosong -- TIDAK menampilkan data milik Akun A.
    await pageB.goto("/dashboard");
    await pageB.waitForTimeout(600);
    await expect(pageB.getByText("Belum ada pelanggan")).toBeVisible();
    await expect(pageB.locator(".customer-row")).toHaveCount(0);

    // Akun B mencoba akses LANGSUNG lewat URL detail pelanggan milik Akun A.
    await pageB.goto(customerUrlA);
    // Ditolak dengan jelas (bukan malah menampilkan data Akun A) --
    // lihat komentar NFR-4 di backend: 404 "tidak ditemukan", disengaja
    // BUKAN 403, supaya keberadaan ID pelanggan orang lain pun tidak bocor.
    await expect(pageB.getByText("Pelanggan tidak ditemukan")).toBeVisible();
    await expect(pageB.getByText(customerIdA)).toHaveCount(0);

    // Riwayat upload Akun B juga harus kosong -- tidak ikut menampilkan sesi Akun A.
    await pageB.goto("/riwayat");
    await expect(pageB.locator(".history-row")).toHaveCount(0);

    await pageA.screenshot({ path: "tests/blackbox/screenshots/07a-akun-a-datanya.png", fullPage: true });
    await pageB.screenshot({ path: "tests/blackbox/screenshots/07b-akun-b-ditolak-akses.png", fullPage: true });
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
