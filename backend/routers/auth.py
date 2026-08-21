import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

import config
import models
import schemas
from auth import (
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    clear_auth_cookies,
    create_access_token,
    ensure_aware_utc,
    get_current_user,
    hash_password,
    hash_refresh_token,
    issue_refresh_token,
    set_auth_cookies,
    verify_password,
)
from database import get_db
from email_utils import send_reset_email
from rate_limit import get_client_ip, limiter, login_guard

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Pesan generik dipakai untuk sukses maupun email tidak ditemukan, supaya
# endpoint forgot-password tidak bisa dipakai mengecek email mana saja yang
# terdaftar (user enumeration).
FORGOT_PASSWORD_GENERIC_MESSAGE = "Jika email terdaftar, link reset password sudah dikirim ke email tersebut."


@router.post("/register", response_model=schemas.RegisterResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/15minutes")
def register(request: Request, payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email sudah terdaftar")

    user = models.User(
        business_name=payload.business_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("Akun baru terdaftar: user_id=%s email=%s", user.id, user.email)
    return user


@router.post("/login", response_model=schemas.RegisterResponse)
def login(payload: schemas.LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    ip = get_client_ip(request)
    # NFR: maksimal 5 percobaan gagal / 15 menit per IP -- dicek SEBELUM
    # verifikasi kredensial supaya brute force tidak bisa terus menembak DB.
    login_guard.check(ip)

    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        login_guard.record_failure(ip)
        logger.warning("Login gagal: email=%s ip=%s", payload.email, ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email atau password salah")

    login_guard.record_success(ip)

    access_token = create_access_token(user.id)
    refresh_token = issue_refresh_token(db, user.id)
    db.commit()

    logger.info("Login berhasil: user_id=%s ip=%s", user.id, ip)

    # Token TIDAK dikirim di body respons -- cuma lewat Set-Cookie httpOnly,
    # supaya tidak pernah bisa dibaca JavaScript di frontend (proteksi XSS).
    set_auth_cookies(response, access_token, refresh_token)
    return user


@router.post("/refresh", response_model=schemas.MessageResponse)
@limiter.limit("30/15minutes")
def refresh_session(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_token = request.cookies.get(REFRESH_TOKEN_COOKIE)
    if not raw_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sesi tidak ditemukan, silakan masuk lagi")

    token_hash = hash_refresh_token(raw_token)
    stored = db.query(models.RefreshToken).filter(models.RefreshToken.token_hash == token_hash).first()

    invalid_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Sesi kedaluwarsa, silakan masuk lagi"
    )

    if stored is None:
        raise invalid_exc

    if stored.revoked_at is not None:
        # Refresh token yang SUDAH dipakai/direvoke dipakai lagi -> indikasi
        # token dicuri & dipakai ulang. Langkah pengamanan: revoke SEMUA
        # refresh token milik user ini, paksa login ulang di semua perangkat.
        db.query(models.RefreshToken).filter(
            models.RefreshToken.user_id == stored.user_id, models.RefreshToken.revoked_at.is_(None)
        ).update({"revoked_at": datetime.now(timezone.utc)})
        db.commit()
        clear_auth_cookies(response)
        logger.warning(
            "Refresh token yang sudah direvoke dipakai lagi (indikasi pencurian) -- "
            "semua sesi user_id=%s direvoke sebagai langkah pengamanan",
            stored.user_id,
        )
        raise invalid_exc

    if ensure_aware_utc(stored.expires_at) < datetime.now(timezone.utc):
        raise invalid_exc

    user = db.query(models.User).filter(models.User.id == stored.user_id).first()
    if user is None:
        raise invalid_exc

    # Rotasi: token lama langsung mati, ganti yang baru. Kalau token lama ini
    # dicuri dan dipakai lagi setelah ini, blok di atas yang akan mendeteksinya.
    stored.revoked_at = datetime.now(timezone.utc)
    new_access_token = create_access_token(user.id)
    new_refresh_token = issue_refresh_token(db, user.id)
    db.commit()

    set_auth_cookies(response, new_access_token, new_refresh_token)
    return schemas.MessageResponse(message="Sesi diperpanjang")


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    # Sengaja TIDAK pakai get_current_user -- logout harus tetap berhasil
    # membersihkan cookie & merevoke refresh token walau access token di
    # cookie sudah kedaluwarsa/tidak ada.
    raw_token = request.cookies.get(REFRESH_TOKEN_COOKIE)
    if raw_token:
        token_hash = hash_refresh_token(raw_token)
        stored = db.query(models.RefreshToken).filter(models.RefreshToken.token_hash == token_hash).first()
        if stored is not None and stored.revoked_at is None:
            stored.revoked_at = datetime.now(timezone.utc)
            db.commit()
            logger.info("Logout: refresh token direvoke, user_id=%s", stored.user_id)

    clear_auth_cookies(response)


@router.get("/me", response_model=schemas.RegisterResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.post("/forgot-password", response_model=schemas.ForgotPasswordResponse)
@limiter.limit("5/15minutes")
def forgot_password(request: Request, payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()

    if user is not None:
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=config.RESET_TOKEN_EXPIRE_MINUTES)

        reset_token = models.PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        db.add(reset_token)
        db.commit()

        reset_link = f"{config.FRONTEND_URL}/reset-password?token={raw_token}"
        send_reset_email(user.email, reset_link)
        logger.info("Link reset password diterbitkan: user_id=%s", user.id)

    # Balas pesan yang SAMA baik email ketemu atau tidak (lihat komentar di atas).
    return schemas.ForgotPasswordResponse(message=FORGOT_PASSWORD_GENERIC_MESSAGE)


@router.post("/reset-password", response_model=schemas.ResetPasswordResponse)
@limiter.limit("10/15minutes")
def reset_password(request: Request, payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    token_hash = hashlib.sha256(payload.token.encode("utf-8")).hexdigest()
    reset_token = db.query(models.PasswordResetToken).filter(models.PasswordResetToken.token_hash == token_hash).first()

    invalid_exc = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Link reset password tidak valid atau sudah kedaluwarsa. Minta link baru.",
    )

    if reset_token is None or reset_token.used_at is not None:
        raise invalid_exc
    if ensure_aware_utc(reset_token.expires_at) < datetime.now(timezone.utc):
        raise invalid_exc

    user = db.query(models.User).filter(models.User.id == reset_token.user_id).first()
    if user is None:
        raise invalid_exc

    user.password_hash = hash_password(payload.new_password)
    reset_token.used_at = datetime.now(timezone.utc)

    # Password direset lewat email (skenario "lupa password"/kemungkinan akun
    # kompromi) -- matikan semua sesi refresh token yang masih aktif, paksa
    # login ulang di semua perangkat pakai password baru.
    db.query(models.RefreshToken).filter(
        models.RefreshToken.user_id == user.id, models.RefreshToken.revoked_at.is_(None)
    ).update({"revoked_at": datetime.now(timezone.utc)})

    db.commit()

    logger.info("Password direset lewat email, semua sesi lama direvoke: user_id=%s", user.id)
    return schemas.ResetPasswordResponse(message="Password berhasil diubah. Silakan masuk dengan password baru.")
