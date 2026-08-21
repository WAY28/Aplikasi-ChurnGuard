import logging
import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user
from constants import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/upload-sessions", tags=["upload-sessions"])


@router.get("", response_model=schemas.PaginatedUploadSessionsOut)
def list_upload_sessions(
    page: int = Query(1, ge=1),
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # NFR-4: filter user_id WAJIB
    query = db.query(models.UploadSession).filter(models.UploadSession.user_id == current_user.id)
    total = query.with_entities(func.count(models.UploadSession.id)).scalar()

    items = (
        query.order_by(models.UploadSession.uploaded_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return schemas.PaginatedUploadSessionsOut(
        items=items,
        page=page,
        limit=limit,
        total=total,
        total_pages=max(math.ceil(total / limit), 1) if total else 0,
    )


@router.delete("/{upload_session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_upload_session(
    upload_session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session_obj = (
        db.query(models.UploadSession)
        .filter(models.UploadSession.id == upload_session_id, models.UploadSession.user_id == current_user.id)
        .first()
    )
    if session_obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesi upload tidak ditemukan")

    # cascade="all, delete-orphan" di UploadSession.customers (models.py) --
    # semua Customer di sesi ini ikut terhapus lewat ORM, tidak perlu query manual.
    total_customers = session_obj.total_customers
    db.delete(session_obj)
    db.commit()
    logger.info(
        "Sesi upload dihapus (cascade): user_id=%s upload_session_id=%s customer_ikut_terhapus=%d",
        current_user.id, upload_session_id, total_customers,
    )
