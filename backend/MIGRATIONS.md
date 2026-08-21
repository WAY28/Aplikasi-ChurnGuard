# Migrasi Database (Alembic)

Skema database dikelola lewat [Alembic](https://alembic.sqlalchemy.org/), bukan
`Base.metadata.create_all()` otomatis lagi. Connection string diambil dari
`DATABASE_URL` di `backend/.env` (sama seperti `main.py`) — lihat `alembic/env.py`.

Riwayat migrasi saat ini (`backend/alembic/versions/`):
1. `e1c752340178_baseline_schema...` — baseline: tabel `users`, `upload_sessions`, `customers` (skema yang sudah ada sebelum Alembic dipasang)
2. `40275bdac8b5_add_password_reset_tokens_table` — tabel `password_reset_tokens` (fitur lupa password)
3. `78e0e5687811_add_refresh_tokens_table` — tabel `refresh_tokens` (fitur refresh token, lihat docs/api.md bagian Autentikasi)

## Setup awal / server baru (database kosong)

```bash
cd backend
alembic upgrade head
```

Ini akan membuat semua tabel dari nol sesuai urutan migrasi di atas. Sudah
divalidasi: migrasi baseline dites di schema Postgres kosong terpisah dan
berhasil membangun `users`, `upload_sessions`, `customers` dari nol sebelum
digabung ke riwayat ini.

## Kalau kamu sudah punya database lama (dibuat sebelum Alembic dipasang)

Kalau database kamu sudah punya tabel `users`/`upload_sessions`/`customers`
(dibuat lewat `create_all()` versi lama), **jangan** langsung `alembic upgrade
head` — itu akan mencoba `CREATE TABLE` yang sudah ada dan gagal. Tandai dulu
database itu sudah "di posisi baseline" tanpa menjalankan DDL apa pun:

```bash
cd backend
alembic stamp e1c752340178   # revision baseline, lihat daftar di atas
alembic upgrade head          # baru jalankan migrasi berikutnya (password_reset_tokens dst.)
```

## Membuat migrasi baru setelah mengubah model

1. Ubah/tambah model di `backend/models.py` seperti biasa.
2. Generate revision otomatis (Alembic membandingkan `models.py` vs skema DB saat ini):
   ```bash
   cd backend
   alembic revision --autogenerate -m "deskripsi singkat perubahan"
   ```
3. **Selalu buka file migrasi baru** di `alembic/versions/` dan periksa manual —
   autogenerate tidak selalu sempurna (mis. rename kolom terdeteksi sebagai
   drop+add, default value kompleks, dsb).
4. Terapkan ke database lokal untuk tes:
   ```bash
   alembic upgrade head
   ```
5. Commit file migrasi baru bersama perubahan `models.py` di PR yang sama.
6. Di server produksi, jalankan `alembic upgrade head` sebagai bagian dari
   proses deploy (sebelum start `uvicorn`), bukan mengandalkan `create_all()`.

## Perintah lain yang berguna

| Perintah | Kegunaan |
|---|---|
| `alembic current` | Lihat revision yang sedang aktif di database |
| `alembic history` | Lihat seluruh riwayat migrasi |
| `alembic downgrade -1` | Rollback satu migrasi terakhir |
| `alembic upgrade head` | Terapkan semua migrasi yang belum jalan |
