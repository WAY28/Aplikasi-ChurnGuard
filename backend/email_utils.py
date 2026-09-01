"""Pengirim email untuk alur lupa password.

Prioritas pengiriman (dicek di runtime, bukan di import time, supaya gampang
dites): Brevo (kalau BREVO_API_KEY diisi) -> Resend (kalau RESEND_API_KEY
diisi) -> SMTP Gmail/lainnya (kalau SMTP_HOST diisi) -> log ke console (mode
dev, dipakai kalau semuanya kosong supaya alur reset password tetap bisa
dites end-to-end tanpa kredensial email asli).

Brevo & Resend dipakai lewat HTTPS API (port 443), bukan SMTP (port 587) --
ini sengaja, karena banyak platform hosting gratis (termasuk Render) blokir
koneksi SMTP keluar untuk cegah penyalahgunaan spam, jadi jalur SMTP di bawah
akan selalu gagal dengan "Network is unreachable" di platform semacam itu.
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


def _send_via_brevo(to_email: str, body: str) -> None:
    payload = json.dumps(
        {
            "sender": {"email": config.BREVO_FROM_EMAIL},
            "to": [{"email": to_email}],
            "subject": RESET_EMAIL_SUBJECT,
            "textContent": body,
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=payload,
        method="POST",
        headers={
            "api-key": config.BREVO_API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        if resp.status >= 300:
            raise RuntimeError(f"Brevo API mengembalikan status {resp.status}")


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

    for provider_name, is_configured, send_fn in (
        ("Brevo", bool(config.BREVO_API_KEY), _send_via_brevo),
        ("Resend", bool(config.RESEND_API_KEY), _send_via_resend),
        ("SMTP", bool(config.SMTP_HOST), _send_via_smtp),
    ):
        if not is_configured:
            continue
        try:
            send_fn(to_email, body)
            logger.info("Email reset password terkirim ke %s via %s", to_email, provider_name)
            return
        except (urllib.error.URLError, smtplib.SMTPException, OSError):
            # sengaja tidak re-raise -- lihat docstring di atas. Tetap dicoba
            # provider berikutnya (kalau ada) sebelum jatuh ke mode log.
            logger.exception("Gagal mengirim email reset password ke %s via %s", to_email, provider_name)

    # Mode dev/fallback: tidak ada provider yang diset ATAU semua provider yang
    # diset gagal terkirim (lihat log exception di atas untuk detail sebabnya).
    logger.warning(
        "Tidak ada provider email yang berhasil mengirim (atau belum ada yang diset) -- "
        "link reset password untuk %s dicetak ke log saja:\n%s",
        to_email,
        reset_link,
    )
