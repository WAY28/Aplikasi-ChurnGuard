# API — ChurnGuard Backend

Base URL (lokal): `http://localhost:8000/api`
Autentikasi: JWT Bearer Token (dikirim di header `Authorization: Bearer <token>`), kecuali endpoint yang ditandai publik.

## 1. Auth

### POST `/auth/register` (publik)
Registrasi akun baru.
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
**Response 200:**
```json
{ "access_token": "eyJhbGciOi...", "token_type": "bearer" }
```
**Response 401:** kredensial salah

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
Ambil semua pelanggan milik akun yang login. Query param opsional: `?upload_session_id=5` untuk filter per sesi.
**Response 200:** array objek pelanggan + hasil prediksi

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
Riwayat semua sesi upload milik akun yang login.
**Response 200:** array `{id, filename, total_customers, high_risk_count, uploaded_at}`

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
| 500 | Kesalahan server |