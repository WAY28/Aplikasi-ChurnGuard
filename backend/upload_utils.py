"""Parsing & validasi file upload CSV/Excel, dipakai bersama oleh
routers/customers.py (POST /customers/upload) dan routers/trial.py
(POST /trial/upload) supaya logikanya tidak dobel.

CSV: pemisah (koma, titik koma, tab) dideteksi otomatis, BOM UTF-8 dan baris
"sep=," dari Excel diabaikan. Excel: sheet "Template" (kalau ada), kalau tidak
sheet pertama. Header dicocokkan tanpa peduli huruf besar/kecil, spasi, dan
underscore. Semua baris bermasalah dikumpulkan lalu dilaporkan sekaligus
dengan nomor baris seperti yang terlihat di Excel (header = baris 1).
"""

import csv
import io
import re

from fastapi import HTTPException, UploadFile, status
from openpyxl import load_workbook

from constants import (
    CATEGORY_ALIASES,
    CATEGORY_VALUES,
    CUSTOMER_FEATURE_FIELDS,
    CUSTOMER_IDENTITY_FIELDS,
    DECIMAL_FEATURE_FIELDS,
    INTEGER_FEATURE_FIELDS,
)

MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB (batasan teknis di requirements.md)
ALLOWED_UPLOAD_EXTENSIONS = {"csv", "xlsx"}
MAX_ERRORS_SHOWN = 10

ALL_FIELDS = CUSTOMER_IDENTITY_FIELDS + CUSTOMER_FEATURE_FIELDS
CSV_DELIMITERS = [",", ";", "\t"]
TEMPLATE_SHEET_NAME = "Template"

_SEP_DIRECTIVE = re.compile(r"^\s*sep=(.)\s*$", re.IGNORECASE)


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def _header_key(header) -> str:
    return re.sub(r"[\s_]+", "", str(header or "").strip().lower())


def _is_blank(value) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def _decode_csv(contents: bytes) -> str:
    # utf-8-sig membuang BOM. Excel Indonesia kadang menyimpan CSV sebagai
    # ANSI (Windows-1252), jadi itu cadangannya sebelum latin-1 yang tidak pernah gagal.
    for encoding in ("utf-8-sig", "cp1252"):
        try:
            return contents.decode(encoding)
        except UnicodeDecodeError:
            continue
    return contents.decode("latin-1")


def _read_csv_rows(contents: bytes) -> list[list]:
    lines = _decode_csv(contents).splitlines()
    delimiter = None
    if lines:
        match = _SEP_DIRECTIVE.match(lines[0])
        if match:
            lines = lines[1:]
            if match.group(1) in CSV_DELIMITERS:
                delimiter = match.group(1)

    if delimiter is None:
        header_line = next((ln for ln in lines if ln.strip()), "")
        counts = {d: header_line.count(d) for d in CSV_DELIMITERS}
        best = max(CSV_DELIMITERS, key=lambda d: counts[d])
        delimiter = best if counts[best] > 0 else ","

    return list(csv.reader(lines, delimiter=delimiter))


def _read_xlsx_rows(contents: bytes) -> list[list]:
    workbook = load_workbook(io.BytesIO(contents), data_only=True)
    sheet = workbook[TEMPLATE_SHEET_NAME] if TEMPLATE_SHEET_NAME in workbook.sheetnames else workbook.worksheets[0]
    return [list(row) for row in sheet.iter_rows(values_only=True)]


def _parse_number(value, integer: bool):
    """Balikin angka (int/float) atau None kalau kosong. Melempar ValueError
    dengan pesan siap tampil kalau bukan angka. Menerima koma desimal
    ("12,5") dan pemisah ribuan ("1.234,5" / "1,234.5")."""
    if _is_blank(value):
        return None
    if isinstance(value, (bool, int, float)):
        number = float(value)
    else:
        text = str(value).strip().replace(" ", "").replace(" ", "")
        if "," in text and "." in text:
            if text.rfind(",") > text.rfind("."):
                text = text.replace(".", "").replace(",", ".")
            else:
                text = text.replace(",", "")
        elif "," in text:
            text = text.replace(",", ".")
        try:
            number = float(text)
        except ValueError:
            raise ValueError(f"harus berupa angka (isinya '{str(value).strip()}')") from None

    if number != number or number in (float("inf"), float("-inf")):
        raise ValueError("harus berupa angka")
    if integer:
        if not number.is_integer():
            raise ValueError(f"harus berupa bilangan bulat (isinya '{value}')")
        return int(number)
    return number


