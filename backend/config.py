import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # NFR-3: token berlaku 24 jam

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL belum diset. Salin .env.example ke .env dan isi nilainya.")
if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY belum diset. Salin .env.example ke .env dan isi nilainya.")
