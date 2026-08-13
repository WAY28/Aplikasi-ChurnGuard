"""Parsing & validasi file upload CSV/Excel, dipakai bersama oleh
routers/customers.py (POST /customers/upload) dan routers/trial.py
(POST /trial/upload) supaya logikanya tidak dobel.
"""

import io

import pandas as pd
from fastapi import HTTPException, UploadFile, status

from constants import CUSTOMER_FEATURE_FIELDS

MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB (batasan teknis di requirements.md)
ALLOWED_UPLOAD_EXTENSIONS = {"csv", "xlsx"}


async def parse_upload_file(file: UploadFile) -> list[dict]:
    """Validasi ekstensi/ukuran, baca isi file, dan kembalikan baris-baris data
    sebagai list of dict siap dipakai ChurnModel.predict_batch(). Melempar
    HTTPException(400) kalau format/isi file tidak valid."""
    filename = file.filename or "upload"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Format file harus .csv atau .xlsx")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ukuran file maksimal 5 MB")
    if len(contents) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File kosong")

    try:
        if ext == "csv":
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="File tidak bisa dibaca, pastikan formatnya valid"
        )

    if len(df) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File tidak berisi baris data")

    missing_cols = [c for c in CUSTOMER_FEATURE_FIELDS if c not in df.columns]
    if missing_cols:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Kolom wajib tidak ditemukan di file: {', '.join(missing_cols)}",
        )

    df = df.where(pd.notnull(df), None)
    return df.to_dict(orient="records")
