# PRD — ChurnGuard: Aplikasi Prediksi Churn Pelanggan UMKM

## Status: Plan A (Kompleks, dengan Akun)
**Checkpoint keras di akhir minggu ke-2/3.** Lihat `requirements.md` bagian "Kriteria Checkpoint" untuk syarat lanjut/mundur ke versi sederhana.

## 1. Latar Belakang
Pelaku UMKM kesulitan mendeteksi dini pelanggan yang berisiko berhenti bertransaksi (churn). Alat analitik yang ada saat ini umumnya mahal (enterprise) atau berhenti di eksperimen model tanpa jadi sistem nyata yang bisa dipakai sehari-hari. ChurnGuard dibangun sebagai Progressive Web App (PWA) yang bisa diinstal langsung oleh pemilik UMKM, memakai model Random Forest (akurasi 98,05%) untuk memprediksi risiko churn dari data pelanggan yang diunggah.

## 2. Target Pengguna
Pemilik/pengelola UMKM skala kecil-menengah yang berjualan online (punya data transaksi pelanggan dari platform e-commerce) dan ingin memantau risiko kehilangan pelanggan tanpa perlu tim data analyst.

## 3. Tujuan Produk
- Membantu pemilik UMKM melihat siapa saja pelanggan yang berisiko churn
- Memudahkan tindak lanjut langsung (WhatsApp/Email) ke pelanggan berisiko
- Menyimpan riwayat analisis per akun UMKM, tidak perlu upload ulang tiap kunjungan
- Bisa diinstal ke perangkat (home screen) dan diakses ringan tanpa app store

## 4. Fitur Utama

| # | Fitur | Prioritas |
|---|---|---|
| 1 | Registrasi & login akun UMKM | Wajib |
| 2 | Coba tanpa akun (maks. 3x, data tidak disimpan) | Wajib |
| 3 | Upload data pelanggan (CSV/Excel) | Wajib |
| 4 | Input manual satu pelanggan | Wajib |
| 5 | Dashboard hasil analisis (tersimpan per akun) | Wajib |
| 6 | Detail per pelanggan (skor risiko + faktor penyebab) | Wajib |
| 7 | Tombol aksi: Hubungi via WhatsApp / Kirim Email | Wajib |
| 8 | Status kontak otomatis (Belum Dihubungi → Sudah Dihubungi → Retensi Berhasil) | Wajib |
| 9 | Riwayat upload/analisis sebelumnya | Wajib |
| 10 | Instalasi PWA ke home screen | Wajib |
| 11 | Mode offline (lihat data terakhir tanpa internet) | Wajib |
| 12 | Edit profil UMKM | Prioritas rendah |

## 5. User Stories
- Sebagai pemilik UMKM, saya ingin **mendaftar dan login**, supaya data pelanggan saya tersimpan aman dan terpisah dari UMKM lain.
- Sebagai pemilik UMKM, saya ingin **mengunggah data pelanggan (CSV/Excel)**, supaya sistem bisa memprediksi siapa yang berisiko churn.
- Sebagai pemilik UMKM, saya ingin **melihat riwayat analisis sebelumnya**, supaya tidak perlu upload ulang tiap kali buka aplikasi.
- Sebagai pemilik UMKM, saya ingin **klik tombol WhatsApp/Email langsung dari detail pelanggan**, supaya bisa segera menindaklanjuti.
- Sebagai pemilik UMKM, saya ingin **menginstal aplikasi ke HP saya**, supaya aksesnya cepat seperti aplikasi biasa.

## 6. Metrik Keberhasilan (untuk Bab Evaluasi Paper)
- Akurasi model ≥ 90% (tercapai: 98,05%)
- Seluruh fitur lulus pengujian black-box
- Skor SUS (System Usability Scale) ≥ 68
- Autentikasi teruji: data antar akun benar-benar terisolasi

## 7. Di Luar Cakupan (Out of Scope)
- Integrasi otomatis "tarik data langsung" dari link e-commerce (butuh API resmi platform pihak ketiga)
- Analitik lanjutan selain prediksi churn (mis. rekomendasi produk)
- Reset password via email (cukup ubah password saat login untuk MVP)

## 8. Fallback (Plan B)
Jika checkpoint minggu ke-2/3 tidak terpenuhi (lihat `requirements.md`), fitur 1, 7, 10 (akun, riwayat, profil) dilepas — sistem jadi versi tanpa login, data diproses per sesi tanpa disimpan permanen.
