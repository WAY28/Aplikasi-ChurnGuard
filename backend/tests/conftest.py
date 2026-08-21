"""Setup bersama untuk seluruh test suite backend.

PENTING: env var di bawah harus di-set SEBELUM modul `config`/`database`/`main`
manapun di-import (termasuk lewat import tidak langsung) -- `config.py`
langsung `raise RuntimeError` kalau DATABASE_URL/JWT_SECRET_KEY kosong, dan
`database.py` bikin SQLAlchemy engine sekali di level modul. Makanya baris
`os.environ[...] = ...` ini WAJIB jadi baris pertama yang dieksekusi, sebelum
baris `import` apa pun di bawah.

Trade-off yang disengaja: test pakai SQLite (file sementara), BUKAN Postgres
yang dipakai production. Ini bikin test suite jalan tanpa perlu service
database di CI/mesin developer sama sekali, dengan konsekuensi: perilaku yang
murni spesifik-Postgres (mis. constraint check di level DB) tidak tercakup di
sini -- tapi cukup untuk "test suite dasar" yang menguji logika aplikasi
(prediksi, autentikasi, validasi), bukan perilaku database engine itu sendiri.
"""

import os
import tempfile

_tmp_dir = tempfile.mkdtemp(prefix="churnguard_test_")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp_dir}/test.db"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-hanya-untuk-pytest-jangan-dipakai-di-mana-pun"
os.environ["RESEND_API_KEY"] = ""
os.environ["SMTP_HOST"] = ""
os.environ["LOGIN_MAX_FAILED_ATTEMPTS"] = "5"
os.environ["LOGIN_LOCKOUT_WINDOW_MINUTES"] = "15"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import models  # noqa: E402,F401 -- registrasi semua model ke Base.metadata
from database import Base, engine  # noqa: E402
from main import app  # noqa: E402
from rate_limit import limiter, login_guard  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    """Rate limiter (slowapi + LoginAttemptGuard) itu in-memory per-proses --
    tanpa ini, test yang jalan belakangan bisa keblokir 429 gara-gara test
    sebelumnya, bukan karena logika yang diuji salah."""
    login_guard._failures.clear()
    try:
        limiter.reset()
    except Exception:
        pass
    yield


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c
