"""Test parser upload (upload_utils), template xlsx (template_utils), dan
endpoint-nya. Parser dites langsung (tanpa HTTP) untuk kasus format file, dan
lewat POST /api/trial/upload (publik, tanpa database) untuk memastikan hasil
prediksi sama di semua format."""

import asyncio
import io
from pathlib import Path

import joblib
import pytest
from fastapi import HTTPException, UploadFile
from openpyxl import Workbook, load_workbook

import upload_utils
from constants import (
    CATEGORY_ALIASES,
    CATEGORY_VALUES,
    CUSTOMER_FEATURE_FIELDS,
    CUSTOMER_IDENTITY_FIELDS,
    DECIMAL_FEATURE_FIELDS,
    INTEGER_FEATURE_FIELDS,
)
from template_utils import SAMPLE_ROW, TEMPLATE_CATEGORY_OPTIONS, build_template_xlsx

ALL_FIELDS = CUSTOMER_IDENTITY_FIELDS + CUSTOMER_FEATURE_FIELDS
ML_DIR = Path(__file__).resolve().parent.parent / "ml"
LEGACY_FIXTURE = Path(__file__).resolve().parents[2] / "frontend" / "tests" / "blackbox" / "fixtures" / "valid_customers.csv"

ROW_A = dict(SAMPLE_ROW, tenure="12,5")  # koma desimal gaya Excel Indonesia
ROW_B = dict(
    SAMPLE_ROW, name="Siti", phone="081200000002", email="siti@x.id", tenure="1", satisfaction_score=1,
    complain=1, day_since_last_order=70, preferred_payment_mode="COD", city_tier=3, cashback_amount="40",
)
ROW_C = dict(SAMPLE_ROW, name="Rudi", phone="081200000003", email="rudi@x.id", tenure="30", satisfaction_score=5,
             complain=0, day_since_last_order=2, preferred_login_device="Computer", gender="Female")


def make_csv(rows, delimiter=",", bom=False, sep_line=False, header=None, fields=None, newline="\r\n") -> bytes:
    """`fields` = kolom data yang ditulis (default semua); `header` = teks
    header yang ditulis (default sama dengan `fields`, boleh beda ejaan)."""
    fields = fields or ALL_FIELDS
    header = header or fields
    lines = [delimiter.join(header)]
    for row in rows:
        lines.append(delimiter.join(str(row.get(f, "")) for f in fields))
    text = newline.join(lines) + newline
    if sep_line:
        text = f"sep={delimiter}{newline}" + text
    return (b"\xef\xbb\xbf" if bom else b"") + text.encode("utf-8")


def make_xlsx(rows, header=None, sheet_title="Template") -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = sheet_title
    sheet.append(header or ALL_FIELDS)
    for row in rows:
        sheet.append([row.get(f) for f in ALL_FIELDS])
    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def parse(contents: bytes, filename: str):
    upload = UploadFile(filename=filename, file=io.BytesIO(contents))
    return asyncio.run(upload_utils.parse_upload_file(upload))


def parse_error(contents: bytes, filename: str = "data.csv") -> str:
    with pytest.raises(HTTPException) as exc:
        parse(contents, filename)
    assert exc.value.status_code == 400
    return exc.value.detail


# ---- pemisah CSV ----


def test_csv_comma_parses():
    records = parse(make_csv([ROW_B, ROW_C], delimiter=","), "data.csv")
    assert len(records) == 2
    assert records[0]["name"] == "Siti" and records[0]["tenure"] == 1.0
    assert records[0]["satisfaction_score"] == 1 and isinstance(records[0]["satisfaction_score"], int)


def test_csv_semicolon_with_decimal_comma():
    records = parse(make_csv([ROW_A], delimiter=";"), "data.csv")
    assert records[0]["tenure"] == 12.5


def test_csv_tab_parses():
    records = parse(make_csv([ROW_B], delimiter="\t"), "data.csv")
    assert records[0]["name"] == "Siti"


def test_utf8_bom_is_ignored():
    records = parse(make_csv([ROW_B], delimiter=";", bom=True), "data.csv")
    assert len(records) == 1 and records[0]["name"] == "Siti"


