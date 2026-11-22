VALID_CONTACT_STATUSES = [
    "belum_dihubungi",
    "dihubungi_wa",
    "dihubungi_email",
    "retensi_berhasil",
]

# Pagination default & batas atas (GET /customers, GET /upload-sessions) --
# batas atas mencegah satu request menarik seluruh tabel sekaligus.
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 200

# Nama kolom fitur (snake_case, persis skema `customers` di database.md) yang
# dipakai untuk prediksi. Urutan di sini hanya untuk kenyamanan pembacaan --
# urutan aktual yang dikirim ke model selalu mengikuti `model.feature_names_in_`
# (lihat ml/predictor.py) supaya tidak pernah salah urutan.
CUSTOMER_FEATURE_FIELDS = [
    "tenure",
    "warehouse_to_home",
    "hour_spend_on_app",
    "number_of_device_registered",
    "satisfaction_score",
    "number_of_address",
    "complain",
    "order_amount_hike",
    "coupon_used",
    "order_count",
    "day_since_last_order",
    "cashback_amount",
    "preferred_login_device",
    "preferred_payment_mode",
    "gender",
    "prefered_order_cat",
    "marital_status",
    "city_tier",
]


def feature_dict(source: dict) -> dict:
    """Ambil hanya kolom fitur (untuk dikirim ke model / disimpan ke Customer) dari dict sumber apa pun."""
    return {field: source.get(field) for field in CUSTOMER_FEATURE_FIELDS}


# Kolom identitas opsional di file upload/template (tidak dipakai model).
CUSTOMER_IDENTITY_FIELDS = ["name", "phone", "email"]

# Kolom bertipe bilangan bulat vs angka desimal (sisanya di CUSTOMER_FEATURE_FIELDS
# adalah kategorikal). Kolom desimal boleh kosong di file upload karena
# ChurnModel mengisinya dengan median data latih (imputation_medians.pkl);
# kolom bulat dan kategorikal WAJIB terisi.
INTEGER_FEATURE_FIELDS = [
    "number_of_device_registered",
    "satisfaction_score",
    "number_of_address",
    "complain",
    "city_tier",
]
DECIMAL_FEATURE_FIELDS = [
    "tenure",
    "warehouse_to_home",
    "hour_spend_on_app",
    "order_amount_hike",
    "coupon_used",
    "order_count",
    "day_since_last_order",
    "cashback_amount",
]

# Nilai kategori yang dikenali model (= classes_ di label_encoders.pkl; dijaga
# sinkron oleh tests/test_upload_utils.py). Parser upload mencocokkan isian
# pengguna ke nilai-nilai ini tanpa peduli huruf besar/kecil dan spasi ganda.
CATEGORY_VALUES = {
    "preferred_login_device": ["Computer", "Mobile Phone", "Phone"],
    "preferred_payment_mode": ["CC", "COD", "Cash on Delivery", "Credit Card", "Debit Card", "E wallet", "UPI"],
    "gender": ["Female", "Male"],
    "prefered_order_cat": ["Fashion", "Grocery", "Laptop & Accessory", "Mobile", "Mobile Phone", "Others"],
    "marital_status": ["Divorced", "Married", "Single"],
}

# Penulisan lain untuk kategori yang sama, disatukan saat parsing upload supaya
# berkas yang memakai ejaan lain tidak ditolak. Kunci alias sudah dalam bentuk
# huruf kecil dengan spasi tunggal. Kosongkan dict ini untuk mematikan
# penyatuan (nilai lalu dikirim ke model apa adanya).
CATEGORY_ALIASES = {
    "preferred_login_device": {"phone": "Mobile Phone", "mobile": "Mobile Phone"},
    "preferred_payment_mode": {"cc": "Credit Card", "cash on delivery": "COD"},
    "prefered_order_cat": {"phone": "Mobile Phone", "mobile": "Mobile Phone"},
}
