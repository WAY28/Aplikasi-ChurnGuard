VALID_CONTACT_STATUSES = [
    "belum_dihubungi",
    "dihubungi_wa",
    "dihubungi_email",
    "retensi_berhasil",
]

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
