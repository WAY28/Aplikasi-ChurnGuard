// Cache data terakhir di localStorage supaya tetap bisa ditampilkan saat
// offline (NFR-13 / FR-13). Lihat catatan di vite.config.js soal kenapa ini
// dilakukan di level aplikasi, bukan lewat service worker.
const PREFIX = "churnguard_cache_";

export function saveCache(key, data) {
  try {
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify({ data, cachedAt: Date.now() }));
  } catch {
    /* localStorage penuh/tidak tersedia -- abaikan, bukan fatal */
  }
}

export function loadCache(key) {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