def test_sep_line_is_skipped():
    for delimiter in (",", ";"):
        records = parse(make_csv([ROW_B], delimiter=delimiter, sep_line=True), "data.csv")
        assert len(records) == 1 and records[0]["email"] == "siti@x.id"


def test_ansi_encoded_csv_is_readable():
    contents = make_csv([dict(ROW_B, name="Sérgio")], delimiter=";").decode("utf-8").encode("cp1252")
    assert parse(contents, "data.csv")[0]["name"] == "Sérgio"


# ---- header ----


def test_header_matching_ignores_case_spaces_underscores():
    header = ["Name", "PHONE", "Email", "Tenure", "Warehouse To Home", "hour-spend_on app".replace("-", " "),
              "NUMBER_OF_DEVICE_REGISTERED", "Satisfaction Score", "number of address", "COMPLAIN",
              "Order_Amount Hike", "coupon used", "ORDER COUNT", "day_since_last_order", "Cashback Amount",
              "Preferred Login Device", "preferred_payment_mode", "GENDER", "Prefered Order Cat",
              "Marital Status", "City Tier"]
    records = parse(make_csv([ROW_B], header=header), "data.csv")
    assert records[0]["hour_spend_on_app"] == SAMPLE_ROW["hour_spend_on_app"]
    assert records[0]["city_tier"] == 3


def test_extra_columns_are_ignored():
    contents = make_csv([ROW_B]).replace(b"city_tier", b"city_tier,catatan", 1).replace(b",3\r\n", b",3,halo\r\n")
    assert len(parse(contents, "data.csv")) == 1


def test_missing_columns_message_names_the_columns():
    header = [h for h in ALL_FIELDS if h not in ("tenure", "satisfaction_score", "city_tier")]
    lines = [",".join(header), ",".join("1" for _ in header)]
    detail = parse_error("\n".join(lines).encode("utf-8"))
    assert detail.startswith("Kolom wajib tidak ditemukan di file:")
    for column in ("tenure", "satisfaction_score", "city_tier"):
        assert column in detail


def test_identity_columns_are_optional():
    header = [h for h in ALL_FIELDS if h not in CUSTOMER_IDENTITY_FIELDS]
    records = parse(make_csv([ROW_B], fields=header), "data.csv")
    assert records[0]["name"] is None and records[0]["phone"] is None


# ---- baris bermasalah ----


def test_invalid_rows_are_listed_with_excel_row_numbers():
    bad_category = dict(ROW_C, gender="Alien")
    bad_number = dict(ROW_B, tenure="abc", satisfaction_score="3,5")
    # header = baris 1, ROW_B bagus = baris 2, baris kosong = 3, bad_number = 4, bad_category = 5
    contents = (
        make_csv([ROW_B], delimiter=";").rstrip(b"\r\n") + b"\r\n\r\n"
        + make_csv([bad_number, bad_category], delimiter=";").split(b"\r\n", 1)[1]
    )
    detail = parse_error(contents)
    assert "Ada 2 baris" in detail
    assert "Baris 4:" in detail and "tenure" in detail and "satisfaction_score" in detail
    assert "Baris 5:" in detail and "gender" in detail and "Female, Male" in detail
    assert "Baris 2:" not in detail


def test_error_list_is_capped():
    bad_rows = [dict(ROW_B, gender="Alien") for _ in range(14)]
    detail = parse_error(make_csv(bad_rows))
    assert "Ada 14 baris" in detail
    assert detail.count("Baris ") == upload_utils.MAX_ERRORS_SHOWN
    assert "...dan 4 baris lain" in detail


def test_blank_rows_are_ignored():
    contents = make_csv([ROW_B]) + b"\r\n" + b",,,,,,\r\n" + make_csv([ROW_C]).split(b"\r\n", 1)[1]
    assert [r["name"] for r in parse(contents, "data.csv")] == ["Siti", "Rudi"]


def test_empty_decimal_is_allowed_but_empty_integer_or_category_is_not():
    ok = parse(make_csv([dict(ROW_B, tenure="", cashback_amount="")]), "data.csv")
    assert ok[0]["tenure"] is None and ok[0]["cashback_amount"] is None

    assert "satisfaction_score" in parse_error(make_csv([dict(ROW_B, satisfaction_score="")]))
    assert "gender" in parse_error(make_csv([dict(ROW_B, gender="")]))


