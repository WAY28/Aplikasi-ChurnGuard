import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, Request, Response, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

import models
from config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    COOKIE_SAMESITE,
    COOKIE_SECURE,
    JWT_SECRET_KEY,
    REFRESH_TOKEN_EXPIRE_DAYS,
)
from database import get_db

ALGORITHM = "HS256"

# Nama cookie httpOnly. access_token di-scope ke seluruh app ("/"), refresh_token
# sengaja di-scope SEMPIT ke "/api/auth" saja -- browser cuma mengirimnya ke
# endpoint login/refresh/logout, tidak ikut "nebeng" di setiap request biasa
# (mis. GET /api/customers), memperkecil permukaan serangan kalau ada XSS/proxy bocor.
ACCESS_TOKEN_COOKIE = "access_token"
REFRESH_TOKEN_COOKIE = "refresh_token"
REFRESH_TOKEN_COOKIE_PATH = "/api/auth"

CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Token tidak ada/tidak valid",
)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire, "type": "access"}
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=ALGORITHM)


def hash_refresh_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def ensure_aware_utc(dt: datetime) -> datetime:
    """Postgres (production) selalu mengembalikan datetime timezone-aware untuk
    kolom TIMESTAMP(timezone=True), tapi SQLite (dipakai test suite -- lihat
    tests/conftest.py) mengembalikannya naive. Bandingkan langsung dengan
    datetime.now(timezone.utc) meledak (TypeError) kalau salah satu operand
    naive -- helper ini menganggap datetime naive sebagai UTC (sesuai memang
    selalu disimpan sebagai UTC di sini) supaya perbandingan expiry token
    aman terlepas dari backend database yang dipakai."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def issue_refresh_token(db: Session, user_id: int) -> str:
    """Bikin refresh token baru, simpan hash-nya ke DB (belum commit -- caller
    yang commit), balikin token MENTAH untuk ditaruh di cookie. Token mentah
    tidak pernah disimpan, cuma hash SHA-256-nya (mirip password_hash)."""
    raw_token = secrets.token_urlsafe(48)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    db.add(
        models.RefreshToken(
            user_id=user_id,
            token_hash=hash_refresh_token(raw_token),
            expires_at=expires_at,
        )
    )
    db.flush()
    return raw_token


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path="/",
    )
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE,
        value=refresh_token,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path=REFRESH_TOKEN_COOKIE_PATH,
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(
        ACCESS_TOKEN_COOKIE, path="/", secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE, httponly=True
    )
    response.delete_cookie(
        REFRESH_TOKEN_COOKIE,
        path=REFRESH_TOKEN_COOKIE_PATH,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        httponly=True,
    )


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> models.User:
    token = request.cookies.get(ACCESS_TOKEN_COOKIE)
    if not token:
        raise CREDENTIALS_EXCEPTION
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None or payload.get("type") != "access":
            raise CREDENTIALS_EXCEPTION
    except JWTError:
        raise CREDENTIALS_EXCEPTION

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise CREDENTIALS_EXCEPTION
    return user
