import { defineConfig, devices } from "@playwright/test";

// Black-box testing (Tabel 5, artikel) -- menguji lewat UI browser seperti
// pengguna asli, TIDAK bergantung pada detail implementasi internal.
// Backend (localhost:8000) dan frontend dev server (localhost:5173) harus
// sudah jalan sebelum test ini dijalankan (lihat tests/blackbox/README.md).
export default defineConfig({
  testDir: "./tests/blackbox",
  fullyParallel: false, // urutan skenario penting & saling berbagi akun/data
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "tests/blackbox/report", open: "never" }]],
  timeout: 30_000,
  use: {
    // Default: dev server lokal. Untuk menguji situs yang sudah di-deploy,
    // set BASE_URL (mis. $env:BASE_URL="https://aplikasi-churn-guard.vercel.app").
    baseURL: process.env.BASE_URL || "http://localhost:5173",
    screenshot: "on",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
