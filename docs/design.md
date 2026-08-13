# Design — ChurnGuard UI/UX

## 1. Prinsip Desain
- **Sederhana & ramah pengguna awam** — target pengguna pemilik UMKM, bukan orang teknis
- **Mobile-first** — mayoritas akan diakses dari HP
- **Flat design** — tanpa gradasi/bayangan berlebihan, warna solid
- **Warna semantik konsisten**: merah = risiko tinggi/peringatan, hijau = aman/WhatsApp, biru = email/info netral

## 2. Palet Warna (Usulan)
| Peran | Warna | Kegunaan |
|---|---|---|
| Primary | Biru tua | Tombol utama, header |
| Danger | Merah | Badge risiko tinggi, peringatan |
| Success | Hijau | Badge aman, tombol WhatsApp |
| Info | Biru muda | Tombol email, info netral |
| Netral | Abu-abu | Teks sekunder, border |

## 3. Daftar Layar

### 3.1 Landing / Login / Registrasi
- Landing singkat: nama produk, **penjelasan singkat kegunaan aplikasi** (mis. "Deteksi dini pelanggan yang berisiko berhenti bertransaksi, langsung dari data yang sudah Anda punya"), tombol "Masuk" dan "Daftar"
- **Coba tanpa akun**: tombol "Coba Sekarang" yang memungkinkan pengguna langsung upload/analisis **maksimal 3 kali** tanpa perlu mendaftar — hasilnya tetap ditampilkan, tapi **datanya tidak disimpan** (hilang begitu sesi ditutup). Tujuannya supaya calon pengguna bisa merasakan manfaatnya dulu sebelum memutuskan daftar akun.
- Form login: email, password
- Form registrasi: nama UMKM, email, password, konfirmasi password

### 3.2 Halaman Upload
- Area drag-and-drop besar untuk upload CSV/Excel
- Tombol alternatif "Input manual satu pelanggan"
- Instruksi singkat format data yang diterima (link ke template contoh)
- Jika pengguna sedang dalam mode coba tanpa akun, tampilkan indikator "Percobaan ke-X dari 3"

### 3.3 Status Proses
- Loading indicator sederhana saat file diproses backend

### 3.4 Dashboard
- Kartu ringkasan: total pelanggan, jumlah risiko tinggi, akurasi model
- Daftar pelanggan dengan badge warna (merah/hijau), nama/ID, skor risiko, dan **badge status kontak** (lihat 3.5)

### 3.5 Detail Pelanggan
- Skor risiko churn (persen)
- Daftar faktor utama penyebab (feature importance), divisualisasikan sederhana (bar chart kecil)
- Tombol "Hubungi via WhatsApp" (hijau) dan/atau "Kirim Email" (biru)

**Logika status kontak (penting):**
1. Status awal setiap pelanggan berisiko: `Belum Dihubungi`
2. Saat staf UMKM klik tombol WA/Email, status otomatis berubah jadi `Sudah Dihubungi (WA)` atau `Sudah Dihubungi (Email)`, dicatat juga waktunya (`contacted_at`)
3. **Pengecekan berkala**: karena sistem berbasis upload periodik (bukan koneksi live ke e-commerce), pengecekan "apakah pelanggan sudah transaksi lagi" dilakukan **setiap kali ada upload data baru** — sistem mencocokkan pelanggan yang sama (lewat nomor telepon/email sebagai kunci pengenal) antara upload lama dan baru
4. Jika pelanggan yang berstatus "Sudah Dihubungi" ternyata di upload terbaru menunjukkan aktivitas baru (mis. `DaySinceLastOrder` mengecil dibanding sebelumnya), status otomatis berubah jadi `Retensi Berhasil`
5. Kalau belum ada tanda transaksi baru, status tetap `Sudah Dihubungi` sampai upload berikutnya

### 3.6 Riwayat Upload
- Daftar sesi upload sebelumnya (tanggal, jumlah data, jumlah risiko tinggi), bisa diklik untuk lihat dashboard historis
- *(Catatan: hanya tersedia untuk pengguna yang punya akun — mode coba tanpa akun tidak punya riwayat karena datanya tidak disimpan)*

## 4. Komponen yang Dipakai Berulang
- **Metric card**: kartu ringkasan angka (dipakai di Dashboard)
- **Customer row**: baris pelanggan dengan avatar inisial, nama, badge status risiko + badge status kontak
- **Badge**: label warna kecil untuk status risiko/kontak
- **Empty state**: tampilan saat belum ada data (mis. "Belum ada pelanggan, unggah data untuk mulai")
