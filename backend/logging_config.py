"""Konfigurasi logging terpusat -- dipanggil sekali di awal main.py, sebelum
apa pun lain jalan, supaya format log seragam di seluruh aplikasi (termasuk
logger `uvicorn.access`/`uvicorn.error` bawaan, yang otomatis ikut format ini
lewat root logger karena propagate=True secara default).

Level diatur lewat env var LOG_LEVEL (default INFO). Semua modul aplikasi
pakai `logging.getLogger(__name__)` -- lihat routers/auth.py, rate_limit.py,
dst. -- bukan print(), supaya log punya timestamp, level, dan asal modul yang
jelas, dan bisa diatur levelnya tanpa ubah kode.
"""

import logging
import os
import sys

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def configure_logging() -> None:
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    logging.basicConfig(
        level=level,
        format=LOG_FORMAT,
        datefmt=DATE_FORMAT,
        stream=sys.stdout,
        force=True,  # timpa basicConfig default yang mungkin sudah dipasang uvicorn
    )

    # SQLAlchemy engine logging (query SQL mentah) berisik banget di INFO --
    # biarkan WARNING ke atas saja kecuali sengaja di-debug lewat LOG_LEVEL=DEBUG.
    if level > logging.DEBUG:
        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    # Access log bawaan uvicorn ("127.0.0.1:xxxx - GET / HTTP/1.1 200") duplikat
    # dengan middleware log_requests di main.py (yang formatnya konsisten dengan
    # log lain + ada durasi) -- matikan yang bawaan supaya tidak dobel.
    logging.getLogger("uvicorn.access").disabled = True
