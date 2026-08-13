import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/*.png"],
      manifest: {
        id: "/",
        name: "ChurnGuard - Prediksi Churn Pelanggan UMKM",
        short_name: "ChurnGuard",
        description: "Deteksi dini pelanggan UMKM yang berisiko berhenti bertransaksi.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#f5f7fa",
        theme_color: "#0f1e3d",
        orientation: "portrait-primary",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        // Backend API ada di origin lain (port 8000) dan requestnya butuh header
        // Authorization (preflighted). Membiarkan service worker meng-intersep
        // fetch cross-origin semacam itu (lewat runtimeCaching) terbukti membuat
        // request GAGAL TOTAL (net::ERR_FAILED), bukan cuma gagal di-cache --
        // jadi sengaja TIDAK diintersep di sini. NFR-13 (data terakhir tetap
        // tampil saat offline) diimplementasikan di level aplikasi lewat
        // localStorage, lihat src/utils/offlineCache.js.
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
