"""Wrapper di sekitar model_churn.pkl (RandomForestClassifier, scikit-learn).

Model dimuat sekali (lihat `load()`, dipanggil dari lifespan startup di main.py)
dan dipakai ulang untuk semua request -- tidak pernah joblib.load() per request.

Model dilatih dengan 18 fitur bernama gaya CamelCase (model.feature_names_in_),
sedangkan skema tabel `customers` di database.md pakai snake_case. FEATURE_FIELD_MAP
menerjemahkan snake_case -> nama asli model, dan urutan kolom yang dikirim ke
model.predict() SELALU diambil dari model.feature_names_in_ langsung -- bukan
di-hardcode -- supaya urutan kolom tidak pernah salah walau model diganti.

Kolom kategorikal di-encode lewat `label_encoders.pkl` -- dict of fitted
sklearn.preprocessing.LabelEncoder per kolom, di-fit HANYA pada data latih saat
training (lihat notebook eksperimen). Di sini cuma dipanggil `.transform()`,
TIDAK PERNAH fit ulang, supaya konsisten dengan metodologi train/test split
yang dipakai untuk melatih model (menghindari data leakage) -- kategori yang
tidak pernah dilihat encoder saat fit akan ditolak dengan pesan error yang
jelas, bukan ditebak diam-diam.

Kolom numerik yang di dataset training punya nilai kosong (NaN) diisi dengan
median dari data latih, disimpan di `imputation_medians.pkl`. Kolom yang tidak
ada di file ini (termasuk semua kolom kategorikal & integer yang di dataset
asli tidak pernah kosong) tetap WAJIB diisi -- baris dengan kolom itu kosong
akan ditolak (ValueError), bukan diimputasi.
"""

import logging
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).parent / "model_churn.pkl"
LABEL_ENCODERS_PATH = Path(__file__).parent / "label_encoders.pkl"
IMPUTATION_MEDIANS_PATH = Path(__file__).parent / "imputation_medians.pkl"

# model feature name (CamelCase) -> kolom snake_case di tabel customers / schemas
FEATURE_FIELD_MAP: dict[str, str] = {
    "Tenure": "tenure",
    "PreferredLoginDevice": "preferred_login_device",
    "CityTier": "city_tier",
    "WarehouseToHome": "warehouse_to_home",
    "PreferredPaymentMode": "preferred_payment_mode",
    "Gender": "gender",
    "HourSpendOnApp": "hour_spend_on_app",
    "NumberOfDeviceRegistered": "number_of_device_registered",
    "PreferedOrderCat": "prefered_order_cat",
    "SatisfactionScore": "satisfaction_score",
    "MaritalStatus": "marital_status",
    "NumberOfAddress": "number_of_address",
    "Complain": "complain",
    "OrderAmountHikeFromlastYear": "order_amount_hike",
    "CouponUsed": "coupon_used",
    "OrderCount": "order_count",
    "DaySinceLastOrder": "day_since_last_order",
    "CashbackAmount": "cashback_amount",
}


class ModelNotLoadedError(RuntimeError):
    pass


class ChurnModel:
    def __init__(self) -> None:
        self._model = None
        self._label_encoders: dict[str, Any] = {}
        self._imputation_medians: dict[str, float] = {}

    def load(self) -> None:
        try:
            self._model = joblib.load(MODEL_PATH)
            self._label_encoders = joblib.load(LABEL_ENCODERS_PATH)
            self._imputation_medians = joblib.load(IMPUTATION_MEDIANS_PATH)
        except Exception:
            logger.exception("Gagal memuat model/preprocessing churn dari %s", MODEL_PATH.parent)
            raise
        logger.info(
            "Model churn dimuat dari %s (%d fitur, %d encoder kategorikal, %d kolom imputasi)",
            MODEL_PATH,
            len(self._model.feature_names_in_),
            len(self._label_encoders),
            len(self._imputation_medians),
        )

    @property
    def model(self):
        if self._model is None:
            raise ModelNotLoadedError("Model churn belum dimuat. Pastikan startup lifespan sudah jalan.")
        return self._model

    def _encode_row(self, data: dict[str, Any], row_label: str = "") -> dict[str, Any]:
        row: dict[str, Any] = {}
        prefix = f"Baris {row_label}: " if row_label else ""
        for model_feature, field_name in FEATURE_FIELD_MAP.items():
            value = data.get(field_name)

            if value is None:
                if model_feature in self._imputation_medians:
                    row[model_feature] = self._imputation_medians[model_feature]
                    continue
                raise ValueError(f"{prefix}kolom '{field_name}' kosong/tidak ada")

            encoder = self._label_encoders.get(model_feature)
            if encoder is not None:
                try:
                    row[model_feature] = int(encoder.transform([value])[0])
                except ValueError:
                    allowed = ", ".join(encoder.classes_)
                    raise ValueError(
                        f"{prefix}nilai '{value}' tidak valid untuk '{field_name}'. Pilihan yang diterima: {allowed}"
                    ) from None
            else:
                row[model_feature] = value
        return row

    def predict_one(self, data: dict[str, Any]) -> tuple[int, float]:
        row = self._encode_row(data)
        df = pd.DataFrame([row])[list(self.model.feature_names_in_)]
        prediction = int(self.model.predict(df)[0])
        probability = float(self.model.predict_proba(df)[0][1])
        return prediction, probability

    def predict_batch(self, data_list: list[dict[str, Any]]) -> list[tuple[int, float]]:
        rows = [self._encode_row(d, row_label=str(i + 1)) for i, d in enumerate(data_list)]
        df = pd.DataFrame(rows)[list(self.model.feature_names_in_)]
        predictions = self.model.predict(df)
        probabilities = self.model.predict_proba(df)[:, 1]
        return list(zip((int(p) for p in predictions), (float(p) for p in probabilities)))

    def top_factors(self, n: int = 5) -> list[dict[str, Any]]:
        pairs = sorted(
            zip(self.model.feature_names_in_, self.model.feature_importances_),
            key=lambda pair: pair[1],
            reverse=True,
        )
        return [{"feature": feature, "importance": round(float(importance), 4)} for feature, importance in pairs[:n]]


churn_model = ChurnModel()
