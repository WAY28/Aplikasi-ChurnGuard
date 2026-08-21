# Architecture — ChurnGuard

## 1. Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React (Vite) + PWA plugin (vite-plugin-pwa) |
| Backend | Python + FastAPI |
| Model ML | scikit-learn Random Forest (model_churn.pkl) |
| Database | PostgreSQL 16 (terpasang langsung, tanpa container) |
| Migrasi skema | Alembic (lihat `backend/MIGRATIONS.md`) |
| ORM | SQLAlchemy |
| Auth | JWT access token (python-jose, 15 menit) + refresh token acak (bisa direvoke) di cookie httpOnly, bcrypt untuk hash password |
| Rate limiting | slowapi + penghitung custom untuk login (lihat `backend/rate_limit.py`) |
| Testing | pytest (backend, SQLite) + vitest (frontend) |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |
| Logging | Python `logging` module terstruktur (`backend/logging_config.py`) |

## 2. Diagram Arsitektur

```
                        ┌───────────────────┐
                        │  Pengguna/Browser  │
                        └─────────┬──────────┘
                                  │
                                  v
┌────────────────────────┐ fetch+cookie httpOnly ┌──────────────────────────┐
│   React PWA Frontend    │ ─────────────────────> │      FastAPI Backend      │
│  (Vite, manifest.json,  │ <───────────────────── │  (access+refresh token,   │
│   service worker)       │     JSON hasil          │   endpoint prediksi &    │
└──────────────────────────┘                        │   data, rate limiting)   │
                                                      └────────────┬───┬──────────┘
                                                                   │   │
                                                    ┌──────────────┘   └──────────────┐
                                                    v                                 v
                                        ┌─────────────────────┐          ┌──────────────────────┐
                                        │      PostgreSQL       │          │  Model Random Forest  │
                                        │ (users, customers,    │          │  model_churn.pkl       │
                                        │  upload_sessions,      │          │  (dimuat sekali saat   │
                                        │  password_reset_tokens,│          │   backend start)       │
                                        │  refresh_tokens)       │          └──────────────────────┘
                                        └─────────────────────┘
```

Catatan: Frontend **tidak pernah** mengakses database secara langsung — semua akses ke PostgreSQL dan model ML wajib melalui Backend. Token akses/refresh disimpan di cookie `httpOnly` (bukan localStorage) — JavaScript di frontend tidak pernah bisa membacanya, cuma browser yang mengirimkannya otomatis lewat `credentials: "include"`.

## 3. Environment Variables
Daftar lengkap (~20 variabel: database, JWT, cookie, rate limit, email lupa
password, CORS, logging, proteksi /docs) ada di `backend/.env.example` --
**itu satu-satunya sumber kebenarannya**, sengaja tidak diduplikasi di sini
supaya tidak basi lagi kalau ada variabel baru. File itu juga punya
checklist eksplisit variabel mana yang WAJIB diubah saat deploy production
(Render), bukan dibiarkan nilai default lokalnya.

Frontend cuma butuh satu: `VITE_API_BASE_URL` (lihat `frontend/.env.example`).

## 4. Alur Prediksi (Backend)
1. Request masuk (dari upload atau form manual), cookie `access_token` ikut terkirim otomatis oleh browser
2. Backend validasi JWT dari cookie tersebut → dapat `user_id` (kalau kedaluwarsa, frontend otomatis coba `/auth/refresh` sekali dulu sebelum request ini diulang -- lihat bagian 6)
3. Data diproses jadi format yang sama seperti saat training (urutan kolom harus sama persis — lihat `database.md`)
4. `model.predict()` dan `model.predict_proba()` dipanggil (model sudah dimuat di memori sejak backend start, tidak load ulang tiap request)
5. Hasil disimpan ke tabel `customers` dengan `user_id` yang benar
6. Response dikembalikan ke frontend

## 5. Struktur Folder (Kondisi Sekarang)
```
churnguard/
├── .github/workflows/ci.yml   # pytest + vitest otomatis tiap push/PR
├── backend/
│   ├── main.py                # setup app, middleware, logging, proteksi /docs
│   ├── models.py               # SQLAlchemy models (5 tabel, lihat database.md)
│   ├── schemas.py               # Pydantic request/response models
│   ├── auth.py                  # JWT access token + refresh token + cookie helper
│   ├── rate_limit.py            # slowapi + penghitung login gagal custom
│   ├── email_utils.py           # kirim email reset password (Resend/SMTP/log)
│   ├── logging_config.py        # format logging terpusat
│   ├── config.py                # baca semua env var
│   ├── .env / .env.example
│   ├── alembic/                 # migrasi skema (lihat MIGRATIONS.md)
│   ├── ml/
│   │   └── model_churn.pkl
│   ├── routers/
│   │   ├── auth.py               # register/login/refresh/logout/me/forgot/reset
│   │   ├── account.py            # PATCH+DELETE /account
│   │   ├── customers.py
│   │   └── upload_sessions.py
│   ├── tests/                   # pytest (lihat TESTING.md)
│   └── requirements.txt / requirements-dev.txt
├── frontend/
│   ├── src/
│   │   ├── pages/          # Login, Register, ForgotPassword, ResetPassword,
│   │   │                   # Upload, Dashboard, CustomerDetail, UploadHistory, Account
│   │   ├── components/     # MetricCard, CustomerRow, Badge, ConfirmDialog, Pagination
│   │   ├── context/         # AuthContext (status login via GET /auth/me)
│   │   ├── api/             # client.js (fetch+cookie+auto-refresh), endpoints.js
│   │   └── App.jsx
│   ├── public/
│   │   └── manifest.webmanifest
│   ├── vitest.config.js
│   └── package.json
└── docs/                   # dokumen ini + database.md, api.md, dll.
```

## 6. Keamanan (Ringkas — Detail di requirements.md NFR)
- Password: hash dengan bcrypt, tidak pernah simpan/kirim plain text; minimal 8 karakter + kombinasi huruf-angka
- Login dibatasi 5 percobaan gagal / 15 menit per IP; register/forgot-password/reset-password juga dibatasi rate-nya
- Access token JWT (15 menit) di cookie `httpOnly`, tidak pernah bisa dibaca JavaScript (proteksi XSS) dan tidak pernah ada di response body
- Refresh token acak (7 hari, di-hash di DB) yang berotasi tiap dipakai dan **bisa direvoke** -- logout/reset-password/deteksi reuse token benar-benar menghapus akses di server, bukan cuma bersih-bersih di browser
- Setiap query database ke data pelanggan wajib difilter `user_id` (lihat database.md bagian 4)
- `/docs`, `/redoc`, `/openapi.json` bisa dinonaktifkan atau digembok Basic Auth di production (lihat api.md)