def test_header_only_file_is_rejected():
    assert parse_error(make_csv([])) == "File tidak berisi baris data"


def test_unsupported_extension_and_empty_and_oversize_files():
    assert parse_error(b"x", "data.txt") == "Format file harus .csv atau .xlsx"
    assert parse_error(b"", "data.csv") == "File kosong"
    assert parse_error(b"a" * (upload_utils.MAX_UPLOAD_SIZE_BYTES + 1), "data.csv") == "Ukuran file maksimal 5 MB"
    assert "tidak bisa dibaca" in parse_error(b"bukan xlsx beneran", "data.xlsx")


# ---- normalisasi kategori & nomor HP ----


def test_category_values_are_normalized():
    row = dict(ROW_B, preferred_login_device=" phone ", preferred_payment_mode="CC", gender="male",
               prefered_order_cat="MOBILE", marital_status="single")
    record = parse(make_csv([row]), "data.csv")[0]
    assert record["preferred_login_device"] == "Mobile Phone"
    assert record["preferred_payment_mode"] == "Credit Card"
    assert record["gender"] == "Male"
    assert record["prefered_order_cat"] == "Mobile Phone"
    assert record["marital_status"] == "Single"

    cod = parse(make_csv([dict(ROW_B, preferred_payment_mode="Cash  on Delivery"), dict(ROW_B, preferred_payment_mode="e WALLET")]), "data.csv")
    assert [r["preferred_payment_mode"] for r in cod] == ["COD", "E wallet"]


def test_phone_with_lost_zero_does_not_fail():
    csv_record = parse(make_csv([dict(ROW_B, phone="81200000002")]), "data.csv")[0]
    assert csv_record["phone"] == "81200000002"

    workbook = Workbook()
    sheet = workbook.active
    sheet.append(ALL_FIELDS)
    sheet.append([ROW_B[f] if f != "phone" else 81200000002 for f in ALL_FIELDS])  # angka, bukan teks
    buffer = io.BytesIO()
    workbook.save(buffer)
    assert parse(buffer.getvalue(), "data.xlsx")[0]["phone"] == "81200000002"


def test_xlsx_keeps_text_phone_with_leading_zero_and_uses_template_sheet():
    workbook = Workbook()
    other = workbook.active
    other.title = "Catatan"
    other.append(["bukan", "data"])
    sheet = workbook.create_sheet("Template")
    sheet.append(ALL_FIELDS)
    sheet.append([ROW_B[f] for f in ALL_FIELDS])
    buffer = io.BytesIO()
    workbook.save(buffer)
    record = parse(buffer.getvalue(), "data.xlsx")[0]
    assert record["phone"] == "081200000002" and record["name"] == "Siti"


# ---- konsistensi hasil prediksi antarformat ----


def trial_upload(client, contents: bytes, filename: str):
    resp = client.post("/api/trial/upload", files={"file": (filename, contents, "application/octet-stream")})
    assert resp.status_code == 200, resp.text
    return [(r["churn_prediction"], r["churn_probability"]) for r in resp.json()["results"]]


def test_xlsx_comma_csv_and_semicolon_csv_give_identical_predictions(client):
    rows_dot = [dict(ROW_A, tenure="12.5"), ROW_B, ROW_C]
    rows_comma_decimal = [ROW_A, dict(ROW_B), ROW_C]  # tenure "12,5" hanya valid di CSV bertitik koma
    from_xlsx = trial_upload(client, make_xlsx([dict(r, tenure=float(str(r["tenure"]).replace(",", "."))) for r in rows_dot]), "a.xlsx")
    from_comma = trial_upload(client, make_csv(rows_dot, delimiter=","), "a.csv")
    from_semicolon = trial_upload(client, make_csv(rows_comma_decimal, delimiter=";", bom=True, sep_line=True), "a.csv")
    assert from_xlsx == from_comma == from_semicolon
    assert len(from_xlsx) == 3


