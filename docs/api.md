# API — ChurnGuard Backend

Base URL (lokal): `http://localhost:8000/api`

## Dokumentasi interaktif (/docs, /redoc, /openapi.json)

Default-nya terbuka (cocok untuk dev lokal). Ada 3 mode lewat env var, lihat
`backend/config.py` dan `.env.example`:
1. `DOCS_ENABLED=false` -- nonaktif total (404), direkomendasikan untuk production kalau tidak butuh docs publik
2. `DOCS_ENABLED=true` + `DOCS_BASIC_AUTH_USER`/`DOCS_BASIC_AUTH_PASSWORD` diisi -- docs tetap ada tapi digembok HTTP Basic Auth
3. `DOCS_ENABLED=true`, dua-duanya kosong (default) -- terbuka publik

Endpoint API-nya sendiri (`/api/...`) tetap jalan normal di ketiga mode -- ini
cuma soal siapa yang bisa lihat/introspeksi skemanya.

## Autentikasi (cookie httpOnly, bukan Bearer token)

Klien (fetch/XHR) **wajib** menyertakan `credentials: "include"` supaya cookie
ikut terkirim/tersimpan lintas origin (frontend dan backend beda port/domain).
Tidak ada lagi token di response body atau header `Authorization` -- semuanya
lewat cookie yang di-set backend, tidak bisa dibaca JavaScript (proteksi XSS).

| Cookie | Isi | Umur | Scope path | Diset saat |
|---|---|---|---|---|
| `access_token` | JWT | 15 menit (`ACCESS_TOKEN_EXPIRE_MINUTES`) | `/` (semua endpoint) | login, refresh |
| `refresh_token` | token acak, di-hash di tabel `refresh_tokens` (bisa direvoke) | 7 hari (`REFRESH_TOKEN_EXPIRE_DAYS`) | `/api/auth` saja | login, refresh |

Alur normal: `access_token` dipakai untuk semua request terautentikasi. Kalau
kedaluwarsa (401), frontend panggil `POST /auth/refresh` (otomatis, lewat
`refresh_token` yang tersimpan) untuk dapat pasangan cookie baru, lalu ulangi
request yang gagal tadi. Setiap refresh **merotasi** `refresh_token` -- token
lama langsung direvoke. Kalau ada yang mencoba pakai `refresh_token` yang
sudah direvoke, backend menganggapnya indikasi pencurian token dan langsung
merevoke SEMUA sesi refresh milik akun itu.

**Production (Vercel + Render, beda domain):** wajib set `COOKIE_SECURE=true`
dan `COOKIE_SAMESITE=none` di env backend, kalau tidak cookie tidak akan
pernah terkirim lintas domain (gejalanya: login sukses tapi request
berikutnya selalu 401).

## 1. Auth

### POST `/auth/register` (publik)
Registrasi akun baru. **Tidak** langsung login/set cookie -- frontend memanggil `/auth/login` setelahnya.
**Request body:**
```json
{ "business_name": "Toko Barokah", "email": "toko@email.com", "password": "rahasia123" }
```
**Response 201:**
```json
{ "id": 1, "business_name": "Toko Barokah", "email": "toko@email.com" }
```

### POST `/auth/login` (publik)
**Request body:**
```json
{ "email": "toko@email.com", "password": "rahasia123" }
```
**Response 200:** info akun (bukan token -- lihat Set-Cookie `access_token` & `refresh_token`)
```json
{ "id": 1, "business_name": "Toko Barokah", "email": "toko@email.com" }
```
**Response 401:** kredensial salah
**Response 429:** IP ini sudah 5x gagal login dalam 15 menit terakhir (lihat bagian 5 di bawah)

### POST `/auth/refresh`
Perpanjang sesi pakai `refresh_token` di cookie (dipanggil otomatis oleh frontend saat `access_token` kedaluwarsa, bukan manual oleh user).
**Response 200:** `{ "message": "Sesi diperpanjang" }` + Set-Cookie pasangan token baru (rotasi)
**Response 401:** `refresh_token` tidak ada/kedaluwarsa/sudah direvoke -- user harus login ulang

### POST `/auth/logout`
Revoke `refresh_token` di database (bukan cuma hapus cookie di frontend) lalu hapus kedua cookie. Aman dipanggil walau `access_token` sudah kedaluwarsa.
**Response 204:** berhasil logout

### GET `/auth/me`
Cek status login saat ini & ambil data akun -- dipanggil frontend saat aplikasi pertama dibuka untuk tahu apakah user masih punya sesi valid (dulu ini dicek lewat ada/tidaknya token di `localStorage`, sekarang JS tidak bisa baca cookie httpOnly sama sekali).
**Response 200:** `{ "id": 1, "business_name": "Toko Barokah", "email": "toko@email.com" }`
**Response 401:** tidak ada sesi valid

