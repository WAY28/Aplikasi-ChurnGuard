# Requirements — ChurnGuard

## 1. Functional Requirements

| ID | Requirement | Terkait Fitur PRD |
|---|---|---|
| FR-1 | Sistem harus bisa menerima registrasi akun baru (nama UMKM, email, password) | Fitur 1 |
| FR-2 | Sistem harus bisa memvalidasi login (email + password) dan menolak kredensial salah | Fitur 1 |
| FR-3 | Sistem harus bisa menerima upload file CSV/Excel dan memvalidasi formatnya sebelum diproses | Fitur 2 |
| FR-4 | Sistem harus bisa menerima input data satu pelanggan lewat form | Fitur 3 |
| FR-5 | Sistem harus memproses data lewat model Random Forest dan mengembalikan status churn + skor probabilitas | Fitur 2, 3 |
| FR-6 | Sistem harus menyimpan hasil analisis ke database, terhubung ke akun yang mengunggah | Fitur 4, 7 |
| FR-7 | Sistem harus menampilkan dashboard ringkasan (total pelanggan, jumlah risiko tinggi, akurasi model) khusus milik akun yang sedang login | Fitur 4 |
| FR-8 | Sistem harus menampilkan detail per pelanggan termasuk faktor-faktor utama (feature importance) yang memengaruhi prediksi | Fitur 5 |
| FR-9 | Sistem harus menghasilkan link WhatsApp (`wa.me`) otomatis jika data punya nomor telepon | Fitur 7 |
| FR-10 | Sistem harus menghasilkan link `mailto:` otomatis jika data punya email (fallback kalau tidak ada nomor telepon) | Fitur 7 |
| FR-11 | Sistem harus menampilkan daftar riwayat upload sebelumnya per akun | Fitur 9 |
| FR-12 | Sistem harus bisa diinstal sebagai PWA (manifest.json valid, service worker terdaftar) | Fitur 10 |
| FR-13 | Sistem harus tetap menampilkan data terakhir yang tersimpan saat offline | Fitur 11 |
| FR-14 | Sistem harus mengizinkan pengguna tanpa akun mencoba upload/analisis maksimal 3 kali per sesi browser, tanpa menyimpan data ke database | Fitur 2 |
| FR-15 | Sistem harus otomatis mengubah status kontak pelanggan menjadi "Sudah Dihubungi (WA/Email)" saat tombol terkait diklik | Fitur 8 |
| FR-16 | Sistem harus mencocokkan pelanggan antar sesi upload (berdasarkan telepon/email) dan mengubah status jadi "Retensi Berhasil" jika terdeteksi transaksi baru | Fitur 8 |

## 2. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | Waktu respons prediksi untuk satu file (≤1000 baris) tidak lebih dari 5 detik |
| NFR-2 | Password disimpan dalam bentuk hash (bukan teks biasa) — pakai bcrypt/argon2 |
| NFR-3 | Sesi login memakai token (JWT) dengan masa berlaku wajar (mis. 24 jam) |
| NFR-4 | Data satu akun tidak boleh bisa diakses/dilihat oleh akun lain dalam kondisi apa pun |
| NFR-5 | Aplikasi tetap bisa dibuka (walau data terbatas) tanpa koneksi internet |
| NFR-6 | Tampilan responsif, mobile-first (karena target penggunaan utama dari HP) |

## 3. Kriteria Checkpoint (Keputusan Lanjut Plan A / Mundur ke Plan B)

Dievaluasi di **akhir minggu ke-2/3 pengembangan**. Semua poin berikut harus terpenuhi untuk melanjutkan Plan A:

- [ ] FR-1 dan FR-2 (registrasi & login) berfungsi tanpa error
- [ ] NFR-4 sudah diuji langsung: bikin 2 akun berbeda, pastikan data tidak saling terlihat
- [ ] FR-3 sampai FR-10 (alur inti: upload → prediksi → dashboard → detail → kontak) berfungsi end-to-end untuk minimal 1 akun
- [ ] FR-12 (PWA installable) sudah bisa dicoba diinstal ke HP

**Jika ada satu saja yang belum tercapai → pindah ke Plan B** (hapus FR-1, FR-2, FR-6 bagian "per akun", FR-11, dan NFR-2 sampai NFR-4 terkait auth; data diproses per sesi tanpa disimpan permanen).

## 4. Batasan Teknis
- Ukuran file upload maksimal 5 MB per file
- Format yang didukung: `.csv`, `.xlsx`
- Kolom data harus sesuai template yang disediakan sistem (lihat `database.md` untuk daftar kolom)
