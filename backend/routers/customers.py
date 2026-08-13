from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user
from constants import CUSTOMER_FEATURE_FIELDS, feature_dict
from database import get_db
from errors import handle_prediction_errors
from ml.predictor import churn_model
from upload_utils import parse_upload_file

router = APIRouter(prefix="/api/customers", tags=["customers"])


def get_customer_or_404(db: Session, customer_id: int, user_id: int) -> models.Customer:
    # NFR-4: filter user_id WAJIB, dan 404 (bukan 403) baik saat id tidak ada
    # maupun saat id ada tapi bukan milik akun ini -- pesan error sengaja disamakan.
    customer = (
        db.query(models.Customer).filter(models.Customer.id == customer_id, models.Customer.user_id == user_id).first()
    )
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pelanggan tidak ditemukan")
    return customer


@router.post("", response_model=schemas.CustomerCreateResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: schemas.CustomerFeatures,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    with handle_prediction_errors():
        prediction, probability = churn_model.predict_one(payload.model_dump())

    customer = models.Customer(
        user_id=current_user.id,
        upload_session_id=None,
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        contact_status="belum_dihubungi",
        churn_prediction=prediction,
        churn_probability=probability,
        **feature_dict(payload.model_dump()),
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    return schemas.CustomerCreateResponse(id=customer.id, churn_prediction=prediction, churn_probability=probability)


@router.post("/upload", response_model=schemas.UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_customers(
    file: UploadFile,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    filename = file.filename or "upload"
    records = await parse_upload_file(file)

    with handle_prediction_errors():
        predictions = churn_model.predict_batch(records)

    upload_session = models.UploadSession(
        user_id=current_user.id,
        filename=filename,
        total_customers=0,
        high_risk_count=0,
    )
    db.add(upload_session)
    db.flush()  # dapatkan upload_session.id tanpa commit dulu

    high_risk_count = 0
    for record, (prediction, probability) in zip(records, predictions):
        phone = record.get("phone")
        email = record.get("email")
        name = record.get("name")

        existing = None
        if phone:
            existing = (
                db.query(models.Customer)
                .filter(models.Customer.user_id == current_user.id, models.Customer.phone == str(phone))
                .order_by(models.Customer.created_at.desc())
                .first()
            )
        if existing is None and email:
            existing = (
                db.query(models.Customer)
                .filter(models.Customer.user_id == current_user.id, models.Customer.email == str(email))
                .order_by(models.Customer.created_at.desc())
                .first()
            )

        # Logika pencocokan antar upload -- lihat database.md bagian 7 (FR-16).
        # Kalau ketemu kecocokan, UPDATE row yang sudah ada (bukan insert baru) supaya
        # satu pelanggan tidak duplikat tiap kali diupload ulang (mis. upload bulanan).
        if existing is not None:
            new_contact_status = existing.contact_status
            new_day_since = record.get("day_since_last_order")
            if (
                existing.contact_status != "belum_dihubungi"
                and new_day_since is not None
                and existing.day_since_last_order is not None
                and new_day_since < existing.day_since_last_order
            ):
                new_contact_status = "retensi_berhasil"

            status_changed = new_contact_status != existing.contact_status

            existing.upload_session_id = upload_session.id
            existing.name = name
            existing.phone = str(phone) if phone else None
            existing.email = email
            existing.contact_status = new_contact_status
            if status_changed:
                existing.contacted_at = datetime.now(timezone.utc)
            existing.churn_prediction = prediction
            existing.churn_probability = probability
            for field in CUSTOMER_FEATURE_FIELDS:
                setattr(existing, field, record.get(field))
            db.add(existing)
        else:
            customer = models.Customer(
                user_id=current_user.id,
                upload_session_id=upload_session.id,
                name=name,
                phone=str(phone) if phone else None,
                email=email,
                contact_status="belum_dihubungi",
                churn_prediction=prediction,
                churn_probability=probability,
                **feature_dict(record),
            )
            db.add(customer)

        # Flush per baris supaya duplikat phone/email di dalam file yang sama juga
        # ke-match ke row yang barusan diproses, bukan cuma ke data lama di DB
        # (session ini autoflush=False -- lihat database.py).
        db.flush()

        if prediction == 1:
            high_risk_count += 1

    upload_session.total_customers = len(records)
    upload_session.high_risk_count = high_risk_count
    db.commit()
    db.refresh(upload_session)

    return schemas.UploadResponse(
        upload_session_id=upload_session.id,
        total_customers=upload_session.total_customers,
        high_risk_count=upload_session.high_risk_count,
    )


@router.get("", response_model=list[schemas.CustomerOut])
def list_customers(
    upload_session_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # NFR-4: selalu filter user_id dari token, tidak pernah percaya input lain
    query = db.query(models.Customer).filter(models.Customer.user_id == current_user.id)
    if upload_session_id is not None:
        query = query.filter(models.Customer.upload_session_id == upload_session_id)
    return query.order_by(models.Customer.created_at.desc()).all()


@router.get("/{customer_id}", response_model=schemas.CustomerDetailOut)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    customer = get_customer_or_404(db, customer_id, current_user.id)

    top_factors = churn_model.top_factors()
    detail = schemas.CustomerOut.model_validate(customer).model_dump()
    return schemas.CustomerDetailOut(**detail, top_factors=top_factors)


@router.patch("/{customer_id}/contact", response_model=schemas.ContactStatusResponse)
def update_contact_status(
    customer_id: int,
    payload: schemas.ContactStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    customer = get_customer_or_404(db, customer_id, current_user.id)

    customer.contact_status = payload.contact_status
    customer.contacted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(customer)

    return schemas.ContactStatusResponse(
        id=customer.id,
        contact_status=customer.contact_status,
        contacted_at=customer.contacted_at,
    )
