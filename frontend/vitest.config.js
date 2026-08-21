import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    globals: true,
    css: false,
    // Default pool ("forks", child_process) macet nunggu worker merespons di
    // beberapa environment sandboxed/CI tertentu -- "threads" (worker_threads,
    // tidak spawn proses OS baru) terbukti stabil di semua environment yang
    // sudah dicoba.
    pool: "threads",
  },
});
