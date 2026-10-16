import { test, expect } from "@playwright/test";
import { registerAccount, loginAccount, uniqueEmail } from "./helpers.js";

// Skenario 1: Registrasi dan autentikasi pengguna -- Sesi pengguna terbentuk.

test("registrasi akun baru membentuk sesi dan mengarah ke halaman kerja", async ({ page }) => {
  const email = uniqueEmail("skenario1");
  await registerAccount(page, { businessName: "Toko Skenario Satu", email, password: "PasswordUji123" });

  // Sesi terbentuk: diarahkan ke halaman yang butuh login (bukan tetap di /register).
  await expect(page).toHaveURL(/\/upload$/);
  await page.screenshot({ path: "tests/blackbox/screenshots/01a-setelah-registrasi.png", fullPage: true });

  // Halaman yang butuh auth benar-benar bisa diakses tanpa dilempar balik ke /login.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator("h1")).toHaveText("Dashboard");
});

test("logout lalu login ulang dengan kredensial benar berhasil membentuk sesi lagi", async ({ page }) => {
  const email = uniqueEmail("skenario1b");
  const password = "PasswordUji123";
  await registerAccount(page, { businessName: "Toko Skenario Satu B", email, password });
  await expect(page).toHaveURL(/\/upload$/);

  await page.getByRole("button", { name: /Toko Skenario Satu B/ }).click();
  await page.getByRole("menuitem", { name: "Keluar" }).click();
  await expect(page).toHaveURL(/\/login$/);

  // Setelah logout, halaman terproteksi harus menolak dan melempar ke /login.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);

  await loginAccount(page, { email, password });
  await expect(page).toHaveURL(/\/upload$/);
  await page.screenshot({ path: "tests/blackbox/screenshots/01b-login-ulang-berhasil.png", fullPage: true });
});

test("login dengan password salah ditolak dan tidak membentuk sesi", async ({ page }) => {
  const email = uniqueEmail("skenario1c");
  await registerAccount(page, { businessName: "Toko Skenario Satu C", email, password: "PasswordUji123" });
  await page.getByRole("button", { name: /Toko Skenario Satu C/ }).click();
  await page.getByRole("menuitem", { name: "Keluar" }).click();
  // WAJIB tunggu logout benar-benar selesai sebelum navigasi lagi, kalau tidak
  // request logout yang masih berjalan terputus dan sesi tetap hidup.
  await expect(page).toHaveURL(/\/login$/);

  await loginAccount(page, { email, password: "PasswordSalahBanget999" });

  // Tetap di halaman login, pesan error terlihat pengguna, TIDAK diarahkan ke /upload.
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator(".error-banner")).toBeVisible();
  await page.screenshot({ path: "tests/blackbox/screenshots/01c-login-password-salah.png", fullPage: true });

  // Pastikan memang belum ada sesi -- halaman terproteksi tetap menolak.
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});
