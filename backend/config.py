import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # NFR-3: token berlaku 24 jam

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

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL belum diset. Salin .env.example ke .env dan isi nilainya.")
if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY belum diset. Salin .env.example ke .env dan isi nilainya.")
