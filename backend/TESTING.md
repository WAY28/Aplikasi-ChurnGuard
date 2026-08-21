# Testing & CI

## Backend (pytest)

```bash
cd backend
pip install -r requirements-dev.txt
pytest -v
```

Test suite pakai **SQLite** (file sementara, dibuat otomatis per sesi test),
BUKAN Postgres yang dipakai production -- lihat komentar lengkap di
`tests/conftest.py`. Trade-off yang disengaja: tidak butuh service database
sama sekali untuk jalanin test (baik lokal maupun di CI), dengan konsekuensi
perilaku yang murni spesifik-Postgres tidak tercakup.

Cakupan saat ini:
- `tests/test_predictor.py` -- unit test murni `ml/predictor.py` (tidak butuh HTTP/DB), termasuk golden-value test dari profil pelanggan yang sudah divalidasi manual
- `tests/test_schemas.py` -- unit test validator kekuatan password
- `tests/test_auth.py` -- integration test lewat `TestClient`: register/login/refresh (rotasi + deteksi reuse)/logout (revoke di DB)/isolasi data antar akun (NFR-4)

## Frontend (vitest)

```bash
cd frontend
npm install
npm test          # sekali jalan
npm run test:watch  # mode watch
```

Cakupan saat ini: fungsi murni (`utils/password.js`, `utils/format.js`),
komponen (`Badge`, `Pagination`, `ConfirmDialog`), dan satu contoh test
halaman dengan `useAuth()` di-mock (`pages/Login.test.jsx`).

Catatan: `vitest.config.js` sengaja set `pool: "threads"` -- pool default
("forks") pernah macet nunggu worker merespons di environment sandboxed
tertentu, "threads" terbukti stabil di semua environment yang sudah dicoba.

## CI (GitHub Actions)

`.github/workflows/ci.yml` menjalankan kedua test suite di atas otomatis
setiap `push` dan `pull_request`, di job terpisah (`backend-tests`,
`frontend-tests`) supaya keduanya jalan paralel dan hasilnya independen.
