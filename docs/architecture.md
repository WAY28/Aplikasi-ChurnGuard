# Architecture — ChurnGuard

## 1. Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React (Vite) + PWA plugin (vite-plugin-pwa) |
| Backend | Python + FastAPI |
| Model ML | scikit-learn Random Forest (model_churn.pkl) |
| Database | PostgreSQL 16 (terpasang langsung, tanpa container) |
| ORM | SQLAlchemy |
| Auth | JWT (python-jose) + bcrypt untuk hash password |

## 2. Diagram Arsitektur

```
                        ┌───────────────────┐
                        │  Pengguna/Browser  │
                        └─────────┬──────────┘
                                  │
                                  v
┌────────────────────────┐   fetch+token   ┌──────────────────────────┐
│   React PWA Frontend    │ ───────────────> │      FastAPI Backend      │
│  (Vite, manifest.json,  │ <─────────────── │  (Auth JWT, endpoint      │
│   service worker)       │   JSON hasil     │   prediksi & data)        │
└──────────────────────────┘                └────────────┬───┬──────────┘
                                                           │   │
                                            ┌──────────────┘   └──────────────┐
                                            v                                 v
                                ┌─────────────────────┐          ┌──────────────────────┐
                                │      PostgreSQL       │          │  Model Random Forest  │
                                │ (users, upload_sessions,│        │  model_churn.pkl       │
                                │  customers)            │        │  (dimuat sekali saat   │
                                └─────────────────────┘          │   backend start)       │
                                                                   └──────────────────────┘
```

Catatan: Frontend **tidak pernah** mengakses database secara langsung — semua akses ke PostgreSQL dan model ML wajib melalui Backend.

## 3. Environment Variables (Gambaran)
Backend butuh file `.env` berisi:
```
DATABASE_URL=postgresql://churnguard_user:[password]@localhost:5432/churnguard
JWT_SECRET_KEY=[string acak yang aman]
```

## 4. Alur Prediksi (Backend)
1. Request masuk (dari upload atau form manual)
2. Backend validasi token JWT → dapat `user_id`
3. Data diproses jadi format yang sama seperti saat training (urutan kolom harus sama persis — lihat `database.md`)
4. `model.predict()` dan `model.predict_proba()` dipanggil (model sudah dimuat di memori sejak backend start, tidak load ulang tiap request)
5. Hasil disimpan ke tabel `customers` dengan `user_id` yang benar
6. Response dikembalikan ke frontend

## 5. Struktur Folder (Usulan)
```
churnguard/
├── backend/
│   ├── main.py
│   ├── models.py          # SQLAlchemy models
│   ├── auth.py            # JWT + password hashing
│   ├── .env
│   ├── ml/
│   │   └── model_churn.pkl
│   ├── routers/
│   │   ├── auth.py
│   │   └── customers.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/          # Login, Register, Upload, Dashboard, Detail
│   │   ├── components/     # MetricCard, CustomerRow, Badge
│   │   ├── api/             # fungsi fetch ke backend
│   │   └── App.jsx
│   ├── public/
│   │   └── manifest.json
│   └── package.json
└── docs/                   # 7 file dokumen ini + folder images/
```

## 6. Keamanan (Ringkas — Detail di requirements.md NFR)
- Password: hash dengan bcrypt, tidak pernah simpan/kirim plain text
- Token JWT: masa berlaku dibatasi (24 jam), disimpan di frontend (localStorage/httpOnly cookie)
- Setiap query database ke data pelanggan wajib difilter `user_id` (lihat database.md bagian 4)