### POST `/auth/forgot-password` (publik)
Minta link reset password. **Selalu membalas pesan sukses generik** yang sama
baik email terdaftar maupun tidak, supaya endpoint ini tidak bisa dipakai
mengecek email siapa saja yang punya akun. Kalau email memang terdaftar, link
reset (berlaku 1 jam) dikirim lewat email (Resend/SMTP) -- lihat
`backend/email_utils.py`. Kalau `RESEND_API_KEY`/`SMTP_HOST` belum diisi di
`.env`, link-nya dicetak ke log server saja (mode dev).
**Request body:**
```json
{ "email": "toko@email.com" }
```
**Response 200:**
```json
{ "message": "Jika email terdaftar, link reset password sudah dikirim ke email tersebut." }
```

### POST `/auth/reset-password` (publik)
Set password baru pakai token dari email.
**Request body:**
```json
{ "token": "xxxx", "new_password": "PasswordBaru1" }
```
**Response 200:**
```json
{ "message": "Password berhasil diubah. Silakan masuk dengan password baru." }
```
**Response 400:** token tidak valid, sudah kedaluwarsa (>1 jam), atau sudah pernah dipakai

Berhasil reset password juga merevoke **semua** `refresh_token` aktif milik akun itu -- semua perangkat yang sedang login otomatis ter-logout dan harus masuk lagi pakai password baru.

## 2. Customers

Semua endpoint di bawah ini butuh token, dan backend **wajib** memfilter berdasarkan `user_id` dari token (lihat `database.md` bagian 4).

### POST `/customers`
Tambah satu pelanggan manual → otomatis diprediksi.
**Request body:** objek berisi seluruh fitur (tenure, satisfaction_score, dll — lihat `database.md`)
**Response 201:**
```json
{ "id": 12, "churn_prediction": 1, "churn_probability": 0.82 }
```

### POST `/customers/upload`
Upload file CSV/Excel berisi banyak pelanggan sekaligus.
**Request:** `multipart/form-data`, field `file`
**Response 201:**
```json
{ "upload_session_id": 5, "total_customers": 120, "high_risk_count": 23 }
```

### GET `/customers`
Ambil pelanggan milik akun yang login, dengan pagination, pencarian, dan filter.
**Query params (semua opsional):**
| Param | Keterangan |
|---|---|
| `upload_session_id` | Filter per sesi upload |
| `search` | Cari di kolom `name` ATAU `phone` (case-insensitive, substring match) |
| `risk` | `1` = risiko tinggi saja, `0` = aman saja |
| `contact_status` | `belum_dihubungi` / `dihubungi_wa` / `dihubungi_email` / `retensi_berhasil` |
| `page` | Default `1` |
| `limit` | Default `20`, maksimal `200` |

**Response 200:**
```json
{
  "items": [ { "id": 12, "name": "Budi", "churn_prediction": 1, "...": "..." } ],
  "page": 1, "limit": 20, "total": 137, "total_pages": 7,
  "high_risk_total": 42
}
```
`total`/`high_risk_total` dihitung dari seluruh data yang cocok filter (bukan cuma halaman ini) -- dipakai frontend untuk kartu ringkasan Dashboard.
**Response 400:** `contact_status` bukan salah satu nilai yang valid

### DELETE `/customers/{id}`
Hapus satu pelanggan.
**Response 204:** berhasil dihapus
**Response 404:** sama seperti endpoint detail (tidak ditemukan/bukan milik akun ini)

### GET `/customers/{id}`
Detail satu pelanggan, termasuk feature importance yang relevan.
**Response 200:**
```json
{
  "id": 12, "churn_prediction": 1, "churn_probability": 0.82,
  "top_factors": [{"feature": "Tenure", "importance": 0.22}],
  "phone": "6281234567890", "email": "pelanggan@email.com"
}
```
**Response 404:** kalau pelanggan tidak ditemukan ATAU bukan milik akun yang login (jangan bedakan pesan error, demi keamanan)

### PATCH `/customers/{id}/contact`
Update status kontak, dipanggil saat tombol WhatsApp/Email diklik di frontend.
**Request body:**
```json
{ "contact_status": "dihubungi_wa" }
```
Nilai yang valid: `"dihubungi_wa"` atau `"dihubungi_email"`.
**Response 200:**
```json
{ "id": 12, "contact_status": "dihubungi_wa", "contacted_at": "2026-08-12T10:30:00Z" }
```
**Response 404:** sama seperti endpoint detail (tidak ditemukan/bukan milik akun ini)

## 3. Upload Sessions

