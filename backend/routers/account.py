import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user, hash_password, verify_password
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/account", tags=["account"])


@router.patch("", response_model=schemas.RegisterResponse)
def update_account(
    payload: schemas.UpdateAccountRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if payload.business_name is None and payload.email is None and payload.new_password is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tidak ada perubahan yang dikirim")

    # Ganti email atau password itu aksi sensitif -- minta password saat ini
    # sebagai konfirmasi ulang (beda dari ganti nama usaha yang cukup token).
    # Sengaja 400, BUKAN 401 -- lihat komentar di DELETE /account soal
    # interceptor global 401 -> auto-logout di frontend (api/client.js).
    wants_sensitive_change = payload.email is not None or payload.new_password is not None
    if wants_sensitive_change:
        if not payload.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password saat ini wajib diisi untuk mengubah email atau password",
            )
        if not verify_password(payload.current_password, current_user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password saat ini salah")

    if payload.business_name is not None:
        current_user.business_name = payload.business_name

    if payload.email is not None and payload.email != current_user.email:
        existing = (
            db.query(models.User)
            .filter(models.User.email == payload.email, models.User.id != current_user.id)
            .first()
        )
        if existing is not None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email sudah dipakai akun lain")
        current_user.email = payload.email

    if payload.new_password is not None:
        current_user.password_hash = hash_password(payload.new_password)

    db.commit()
    db.refresh(current_user)

    changed = [f for f, v in [("business_name", payload.business_name), ("email", payload.email), ("password", payload.new_password)] if v is not None]
    logger.info("Akun diperbarui: user_id=%s field=%s", current_user.id, ",".join(changed))
    return current_user


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    payload: schemas.DeleteAccountRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Aksi ireversibel -- minta password lagi sebagai konfirmasi, supaya token
    # yang bocor/tertinggal di perangkat lain tidak bisa langsung menghapus akun.
    # Sengaja 400, BUKAN 401 -- token akses di request ini tetap valid (endpoint
    # sudah lolos get_current_user di atas), yang salah cuma password konfirmasi.
    # 401 dihindari karena frontend punya interceptor global yang men-treat SEMUA
    # 401 sebagai "token kadaluwarsa -> logout paksa" (lihat api/client.js
    # onUnauthorized), yang akan salah memaksa user logout padahal cuma typo password.
    if not verify_password(payload.password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password salah")

    # cascade="all, delete-orphan" di User.upload_sessions/customers/reset_tokens
    # (models.py) -- semua data akun ini ikut terhapus lewat ORM.
    user_id = current_user.id
    db.delete(current_user)
    db.commit()
    logger.warning("Akun dihapus permanen: user_id=%s", user_id)
