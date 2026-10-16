import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";
import { registerAccount, uploadFile, uniqueEmail } from "./helpers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Skenario 3: Unggah berkas dengan struktur tidak valid -- Pesan validasi ditampilkan.
// invalid_customers.csv sengaja hilang 3 kolom wajib (tenure, satisfaction_score,
// preferred_login_device) supaya validasi backend menolaknya.

test("upload file dengan kolom wajib hilang menampilkan pesan validasi, bukan crash", async ({ page }) => {
  const email = uniqueEmail("skenario3");
  await registerAccount(page, { businessName: "Toko Skenario Tiga", email, password: "PasswordUji123" });

  await uploadFile(page, path.join(__dirname, "fixtures", "invalid_customers.csv"));

  // Harus tetap di halaman upload (tidak redirect seolah sukses).
  await expect(page).toHaveURL(/\/upload$/);

  // Pesan error harus benar-benar terlihat pengguna dan cukup jelas
  // (menyebut kolom yang bermasalah), bukan halaman kosong / 500 mentah.
  const errorBanner = page.locator(".error-banner");
  await expect(errorBanner).toBeVisible();
  const message = await errorBanner.textContent();
  expect(message.toLowerCase()).toContain("kolom");

  await page.screenshot({ path: "tests/blackbox/screenshots/03-upload-tidak-valid.png", fullPage: true });
});
