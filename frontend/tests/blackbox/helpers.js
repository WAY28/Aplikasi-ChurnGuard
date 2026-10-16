// Helper black-box testing -- semua interaksi lewat UI asli (isi form, klik
// tombol), TIDAK ada panggilan API langsung atau insert database, supaya
// setiap skenario benar-benar menguji apa yang dialami pengguna sungguhan.

let counter = 0;

export function uniqueEmail(prefix) {
  counter += 1;
  // JANGAN pakai TLD reserved (.test/.invalid/.example/.localhost, RFC 2606) --
  // email-validator backend menolaknya sebagai "special-use or reserved name".
  return `${prefix}-${Date.now()}-${counter}@contoh-blackbox.com`;
}

export async function registerAccount(page, { businessName, email, password }) {
  await page.goto("/register");
  await page.fill("#business_name", businessName);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.fill("#confirm_password", password);
  await page.click('button[type="submit"]');
  // Register memicu register+login berantai (lihat AuthContext.register) --
  // WAJIB tunggu sampai benar-benar pindah halaman sebelum lanjut, supaya
  // request yang belum selesai tidak ke-abort oleh navigasi berikutnya.
  await page.waitForURL(/\/upload$/, { timeout: 15000 });
}

export async function loginAccount(page, { email, password }) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
}

export async function uploadFile(page, filePath) {
  await page.goto("/upload");
  await page.setInputFiles('input[type="file"]', filePath);
  await page.click('button:has-text("Analisis")');
}
