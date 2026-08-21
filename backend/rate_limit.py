"""Rate limiting untuk endpoint auth.

- Register: dibatasi pakai slowapi (flat request-count per IP) lewat
  `limiter.limit(...)` di routers/auth.py -- mencegah spam registrasi /
  enumerasi email lewat pesan "Email sudah terdaftar".
- Login: dibatasi pakai LoginAttemptGuard di bawah, BUKAN slowapi -- slowapi
  menghitung setiap request (termasuk yang sukses), sedangkan kebutuhannya
  "maksimal 5 percobaan GAGAL per IP / 15 menit" harus membedakan sukses vs
  gagal, jadi butuh penghitung custom.
"""

import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from threading import Lock

from fastapi import HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from config import LOGIN_LOCKOUT_WINDOW_MINUTES, LOGIN_MAX_FAILED_ATTEMPTS

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)


def get_client_ip(request: Request) -> str:
    # Render/Vercel dkk jalan di belakang proxy -- X-Forwarded-For berisi IP asli klien.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class LoginAttemptGuard:
    """Penghitung percobaan login GAGAL per IP, in-memory.

    Cukup untuk deployment single-instance (mis. satu dyno Render). Kalau nanti
    backend di-scale ke banyak instance sekaligus, pindahkan penyimpanan ini
    ke Redis supaya semua instance berbagi hitungan yang sama.
    """

    def __init__(self, max_attempts: int, window_minutes: int) -> None:
        self._max_attempts = max_attempts
        self._window = timedelta(minutes=window_minutes)
        self._failures: dict[str, list[datetime]] = defaultdict(list)
        self._lock = Lock()

    def _prune(self, ip: str, now: datetime) -> None:
        cutoff = now - self._window
        self._failures[ip] = [ts for ts in self._failures[ip] if ts > cutoff]

    def check(self, ip: str) -> None:
        """Lempar 429 kalau IP ini sudah kena limit. Dipanggil SEBELUM cek kredensial."""
        now = datetime.now(timezone.utc)
        with self._lock:
            self._prune(ip, now)
            attempts = self._failures[ip]
            if len(attempts) >= self._max_attempts:
                retry_after = int((attempts[0] + self._window - now).total_seconds())
                retry_after = max(retry_after, 1)
                logger.warning("Login diblokir (rate limit): ip=%s percobaan_gagal=%d", ip, len(attempts))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=(
                        f"Terlalu banyak percobaan login gagal. "
                        f"Coba lagi dalam {max(retry_after // 60, 1)} menit."
                    ),
                    headers={"Retry-After": str(retry_after)},
                )

    def record_failure(self, ip: str) -> None:
        now = datetime.now(timezone.utc)
        with self._lock:
            self._prune(ip, now)
            self._failures[ip].append(now)

    def record_success(self, ip: str) -> None:
        with self._lock:
            self._failures.pop(ip, None)


login_guard = LoginAttemptGuard(LOGIN_MAX_FAILED_ATTEMPTS, LOGIN_LOCKOUT_WINDOW_MINUTES)
