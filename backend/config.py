import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

# Access token (JWT, cookie httpOnly "access_token"): umur pendek dengan
# sengaja -- kalau bocor, jendela penyalahgunaannya kecil. Sesi login yang
# "wajar" (NFR-3) sekarang dijaga oleh REFRESH token di bawah, bukan access
# token ini.
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))

# Refresh token (acak, di-hash, disimpan di tabel refresh_tokens supaya bisa
# direvoke -- lihat models.RefreshToken): umur panjang, cookie httpOnly
# "refresh_token" di-scope ke path /api/auth saja.
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# Atribut cookie auth. Default aman untuk dev (http://localhost, SameSite=Lax
# cukup karena frontend & backend dev sama-sama di "localhost", cuma beda
# port -- itu tetap dianggap same-site oleh browser).
#
# **WAJIB diubah saat deploy production**: frontend (Vercel) dan backend
# (Render) ada di domain BERBEDA (cross-site), jadi cookie httpOnly TIDAK
# akan pernah terkirim kecuali COOKIE_SECURE=true dan COOKIE_SAMESITE=none
# (browser menolak SameSite=None tanpa Secure). Set kedua env var ini di
# dashboard Render sebelum pakai fitur login di production.
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")

# Rate limiting login: berapa kali gagal yang ditoleransi per IP dalam satu window.
LOGIN_MAX_FAILED_ATTEMPTS = int(os.getenv("LOGIN_MAX_FAILED_ATTEMPTS", "5"))
LOGIN_LOCKOUT_WINDOW_MINUTES = int(os.getenv("LOGIN_LOCKOUT_WINDOW_MINUTES", "15"))

# Lupa password: masa berlaku token reset, dan base URL frontend untuk bikin link reset.
RESET_TOKEN_EXPIRE_MINUTES = int(os.getenv("RESET_TOKEN_EXPIRE_MINUTES", "60"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Pengirim email reset password -- lihat email_utils.py.
# Prioritas: Resend (kalau RESEND_API_KEY diisi) -> SMTP (kalau SMTP_HOST diisi) -> log ke console (dev).
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "ChurnGuard <onboarding@resend.dev>")
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USER or "")

# Origin frontend yang diizinkan CORS, dipisah koma. Default ke origin dev
# Vite (localhost/127.0.0.1:5173 dan preview :4173) -- BUKAN wildcard "*",
# supaya browser tidak menerima request cross-origin dari domain sembarangan.
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173",
    ).split(",")
    if origin.strip()
]

# Proteksi /docs, /redoc, /openapi.json di production. Tiga mode:
#   1. DOCS_ENABLED=false                                  -> nonaktif total (paling aman)
#   2. DOCS_ENABLED=true + DOCS_BASIC_AUTH_USER/PASSWORD    -> tetap ada, digembok HTTP Basic Auth
#   3. DOCS_ENABLED=true, dua-duanya kosong (default)       -> terbuka publik (perilaku lama, cocok utk dev lokal)
# Endpoint API-nya sendiri TETAP jalan di ketiga mode -- ini cuma soal
# dokumentasi/introspeksi skema yang bisa dilihat orang.
DOCS_ENABLED = os.getenv("DOCS_ENABLED", "true").lower() == "true"
DOCS_BASIC_AUTH_USER = os.getenv("DOCS_BASIC_AUTH_USER")
DOCS_BASIC_AUTH_PASSWORD = os.getenv("DOCS_BASIC_AUTH_PASSWORD")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL belum diset. Salin .env.example ke .env dan isi nilainya.")
if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY belum diset. Salin .env.example ke .env dan isi nilainya.")