@pytest.mark.skipif(not LEGACY_FIXTURE.exists(), reason="fixture black-box tidak ada")
def test_legacy_comma_csv_still_parses(client):
    results = trial_upload(client, LEGACY_FIXTURE.read_bytes(), "valid_customers.csv")
    assert len(results) >= 1


def test_trial_upload_returns_all_row_errors(client):
    contents = make_csv([dict(ROW_B, gender="Alien"), dict(ROW_C, tenure="abc")])
    resp = client.post("/api/trial/upload", files={"file": ("a.csv", contents, "text/csv")})
    assert resp.status_code == 400
    assert "Baris 2:" in resp.json()["detail"] and "Baris 3:" in resp.json()["detail"]


# ---- template xlsx ----


def test_template_endpoint_serves_xlsx_publicly(client):
    resp = client.get("/api/template")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    assert "template-churnguard.xlsx" in resp.headers["content-disposition"]
    assert resp.content[:2] == b"PK"


def test_template_layout():
    workbook = load_workbook(io.BytesIO(build_template_xlsx()))
    assert workbook.sheetnames == ["Template", "Panduan Pengisian"]

    sheet = workbook["Template"]
    assert [c.value for c in sheet[1]] == ALL_FIELDS and len(ALL_FIELDS) == 21
    assert sheet[2][0].value == "Budi Santoso"
    assert sheet.freeze_panes == "A2"
    assert sheet.cell(row=2, column=2).number_format == "@" and sheet.cell(row=500, column=2).number_format == "@"
    assert sheet.cell(row=2, column=2).value == "6281234567890"
    assert sheet["A1"].fill.fgColor.rgb.endswith("0F1E3D")

    validated = {rng for dv in sheet.data_validations.dataValidation for rng in [str(dv.sqref)]}
    for field in list(TEMPLATE_CATEGORY_OPTIONS) + ["satisfaction_score", "complain", "city_tier", "tenure"]:
        letter = chr(ord("A") + ALL_FIELDS.index(field))
        assert any(r.startswith(f"{letter}2:") for r in validated), field

    guide = workbook["Panduan Pengisian"]
    assert [c.value for c in guide[1]] == ["Nama kolom (teknis)", "Arti", "Satuan / pilihan nilai", "Contoh"]
    assert [guide.cell(row=r, column=1).value for r in range(2, 23)] == ALL_FIELDS
    meanings = {guide.cell(row=r, column=1).value: guide.cell(row=r, column=2).value for r in range(2, 23)}
    assert meanings["tenure"] == "Lama jadi pelanggan" and "komplain" in meanings["complain"]


def test_downloaded_template_can_be_uploaded_as_is(client):
    contents = client.get("/api/template").content
    results = trial_upload(client, contents, "template-churnguard.xlsx")
    assert len(results) == 1


# ---- sinkron dengan model ----


def test_category_values_match_model_encoders():
    encoders = joblib.load(ML_DIR / "label_encoders.pkl")
    from ml.predictor import FEATURE_FIELD_MAP

    by_field = {FEATURE_FIELD_MAP[k]: sorted(v.classes_) for k, v in encoders.items()}
    assert {f: sorted(v) for f, v in CATEGORY_VALUES.items()} == by_field


def test_numeric_field_groups_match_model_imputation_and_cover_all_features():
    medians = joblib.load(ML_DIR / "imputation_medians.pkl")
    from ml.predictor import FEATURE_FIELD_MAP

    assert sorted(DECIMAL_FEATURE_FIELDS) == sorted(FEATURE_FIELD_MAP[k] for k in medians)
    assert sorted(INTEGER_FEATURE_FIELDS + DECIMAL_FEATURE_FIELDS + list(CATEGORY_VALUES)) == sorted(CUSTOMER_FEATURE_FIELDS)


def test_template_options_and_aliases_resolve_to_valid_model_categories():
    for field, options in TEMPLATE_CATEGORY_OPTIONS.items():
        for option in options:
            assert upload_utils._canonical_category(field, option) in CATEGORY_VALUES[field]
    for field, aliases in CATEGORY_ALIASES.items():
        assert all(target in CATEGORY_VALUES[field] for target in aliases.values())
