"""Pengirim email untuk alur lupa password.

Prioritas pengiriman (dicek di runtime, bukan di import time, supaya gampang
dites): Resend (kalau RESEND_API_KEY diisi) -> SMTP Gmail/lainnya (kalau
SMTP_HOST diisi) -> log ke console (mode dev, dipakai kalau dua-duanya kosong
supaya alur reset password tetap bisa dites end-to-end tanpa kredensial email
asli).
"""

import json
import logging
import smtplib
import urllib.error
import urllib.request
from email.mime.text import MIMEText

import config

logger = logging.getLogger("churnguard.email")

RESET_EMAIL_SUBJECT = "Reset Password ChurnGuard"


def _build_reset_email_body(reset_link: str) -> str:
    return (
        "Halo,\n\n"
        "Kami menerima permintaan reset password untuk akun ChurnGuard Anda.\n"
        f"Klik link berikut untuk membuat password baru (berlaku {config.RESET_TOKEN_EXPIRE_MINUTES} menit):\n\n"
        f"{reset_link}\n\n"
        "Kalau Anda tidak meminta ini, abaikan saja email ini -- password Anda tidak akan berubah.\n\n"
        "Salam,\nChurnGuard"
    )


def _send_via_resend(to_email: str, body: str) -> None:
    payload = json.dumps(
        {
            "from": config.RESEND_FROM_EMAIL,
            "to": [to_email],
            "subject": RESET_EMAIL_SUBJECT,
            "text": body,
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {config.RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        if resp.status >= 300:
            raise RuntimeError(f"Resend API mengembalikan status {resp.status}")


def _send_via_smtp(to_email: str, body: str) -> None:
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = RESET_EMAIL_SUBJECT
    msg["From"] = config.SMTP_FROM_EMAIL
    msg["To"] = to_email

    with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=10) as server:
        server.starttls()
        server.login(config.SMTP_USER, config.SMTP_PASSWORD)
        server.sendmail(config.SMTP_FROM_EMAIL, [to_email], msg.as_string())


def send_reset_email(to_email: str, reset_link: str) -> None:
    """Kirim email reset password. Tidak pernah melempar exception ke caller --
    kegagalan kirim email dicatat ke log saja, supaya endpoint forgot-password
    tetap membalas pesan generik yang sama (lihat routers/auth.py) baik email
    berhasil terkirim atau tidak (mencegah user enumeration lewat perbedaan
    respons/timing)."""
    body = _build_reset_email_body(reset_link)

    try:
        if config.RESEND_API_KEY:
            _send_via_resend(to_email, body)
            logger.info("Email reset password terkirim ke %s via Resend", to_email)
            return
        if config.SMTP_HOST:
            _send_via_smtp(to_email, body)
            logger.info("Email reset password terkirim ke %s via SMTP", to_email)
            return
    except (urllib.error.URLError, smtplib.SMTPException, OSError):
        logger.exception("Gagal mengirim email reset password ke %s", to_email)
        # sengaja tidak re-raise -- lihat docstring di atas

    # Mode dev/fallback: tidak ada RESEND_API_KEY maupun SMTP_HOST yang diisi.
    logger.warning(
        "RESEND_API_KEY/SMTP_HOST belum diset -- link reset password untuk %s dicetak ke log saja:\n%s",
        to_email,
        reset_link,
    )
