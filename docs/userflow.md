# User Flow — ChurnGuard

## 1. Use Case Diagram

**Aktor:** Pemilik UMKM

```
Pemilik UMKM
   │
   ├── Daftar akun
   ├── Login
   ├── Coba tanpa akun (maks. 3x)
   ├── Upload data pelanggan (CSV/Excel)
   ├── Input manual 1 pelanggan
   ├── Lihat dashboard
   │      └── (terhubung ke) Lihat detail pelanggan
   │              ├── Hubungi via WhatsApp
   │              └── Hubungi via Email
   ├── Lihat riwayat upload      (terhubung dari Upload data pelanggan)
   └── Instal aplikasi (PWA)
```

| Use Case | Deskripsi Singkat |
|---|---|
| Daftar akun | Membuat akun baru dengan nama UMKM, email, password |
| Login | Masuk ke akun yang sudah terdaftar |
| Coba tanpa akun | Mencoba fitur analisis tanpa mendaftar, maksimal 3 kali, data tidak disimpan |
| Upload data pelanggan | Mengunggah file CSV/Excel berisi banyak data pelanggan sekaligus |
| Input manual 1 pelanggan | Memasukkan data satu pelanggan lewat form |
| Lihat dashboard | Melihat ringkasan hasil analisis dan daftar pelanggan |
| Lihat detail pelanggan | Melihat skor risiko dan faktor penyebab churn satu pelanggan |
| Hubungi via WhatsApp | Membuka link `wa.me` untuk menghubungi pelanggan |
| Hubungi via Email | Membuka link `mailto:` untuk menghubungi pelanggan |
| Lihat riwayat upload | Melihat daftar sesi upload sebelumnya (khusus pengguna berakun) |
| Instal aplikasi (PWA) | Memasang aplikasi ke layar utama perangkat |

## 2. Alur Registrasi & Login (Pengguna Baru)
1. Buka aplikasi → lihat halaman landing dengan penjelasan produk, tombol "Daftar", "Masuk", dan "Coba Sekarang"
2. Klik "Daftar" → isi nama UMKM, email, password → submit
3. Sistem membuat akun (FR-1), otomatis diarahkan ke halaman login (atau langsung login)
4. Isi email + password → submit
5. Sistem verifikasi (FR-2), berhasil → dapat token → diarahkan ke halaman Upload

## 3. Alur Coba Tanpa Akun
1. Dari landing page, klik "Coba Sekarang"
2. Langsung diarahkan ke halaman Upload, dengan indikator "Percobaan ke-1 dari 3"
3. Upload/analisis berjalan sama seperti pengguna berakun, tapi hasil **tidak disimpan** ke database
4. Setelah 3 kali percobaan habis, sistem mengarahkan ke ajakan "Daftar akun untuk terus menggunakan ChurnGuard"

## 4. Alur Upload & Lihat Hasil (Alur Utama)
1. Dari halaman Upload, pilih file CSV/Excel (atau drag-and-drop)
2. Klik "Analisis" → sistem menampilkan status proses (loading)
3. Backend memvalidasi format, mencocokkan pelanggan dengan data lama (jika ada), memproses tiap baris lewat model (FR-3, FR-5)
4. Selesai → otomatis pindah ke Dashboard
5. Dashboard menampilkan ringkasan (total, risiko tinggi, akurasi) dan daftar pelanggan dengan badge warna + badge status kontak (FR-7)
6. Klik salah satu pelanggan → masuk ke halaman Detail
7. Di Detail: lihat skor risiko, faktor utama penyebab (FR-8), dan tombol WhatsApp/Email (FR-9, FR-10)
8. Klik tombol WhatsApp → membuka `wa.me` dengan nomor + pesan template terisi otomatis, status pelanggan berubah jadi "Sudah Dihubungi (WA)"

## 5. Alur Input Manual (Alur Alternatif)
1. Dari halaman Upload, klik "Input manual satu pelanggan"
2. Isi form (tenure, satisfaction score, dll)
3. Submit → sistem langsung memprediksi (FR-4, FR-5) → tampilkan hasil singkat
4. Bisa lanjut ke Detail atau kembali ke Dashboard

## 6. Alur Lihat Riwayat (Khusus Pengguna Berakun)
1. Dari Dashboard, klik menu "Riwayat"
2. Lihat daftar sesi upload sebelumnya (tanggal, jumlah data) (FR-11)
3. Klik salah satu → kembali ke Dashboard yang menampilkan data sesi tersebut

## 7. Alur Instalasi PWA
1. Browser (Chrome/Edge di Android, Safari di iOS) menampilkan prompt "Tambahkan ke layar utama" atau pengguna klik ikon install di address bar
2. Klik → aplikasi terpasang seperti aplikasi native (FR-12)
3. Ikon muncul di home screen, bisa dibuka tanpa browser penuh

## 8. Alur Mode Offline
1. Pengguna sebelumnya sudah pernah buka Dashboard (data sempat di-cache service worker)
2. Koneksi internet putus, pengguna buka aplikasi lagi
3. Sistem menampilkan data terakhir yang tersimpan, dengan indikator "Mode offline — data mungkin tidak terbaru" (FR-13)
4. Upload/analisis baru tidak bisa dilakukan sampai koneksi kembali

## 9. Diagram Alur Utama

```
                        [Buka Aplikasi]
                              │
                              v
              [Landing Page — penjelasan produk]
                              │
                              v
                 <Punya akun / coba tanpa akun?>
                    │                      │
                 [Akun]              [Coba, maks 3x]
                    │                      │
           [Daftar / Login]    [Lanjut tanpa akun,
                    │            data tidak disimpan]
                    │                      │
                    └──────────┬───────────┘
                                v
                       [Halaman Upload]
                                │
                                v
                <Upload file / input manual?>
                    │                      │
          [Upload CSV/Excel]      [Isi form manual
                    │               1 pelanggan]
                    │                      │
                    └──────────┬───────────┘
                                v
              [Sistem memproses — model Random Forest]
                                │
                                v
                  [Dashboard hasil analisis]
                                │
                                v
             [Detail pelanggan + tombol WA/Email]
                                │
                                v
                     [Hubungi pelanggan]
```