def _canonical_category(field: str, value) -> str:
    key = " ".join(str(value).split()).casefold()
    aliased = CATEGORY_ALIASES.get(field, {}).get(key)
    if aliased:
        return aliased
    for allowed in CATEGORY_VALUES[field]:
        if allowed.casefold() == key:
            return allowed
    raise ValueError(f"nilai '{str(value).strip()}' tidak valid. Pilihan: {', '.join(CATEGORY_VALUES[field])}")


def _clean_text(value) -> str | None:
    if _is_blank(value):
        return None
    if isinstance(value, float) and value.is_integer():
        value = int(value)  # nomor HP yang tersimpan sebagai angka di Excel
    return str(value).strip()


def _build_record(raw: dict) -> tuple[dict, list[str]]:
    record: dict = {}
    problems: list[str] = []

    for field in CUSTOMER_IDENTITY_FIELDS:
        record[field] = _clean_text(raw.get(field))

    for field in CUSTOMER_FEATURE_FIELDS:
        value = raw.get(field)
        try:
            if field in INTEGER_FEATURE_FIELDS:
                number = _parse_number(value, integer=True)
                if number is None:
                    raise ValueError("tidak boleh kosong")
                record[field] = number
            elif field in DECIMAL_FEATURE_FIELDS:
                record[field] = _parse_number(value, integer=False)  # kosong = diimputasi median oleh model
            else:
                if _is_blank(value):
                    raise ValueError("tidak boleh kosong")
                record[field] = _canonical_category(field, value)
        except ValueError as exc:
            problems.append(f"kolom '{field}' {exc}")
    return record, problems


def _records_from_rows(rows: list[list]) -> list[dict]:
    """rows = seluruh baris sheet/CSV apa adanya (nomor baris = indeks + 1,
    persis seperti nomor baris di Excel)."""
    header_index = next((i for i, row in enumerate(rows) if any(not _is_blank(c) for c in row)), None)
    if header_index is None:
        raise _bad_request("File tidak berisi baris data")

    column_of: dict[str, int] = {}
    for position, header in enumerate(rows[header_index]):
        column_of.setdefault(_header_key(header), position)

    positions = {field: column_of.get(_header_key(field)) for field in ALL_FIELDS}
    missing = [f for f in CUSTOMER_FEATURE_FIELDS if positions[f] is None]
    if missing:
        raise _bad_request(f"Kolom wajib tidak ditemukan di file: {', '.join(missing)}")

    records: list[dict] = []
    errors: list[str] = []
    for index in range(header_index + 1, len(rows)):
        row = rows[index]
        if all(_is_blank(c) for c in row):
            continue
        raw = {f: (row[p] if p is not None and p < len(row) else None) for f, p in positions.items()}
        record, problems = _build_record(raw)
        if problems:
            errors.append(f"Baris {index + 1}: {'; '.join(problems)}")
        else:
            records.append(record)

    if errors:
        shown = errors[:MAX_ERRORS_SHOWN]
        if len(errors) > MAX_ERRORS_SHOWN:
            shown.append(f"...dan {len(errors) - MAX_ERRORS_SHOWN} baris lain yang bermasalah.")
        raise _bad_request(f"Ada {len(errors)} baris yang perlu diperbaiki:\n" + "\n".join(shown))
    if not records:
        raise _bad_request("File tidak berisi baris data")
    return records


async def parse_upload_file(file: UploadFile) -> list[dict]:
    """Validasi ekstensi/ukuran, baca isi file, dan kembalikan baris-baris data
    sebagai list of dict siap dipakai ChurnModel.predict_batch(). Melempar
    HTTPException(400) kalau format/isi file tidak valid."""
    filename = file.filename or "upload"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_UPLOAD_EXTENSIONS:
        raise _bad_request("Format file harus .csv atau .xlsx")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE_BYTES:
        raise _bad_request("Ukuran file maksimal 5 MB")
    if len(contents) == 0:
        raise _bad_request("File kosong")

    try:
        rows = _read_csv_rows(contents) if ext == "csv" else _read_xlsx_rows(contents)
    except Exception:
        raise _bad_request("File tidak bisa dibaca, pastikan formatnya valid") from None

    return _records_from_rows(rows)