### GET `/upload-sessions`
Riwayat sesi upload milik akun yang login, dengan pagination.
**Query params:** `page` (default 1), `limit` (default 20, maksimal 200)
**Response 200:**
```json
{
  "items": [ {"id": 5, "filename": "pelanggan.csv", "total_customers": 120, "high_risk_count": 23, "uploaded_at": "..."} ],
  "page": 1, "limit": 20, "total": 8, "total_pages": 1
}
```

### DELETE `/upload-sessions/{id}`
Hapus satu sesi upload **beserta semua pelanggan di dalamnya** (cascade).
**Response 204:** berhasil dihapus
**Response 404:** tidak ditemukan/bukan milik akun ini

## 3b. Account

### PATCH `/account`
Update profil akun sendiri. Semua field opsional -- kirim hanya yang mau diubah.
Ganti email atau password itu aksi sensitif dan **wajib** menyertakan
`current_password` untuk konfirmasi ulang; ganti `business_name` saja tidak perlu.
**Request body (contoh ganti nama usaha saja):**
```json
{ "business_name": "Toko Barokah Jaya" }
```
**Request body (contoh ganti email + password sekaligus):**
```json
{
  "email": "email_baru@toko.com",
  "new_password": "PasswordBaru1",
  "current_password": "PasswordLama1"
}
```
**Response 200:**
```json
{ "id": 1, "business_name": "Toko Barokah Jaya", "email": "email_baru@toko.com" }
```
**Response 400:**
- Tidak ada field yang dikirim
- `current_password` tidak diisi padahal mengubah email/password
- `current_password` salah
- Email baru sudah dipakai akun lain
**Response 422:** `new_password` tidak lolos syarat kekuatan password (lihat bagian Auth)

### DELETE `/account`
Hapus akun sendiri beserta seluruh datanya (pelanggan, riwayat upload, token reset password) -- **ireversibel**. Butuh konfirmasi password di body request supaya token yang bocor/tertinggal di perangkat lain tidak bisa langsung menghapus akun.
**Request body:**
```json
{ "password": "rahasia123" }
```
**Response 204:** akun & seluruh data terhapus
**Response 400:** password salah (sengaja bukan 401 -- lihat komentar di `routers/account.py`: 401 di sini akan salah men-trigger auto-logout global di frontend)

## 3. Trial Tanpa Akun

Kedua endpoint di bawah **publik (tanpa token)**. Prediksi tetap dijalankan lewat model, tapi **hasilnya tidak disimpan ke database sama sekali** — tidak masuk tabel `customers` maupun `upload_sessions`. Batas 3x percobaan per sesi browser dihitung dan disimpan di **frontend** (localStorage), bukan di backend — jadi endpoint ini sendiri tidak perlu tahu/membatasi jumlah percobaan.

### POST `/trial/predict` (publik)
Coba prediksi satu pelanggan tanpa akun.
**Request body:** sama seperti `POST /customers` (seluruh fitur, lihat `database.md`)
**Response 200:**
```json
{ "churn_prediction": 1, "churn_probability": 0.82, "top_factors": [{"feature": "Tenure", "importance": 0.22}] }
```

### POST `/trial/upload` (publik)
Coba prediksi banyak pelanggan sekaligus dari CSV/Excel, tanpa akun.
**Request:** `multipart/form-data`, field `file`
**Response 200:**
```json
{ "total_customers": 120, "high_risk_count": 23, "results": [ { "row": 1, "churn_prediction": 0, "churn_probability": 0.12 } ] }
```

## 4. Kode Status Umum
| Kode | Arti |
|---|---|
| 200 | Berhasil |
| 201 | Berhasil dibuat |
| 400 | Format data/file tidak valid |
| 401 | Token tidak ada/tidak valid |
| 404 | Data tidak ditemukan (atau bukan milik akun ini) |
| 422 | Body request tidak lolos validasi (mis. password kurang dari 8 karakter) |
| 429 | Terlalu banyak percobaan, coba lagi nanti (lihat bagian 5) |
| 500 | Kesalahan server |

## 5. Rate Limiting
| Endpoint | Batas |
|---|---|
| `POST /auth/login` | 5 percobaan **gagal** per alamat IP / 15 menit (percobaan sukses tidak dihitung, dan me-reset hitungan) |
| `POST /auth/register` | 5 request per alamat IP / 15 menit |
| `POST /auth/forgot-password` | 5 request per alamat IP / 15 menit |
| `POST /auth/reset-password` | 10 request per alamat IP / 15 menit |
| `POST /auth/refresh` | 30 request per alamat IP / 15 menit |

Implementasi: `backend/rate_limit.py`. Login pakai penghitung custom
(`LoginAttemptGuard`) karena harus membedakan percobaan sukses vs gagal;
endpoint lain pakai [slowapi](https://github.com/laurentS/slowapi). Keduanya
in-memory per-proses -- kalau backend di-scale ke banyak instance sekaligus,
pindahkan penyimpanan ke Redis.