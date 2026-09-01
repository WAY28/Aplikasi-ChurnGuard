import logging
import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user, hash_password
from constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    # 404, bukan 403 -- supaya keberadaan endpoint admin tidak bisa dipakai
    # user biasa untuk mengonfirmasi dirinya ditolak KARENA bukan admin
    # (beda pesan/status antara "bukan admin" vs "endpoint tidak ada" bocorin info).
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
    return current_user


@router.get("/stats", response_model=schemas.AdminStatsOut)
def get_stats(
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_admin),
):
    return schemas.AdminStatsOut(
        total_users=db.query(func.count(models.User.id)).scalar(),
        total_customers=db.query(func.count(models.Customer.id)).scalar(),
        total_upload_sessions=db.query(func.count(models.UploadSession.id)).scalar(),
    )


@router.get("/users", response_model=schemas.PaginatedAdminUsersOut)
def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_admin),
):
    total = db.query(func.count(models.User.id)).scalar()

    customer_counts = dict(
        db.query(models.Customer.user_id, func.count(models.Customer.id)).group_by(models.Customer.user_id).all()
    )
    upload_counts = dict(
        db.query(models.UploadSession.user_id, func.count(models.UploadSession.id))
        .group_by(models.UploadSession.user_id)
        .all()
    )

    users = (
        db.query(models.User)
        .order_by(models.User.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    items = [
        schemas.AdminUserOut(
            id=u.id,
            business_name=u.business_name,
            email=u.email,
            is_admin=u.is_admin,
            created_at=u.created_at,
            customer_count=customer_counts.get(u.id, 0),
            upload_count=upload_counts.get(u.id, 0),
        )
        for u in users
    ]

    return schemas.PaginatedAdminUsersOut(
        items=items,
        page=page,
        limit=limit,
        total=total,
        total_pages=max(math.ceil(total / limit), 1) if total else 0,
    )


def get_target_user_or_404(db: Session, user_id: int) -> models.User:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User tidak ditemukan")
    return user


@router.post("/users/{user_id}/reset-password", response_model=schemas.MessageResponse)
def admin_reset_password(
    user_id: int,
    payload: schemas.AdminResetPasswordRequest,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    # Jalur darurat kalau email reset tidak sampai ke user -- bukan pengganti
    # alur forgot-password normal. User disarankan ganti password ini sendiri
    # lewat halaman Account begitu bisa masuk lagi.
    target = get_target_user_or_404(db, user_id)
    target.password_hash = hash_password(payload.new_password)

    # Sama seperti reset lewat email -- matikan semua sesi lama, paksa masuk
    # ulang pakai password baru di semua perangkat.
    db.query(models.RefreshToken).filter(
        models.RefreshToken.user_id == target.id, models.RefreshToken.revoked_at.is_(None)
    ).update({"revoked_at": func.now()})
    db.commit()

    logger.warning("Password direset manual oleh admin: admin_id=%s target_user_id=%s", admin.id, target.id)
    return schemas.MessageResponse(message="Password user berhasil direset.")


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    # Admin hapus akunnya sendiri lewat sini sengaja ditolak -- alur yang benar
    # untuk itu tetap halaman Account (minta konfirmasi password sendiri),
    # bukan tombol admin yang tidak minta konfirmasi apa pun.
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tidak bisa menghapus akun sendiri lewat sini. Gunakan halaman Akun.",
        )

    target = get_target_user_or_404(db, user_id)
    # cascade="all, delete-orphan" di models.User -- upload_sessions/customers/
    # reset_tokens/refresh_tokens ikut terhapus lewat ORM.
    db.delete(target)
    db.commit()
    logger.warning("Akun dihapus oleh admin: admin_id=%s target_user_id=%s", admin.id, user_id)
