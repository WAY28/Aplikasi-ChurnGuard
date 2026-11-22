"""Pembuat template upload (.xlsx) -- dilayani oleh routers/template.py.

Header sheet "Template" memakai nama kolom teknis persis (dibaca parser di
upload_utils.py), jadi urutan dan penamaannya mengikuti
CUSTOMER_IDENTITY_FIELDS + CUSTOMER_FEATURE_FIELDS. Sheet "Panduan Pengisian"
menjelaskan tiap kolom dalam bahasa awam.
"""

import io
from functools import lru_cache

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

from constants import CUSTOMER_FEATURE_FIELDS, CUSTOMER_IDENTITY_FIELDS

TEMPLATE_FILENAME = "template-churnguard.xlsx"
XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

# Dropdown di template: subset "bersih" dari nilai yang dikenali model
# (varian ejaan seperti "CC" atau "Phone" tetap diterima parser, tapi tidak
# ditawarkan lagi ke pengguna baru). Dijaga valid oleh tests/test_upload_utils.py.
TEMPLATE_CATEGORY_OPTIONS = {
    "preferred_login_device": ["Mobile Phone", "Computer"],
    "preferred_payment_mode": ["Debit Card", "Credit Card", "UPI", "COD", "E wallet"],
    "gender": ["Male", "Female"],
    "prefered_order_cat": ["Mobile Phone", "Laptop & Accessory", "Fashion", "Grocery", "Others"],
    "marital_status": ["Single", "Married", "Divorced"],
}

SAMPLE_ROW = {
    "name": "Budi Santoso",
    "phone": "6281234567890",
    "email": "budi@email.com",
    "tenure": 12,
    "warehouse_to_home": 15,
    "hour_spend_on_app": 3,
    "number_of_device_registered": 4,
    "satisfaction_score": 2,
    "number_of_address": 3,
    "complain": 1,
    "order_amount_hike": 15,
    "coupon_used": 1,
    "order_count": 2,
    "day_since_last_order": 20,
    "cashback_amount": 120,
    "preferred_login_device": "Mobile Phone",
    "preferred_payment_mode": "Debit Card",
    "gender": "Male",
    "prefered_order_cat": "Mobile Phone",
    "marital_status": "Single",
    "city_tier": 1,
}

# (arti, satuan / pilihan nilai) per kolom, untuk sheet panduan.
FIELD_GUIDE = {
    "name": ("Nama pelanggan", "Teks bebas. Boleh dikosongkan."),
    "phone": ("Nomor WhatsApp pelanggan", "Teks, diawali 62 atau 0. Boleh dikosongkan."),
    "email": ("Alamat email pelanggan", "Teks. Boleh dikosongkan."),
    "tenure": ("Lama jadi pelanggan", "Bulan"),
    "warehouse_to_home": ("Jarak gudang ke rumah pelanggan", "Kilometer (km)"),
    "hour_spend_on_app": ("Lama pelanggan memakai aplikasi atau situs toko", "Jam"),
    "number_of_device_registered": ("Jumlah perangkat yang didaftarkan pelanggan", "Bilangan bulat (0 atau lebih)"),
    "satisfaction_score": ("Skor kepuasan pelanggan", "Bilangan bulat 1 sampai 5 (5 = paling puas)"),
    "number_of_address": ("Jumlah alamat pengiriman yang tersimpan", "Bilangan bulat (0 atau lebih)"),
    "complain": ("Pernah komplain bulan lalu?", "1 = ya, 0 = tidak"),
    "order_amount_hike": ("Kenaikan nilai pesanan dibanding tahun lalu", "Persen (%)"),
    "coupon_used": ("Jumlah kupon yang dipakai bulan lalu", "Jumlah"),
    "order_count": ("Jumlah pesanan bulan lalu", "Jumlah"),
    "day_since_last_order": ("Berapa hari sejak pesanan terakhir", "Hari"),
    "cashback_amount": ("Rata-rata cashback yang diterima pelanggan", "Nominal, tulis angka saja tanpa titik ribuan"),
    "preferred_login_device": ("Perangkat yang paling sering dipakai untuk login", None),
    "preferred_payment_mode": ("Metode pembayaran yang paling sering dipakai", None),
    "gender": ("Jenis kelamin pelanggan", None),
    "prefered_order_cat": ("Kategori produk yang paling sering dibeli", None),
    "marital_status": ("Status pernikahan pelanggan", None),
    "city_tier": ("Tingkat kota tempat tinggal pelanggan", "Pilih 1, 2, atau 3"),
}

