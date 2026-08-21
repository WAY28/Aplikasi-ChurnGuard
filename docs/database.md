# Database — ChurnGuard (PostgreSQL)

## 1. Ringkasan
Database relasional PostgreSQL, **terpasang langsung di mesin (bukan Docker)** --
lihat bagian 5. Lima tabel: `users` (akun UMKM), `customers` (data pelanggan
yang diunggah), `upload_sessions` (riwayat upload), `password_reset_tokens`
(token lupa password, sekali pakai), `refresh_tokens` (sesi login yang bisa
direvoke -- lihat bagian 8).

Skema dikelola lewat Alembic, bukan dibuat manual/`create_all()` -- lihat
`backend/MIGRATIONS.md` untuk cara migrasi.

## 2. Skema Tabel

### `users`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | SERIAL (PK) | ID unik akun |
| business_name | VARCHAR(255) | Nama UMKM |
| email | VARCHAR(255) UNIQUE | Dipakai untuk login |
| password_hash | VARCHAR(255) | Password yang sudah di-hash (bcrypt) |
| created_at | TIMESTAMP | Kapan akun dibuat |

### `upload_sessions`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | SERIAL (PK) | ID unik sesi upload |
| user_id | INTEGER (FK → users.id) | Pemilik sesi ini |
| filename | VARCHAR(255) | Nama file yang diunggah |
| total_customers | INTEGER | Jumlah baris data dalam sesi ini |
| high_risk_count | INTEGER | Jumlah pelanggan berisiko tinggi dalam sesi ini |
| uploaded_at | TIMESTAMP | Kapan diunggah |

### `customers`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | SERIAL (PK) | ID unik pelanggan |
| user_id | INTEGER (FK → users.id) | Pemilik data ini (WAJIB untuk isolasi antar akun) |
| upload_session_id | INTEGER (FK → upload_sessions.id) | Sesi upload asal data ini |
| name | VARCHAR(255) | Nama pelanggan (opsional) |
| phone | VARCHAR(50) | Nomor telepon (untuk tombol WhatsApp, juga kunci pencocokan antar upload) |
| email | VARCHAR(255) | Email (fallback kontak, juga kunci pencocokan antar upload) |
| contact_status | VARCHAR(30) | `belum_dihubungi` / `dihubungi_wa` / `dihubungi_email` / `retensi_berhasil` |
| contacted_at | TIMESTAMP | Kapan status kontak terakhir diubah |
| tenure | FLOAT | Lama jadi pelanggan |
| warehouse_to_home | FLOAT | Jarak gudang-rumah |
| hour_spend_on_app | FLOAT | Jam pemakaian app |
| number_of_device_registered | INTEGER | Jumlah perangkat terdaftar |
| satisfaction_score | INTEGER | Skor kepuasan |
| number_of_address | INTEGER | Jumlah alamat |
| complain | INTEGER | Pernah komplain (0/1) |
| order_amount_hike | FLOAT | Kenaikan jumlah order dari tahun lalu |
| coupon_used | FLOAT | Jumlah kupon dipakai |
| order_count | FLOAT | Jumlah order |
| day_since_last_order | FLOAT | Hari sejak order terakhir (dipakai juga untuk deteksi transaksi baru) |
| cashback_amount | FLOAT | Rata-rata cashback |
| preferred_login_device | VARCHAR(50) | Kategorikal (diisi hasil encoding) |
| preferred_payment_mode | VARCHAR(50) | Kategorikal |
| gender | VARCHAR(20) | Kategorikal |
| prefered_order_cat | VARCHAR(50) | Kategorikal |
| marital_status | VARCHAR(50) | Kategorikal |
| city_tier | INTEGER | Kategorikal |
| churn_prediction | INTEGER | Hasil prediksi (0/1) |
| churn_probability | FLOAT | Probabilitas churn (0.0–1.0) |
| created_at | TIMESTAMP | Kapan data dimasukkan |

### `password_reset_tokens`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | SERIAL (PK) | ID unik token |
| user_id | INTEGER (FK → users.id) | Pemilik token |
| token_hash | VARCHAR(64) UNIQUE | Hash SHA-256 dari token acak -- token asli tidak pernah disimpan, cuma dikirim sekali lewat email |
| expires_at | TIMESTAMP | Kedaluwarsa 1 jam setelah diterbitkan |
| used_at | TIMESTAMP (nullable) | Diisi begitu token dipakai (sekali pakai) |
| created_at | TIMESTAMP | Kapan diterbitkan |

### `refresh_tokens`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | SERIAL (PK) | ID unik token |
| user_id | INTEGER (FK → users.id) | Pemilik token |
| token_hash | VARCHAR(64) UNIQUE | Hash SHA-256 dari token acak -- sama prinsipnya dengan `password_reset_tokens.token_hash` |
| expires_at | TIMESTAMP | Kedaluwarsa 7 hari setelah diterbitkan (`REFRESH_TOKEN_EXPIRE_DAYS`) |
| revoked_at | TIMESTAMP (nullable) | NULL = masih aktif. Diisi saat dipakai untuk refresh (rotasi), saat logout, atau saat reuse-detection memicu revoke massal -- lihat bagian 8 |
| created_at | TIMESTAMP | Kapan sesi dimulai |

## 3. Diagram Relasi (ERD)

