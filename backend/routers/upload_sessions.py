from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/api/upload-sessions", tags=["upload-sessions"])


@router.get("", response_model=list[schemas.UploadSessionOut])
def list_upload_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # NFR-4: filter user_id WAJIB
    return (
        db.query(models.UploadSession)
        .filter(models.UploadSession.user_id == current_user.id)
        .order_by(models.UploadSession.uploaded_at.desc())
        .all()
    )
