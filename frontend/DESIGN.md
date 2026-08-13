# ChurnGuard — Rencana Desain

## Tema
Deteksi dini risiko pelanggan. Sinyal kecil yang terlihat lebih awal, sebelum pelanggan benar-benar pergi.

## Warna (peran)
| Peran | Kode | Dipakai untuk |
|---|---|---|
| Primary (navy) | `#0F1E3D` | Header/navbar, logo, tombol utama (btn-primary), avatar pelanggan |
| Primary Dark | dihitung lebih gelap dari primary | Hover dari tombol/elemen navy |
| Accent interaktif (elektrik) | `#4F6EF7` | Tautan, focus ring, tombol sekunder (btn-outline), tombol Email, badge info, tab aktif, hover state |
| Success / Aman / WhatsApp | `#22C55E` | Badge aman, tombol WhatsApp, status positif |
| Danger / Risiko Tinggi | `#F04438` | Badge risiko tinggi, tombol destruktif, error |
| Signature/highlight (amber) | `#F5A623` | Dipakai terbatas: motif dekoratif hero Landing, indikator mode trial, banner offline |
| Ink (teks utama) | dekat navy, bukan hitam pekat | Teks judul dan body |

Latar halaman: `#F5F7FA`. Permukaan kartu putih `#FFFFFF`. Border abu dingin tipis.

Prinsip pembagian warna: navy dipakai untuk identitas merek dan permukaan besar (navbar, tombol utama, logo). Aksen elektrik dikhususkan untuk apa pun yang bisa diklik/interaktif (tautan, fokus, tombol sekunder). Amber sengaja dibatasi ke momen "spesial" saja (mode coba tanpa akun, peringatan offline, motif hero) supaya tidak kehilangan makna kalau dipakai di mana-mana.

Sengaja dihindari: latar krem + font serif + aksen terracotta (klise 1), latar nyaris hitam + satu aksen neon (klise 2), garis tipis kotak tanpa lengkung ala koran (klise 3). Sudut tetap membulat (radius kecil sampai besar tergantung elemen), warna tetap warna solid datar (flat), tidak ada gradasi.

## Tipografi (2 peran)
- **Judul (display)**: Sora, sedikit geometris dan tegas, dipakai untuk h1 sampai h3, angka besar di metric card, dan skor risiko. Dipasang lokal lewat `@fontsource/sora` (bukan CDN, supaya tetap tampil saat offline sesuai NFR PWA).
- **Body**: Inter, netral dan sangat terbaca, dipakai untuk paragraf, label, tombol, input. Dipasang lokal lewat `@fontsource/inter`.

## Elemen Signature
Ikon **Activity** dari Lucide (garis pulsa/detak, seperti alat pemantau) dipakai sebagai penanda merek ChurnGuard di navbar dan halaman Landing. Di belakang teks hero Landing ada ilustrasi dekoratif (posisi absolut, opacity rendah, tidak mengganggu keterbacaan teks) yang memakai warna navy dan aksen elektrik yang sama, satu-satunya tempat elemen dekoratif besar dipakai. Halaman lain tetap tenang: kartu putih rapi, warna semantik konsisten, tanpa hiasan tambahan.

## Aksesibilitas & Interaksi
- Semua elemen interaktif (tombol, tautan, input, kartu yang bisa diklik) punya `:focus-visible` dengan outline warna primary + offset, terlihat jelas saat navigasi keyboard.
- Layout mobile-first, breakpoint utama di 640px dan 960px.

## Gaya Penulisan UI
Tidak memakai tanda hubung (`-` atau `—`) sebagai penghubung antar klausa di teks antarmuka. Kalimat dipecah pendek pendek, dipisah titik atau koma.