GUIDE_NOTES = [
    "Catatan:",
    "1. Jangan ubah nama kolom di baris 1 sheet Template, karena dipakai sistem untuk membaca file.",
    "2. Baris 2 adalah contoh. Hapus atau timpa dengan data pelanggan Anda.",
    "3. Kolom name, phone, dan email boleh dikosongkan.",
    "4. Kolom berangka desimal (tenure, warehouse_to_home, hour_spend_on_app, order_amount_hike, coupon_used, "
    "order_count, day_since_last_order, cashback_amount) boleh dikosongkan, sistem mengisinya dengan nilai tipikal.",
    "5. Kolom lainnya wajib diisi. Isi kolom pilihan lewat dropdown supaya penulisannya benar.",
]

MAX_DATA_ROWS = 1000  # jumlah baris yang diberi dropdown/format di sheet Template

HEADER_FILL = PatternFill("solid", fgColor="0F1E3D")
HEADER_FONT = Font(bold=True, color="FFFFFF")
GUIDE_HEADER_FILL = PatternFill("solid", fgColor="4F6EF7")
THIN_BORDER = Border(*(Side(style="thin", color="D0D5DD"),) * 4)

# batas nilai untuk kolom angka: (tipe, operator, formula1, formula2, pesan)
NUMBER_RULES = {
    "tenure": ("decimal", "greaterThanOrEqual", "0", None, "Isi angka 0 atau lebih."),
    "warehouse_to_home": ("decimal", "greaterThanOrEqual", "0", None, "Isi angka 0 atau lebih."),
    "hour_spend_on_app": ("decimal", "greaterThanOrEqual", "0", None, "Isi angka 0 atau lebih."),
    "number_of_device_registered": ("whole", "greaterThanOrEqual", "0", None, "Isi bilangan bulat 0 atau lebih."),
    "satisfaction_score": ("whole", "between", "1", "5", "Isi bilangan bulat 1 sampai 5."),
    "number_of_address": ("whole", "greaterThanOrEqual", "0", None, "Isi bilangan bulat 0 atau lebih."),
    "complain": ("whole", "between", "0", "1", "Isi 1 jika pernah komplain, 0 jika tidak."),
    "order_amount_hike": ("decimal", "greaterThanOrEqual", "0", None, "Isi angka 0 atau lebih."),
    "coupon_used": ("decimal", "greaterThanOrEqual", "0", None, "Isi angka 0 atau lebih."),
    "order_count": ("decimal", "greaterThanOrEqual", "0", None, "Isi angka 0 atau lebih."),
    "day_since_last_order": ("decimal", "greaterThanOrEqual", "0", None, "Isi angka 0 atau lebih."),
    "cashback_amount": ("decimal", "greaterThanOrEqual", "0", None, "Isi angka 0 atau lebih."),
    "city_tier": ("whole", "between", "1", "3", "Pilih 1, 2, atau 3."),
}

COLUMN_WIDTHS = {
    "name": 22,
    "phone": 18,
    "email": 26,
    "preferred_login_device": 24,
    "preferred_payment_mode": 24,
    "prefered_order_cat": 24,
}


def _all_fields() -> list[str]:
    return CUSTOMER_IDENTITY_FIELDS + CUSTOMER_FEATURE_FIELDS