```
┌────────────────┐    1        N    ┌─────────────────────┐
│     users      ├──────────────────┤   upload_sessions    │
└──┬──┬──┬───────┘                  └──────────┬───────────┘
   │  │  │ 1                                   │ 1
   │  │  │                                     │
   │  │  │              N                      │ N
   │  │  └───────────────────┬─────────────────┘
   │  │                      │
   │  │                      v
   │  │           ┌────────────────────┐
   │  │           │     customers       │
   │  │           └────────────────────┘
   │  │ 1
   │  │              N
   │  └──────> password_reset_tokens
   │ 1
   │              N
   └──────> refresh_tokens
```

Penjelasan relasi:
- **users → upload_sessions** (1-ke-N): satu akun UMKM bisa punya banyak sesi upload
- **users → customers** (1-ke-N): satu akun UMKM bisa punya banyak data pelanggan
- **upload_sessions → customers** (1-ke-N): satu sesi upload berisi banyak baris data pelanggan
- **users → password_reset_tokens** (1-ke-N): satu akun bisa minta reset password berkali-kali (token lama tetap ada di riwayat, tapi cuma yang belum dipakai/belum kedaluwarsa yang valid)
- **users → refresh_tokens** (1-ke-N): satu akun bisa punya beberapa sesi refresh aktif sekaligus (login di beberapa perangkat/browser)

Semua lima tabel di atas punya `cascade="all, delete-orphan"` dari `users` --
menghapus akun (`DELETE /api/account`) otomatis menghapus seluruh data terkait.

Detail kolom tiap tabel sudah dijabarkan lengkap di bagian 2 di atas.

## 4. Catatan Penting — Isolasi Data Antar Akun
**Setiap query ke tabel `customers` dan `upload_sessions` WAJIB menyertakan filter `WHERE user_id = [id akun yang sedang login]`.** Ini bagian paling kritis untuk NFR-4 di `requirements.md` — kalau sampai lupa difilter di satu endpoint saja, data antar UMKM bisa bocor. Saat testing checkpoint, ini yang paling penting dicoba manual.

## 5. Setup PostgreSQL (Tanpa Docker)
Install PostgreSQL langsung di komputer (bukan lewat container):
- **Windows/Mac**: unduh installer dari postgresql.org, ikuti wizard-nya
- **Linux**: `sudo apt install postgresql` (Ubuntu/Debian) atau setara

Setelah terpasang, buat database dan user:
```sql
CREATE DATABASE churnguard;
CREATE USER churnguard_user WITH PASSWORD 'diisi_sendiri';
GRANT ALL PRIVILEGES ON DATABASE churnguard TO churnguard_user;
```

Connection string yang dipakai backend nanti:
```
postgresql://churnguard_user:[password]@localhost:5432/churnguard
```

Setelah database & user dibuat, jalankan migrasi Alembic untuk bikin semua
tabelnya (bukan lagi `create_all()` otomatis):
```bash
cd backend
alembic upgrade head
```
Lihat `backend/MIGRATIONS.md` untuk detail (termasuk cara adopsi Alembic ke
database yang sudah ada isinya, dan cara bikin migrasi baru).

## 6. Catatan Kolom Model ML
Urutan dan nama kolom numerik/kategorikal di atas harus **persis sama** dengan `X.columns` dari notebook Colab yang sudah dipakai untuk training `model_churn.pkl` — kalau beda urutan, hasil prediksi bisa salah tanpa error yang jelas.

## 7. Logika Pencocokan Pelanggan Antar Upload
Karena `contact_status` perlu "diingat" dari upload ke upload berikutnya, saat ada file baru diunggah:
1. Sistem cocokkan baris data baru dengan data lama milik akun yang sama, berdasarkan `phone` atau `email`
2. Jika ketemu pelanggan yang sama dan `contact_status` sebelumnya bukan `belum_dihubungi`, bandingkan `day_since_last_order` — kalau menunjukkan transaksi lebih baru, ubah status jadi `retensi_berhasil`
3. Jika tidak ketemu kecocokan, perlakukan sebagai pelanggan baru (`contact_status = belum_dihubungi`)

Yang ditemukan dicocokkan diproses sebagai **UPDATE baris yang sudah ada**
(bukan INSERT baru) -- `id` pelanggan tetap sama antar upload, tidak ada
duplikat baris untuk pelanggan yang sama.

## 8. Refresh Token: Rotasi & Revoke
`refresh_tokens.token_hash` menyimpan hash SHA-256 dari token acak yang
dikirim lewat cookie httpOnly `refresh_token` (token asli tidak pernah
disimpan, sama seperti prinsip `password_hash`). Tiga aturan penting:
1. **Rotasi**: setiap kali dipakai lewat `POST /auth/refresh`, baris lama
   di-set `revoked_at` dan baris baru dibuat -- satu token cuma bisa dipakai
   sekali untuk memperpanjang sesi.
2. **Deteksi reuse**: kalau ada request yang memakai token yang `revoked_at`-nya
   SUDAH terisi, itu tanda token tersebut dicuri dan dipakai ulang -- sistem
   langsung meng-`UPDATE ... SET revoked_at = now()` semua baris `refresh_tokens`
   milik `user_id` itu yang masih aktif (paksa logout semua sesi).
3. **Reset password lewat email** (`POST /auth/reset-password`) juga memicu
   revoke massal yang sama -- reset password dianggap skenario "akun mungkin
   kompromi", jadi semua sesi lama harus login ulang pakai password baru.