def _build_template_sheet(sheet) -> None:
    fields = _all_fields()
    sheet.append(fields)
    sheet.append([SAMPLE_ROW[f] for f in fields])

    for column, field in enumerate(fields, start=1):
        header = sheet.cell(row=1, column=column)
        header.fill = HEADER_FILL
        header.font = HEADER_FONT
        header.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        sheet.column_dimensions[get_column_letter(column)].width = COLUMN_WIDTHS.get(field, max(len(field) + 4, 14))
    sheet.row_dimensions[1].height = 36
    sheet.freeze_panes = "A2"

    # Kolom phone berformat TEKS (@) dan nilainya disimpan sebagai string,
    # supaya angka 0 atau 62 di depan tidak dibuang Excel.
    phone_column = fields.index("phone") + 1
    for row in range(2, MAX_DATA_ROWS + 2):
        sheet.cell(row=row, column=phone_column).number_format = "@"
    sheet.cell(row=2, column=phone_column).value = SAMPLE_ROW["phone"]

    last_row = MAX_DATA_ROWS + 1
    for field, options in TEMPLATE_CATEGORY_OPTIONS.items():
        column_letter = get_column_letter(fields.index(field) + 1)
        validation = DataValidation(
            type="list",
            formula1='"' + ",".join(options) + '"',
            allow_blank=False,
            showErrorMessage=True,
            errorTitle="Pilihan tidak valid",
            error="Pilih salah satu dari daftar: " + ", ".join(options) + ".",
        )
        validation.add(f"{column_letter}2:{column_letter}{last_row}")
        sheet.add_data_validation(validation)

    for field, (kind, operator, formula1, formula2, message) in NUMBER_RULES.items():
        column_letter = get_column_letter(fields.index(field) + 1)
        validation = DataValidation(
            type=kind,
            operator=operator,
            formula1=formula1,
            formula2=formula2,
            allow_blank=field in {"tenure", "warehouse_to_home", "hour_spend_on_app", "order_amount_hike",
                                  "coupon_used", "order_count", "day_since_last_order", "cashback_amount"},
            showErrorMessage=True,
            errorTitle="Isian tidak valid",
            error=message,
        )
        validation.add(f"{column_letter}2:{column_letter}{last_row}")
        sheet.add_data_validation(validation)


def _guide_example(field: str):
    value = SAMPLE_ROW[field]
    return str(value)


def _build_guide_sheet(sheet) -> None:
    sheet.append(["Nama kolom (teknis)", "Arti", "Satuan / pilihan nilai", "Contoh"])
    for column in range(1, 5):
        cell = sheet.cell(row=1, column=column)
        cell.fill = GUIDE_HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="left", vertical="center")
    sheet.row_dimensions[1].height = 26

    for field in _all_fields():
        meaning, unit = FIELD_GUIDE[field]
        if unit is None:
            unit = "Pilih salah satu: " + ", ".join(TEMPLATE_CATEGORY_OPTIONS[field])
        sheet.append([field, meaning, unit, _guide_example(field)])

    last_table_row = sheet.max_row
    for row in sheet.iter_rows(min_row=1, max_row=last_table_row, max_col=4):
        for cell in row:
            cell.border = THIN_BORDER
            cell.alignment = Alignment(vertical="top", wrap_text=True, horizontal=cell.alignment.horizontal)
    for row in range(2, last_table_row + 1):
        sheet.cell(row=row, column=1).font = Font(name="Consolas", size=10)
        sheet.cell(row=row, column=4).number_format = "@"

    for offset, note in enumerate(GUIDE_NOTES, start=2):
        cell = sheet.cell(row=last_table_row + offset, column=1, value=note)
        cell.font = Font(bold=(offset == 2))
        cell.alignment = Alignment(wrap_text=False)

    for letter, width in zip("ABCD", (30, 48, 52, 20)):
        sheet.column_dimensions[letter].width = width
    sheet.freeze_panes = "A2"


@lru_cache(maxsize=1)
def build_template_xlsx() -> bytes:
    workbook = Workbook()
    template_sheet = workbook.active
    template_sheet.title = "Template"
    _build_template_sheet(template_sheet)
    _build_guide_sheet(workbook.create_sheet("Panduan Pengisian"))

    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()
