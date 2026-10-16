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

Dua cara menjelaskan "atribut penyebab churn" disediakan di sini, dan
keduanya TIDAK saling menggantikan:
  - `top_factors()`   : feature_importances_ bawaan Random Forest -- global,
                        identik untuk semua pelanggan, cuma mengurutkan
                        atribut yang secara keseluruhan paling berpengaruh
                        bagi model.
  - `local_factors()` : nilai SHAP (TreeExplainer) untuk SATU baris data --
                        personal per pelanggan, bisa bertanda positif
                        (mendorong ke arah churn) atau negatif (menariknya
                        ke arah tidak churn), dan atribut dominannya memang
                        terbukti berbeda-beda antarpelanggan (lihat artikel,
                        bagian Hasil 3.2). Endpoint yang menghadap pengguna
                        (GET /customers/{id}, POST /trial/predict) memakai
                        yang ini.
"""

import logging
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import shap

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


def _churn_class_shap_values(raw: Any) -> np.ndarray:
    """Ratakan output shap_values() ke array (n_samples, n_features) untuk
    kelas churn (label 1) saja -- bentuknya beda-beda antar versi pustaka
    shap: versi lama mengembalikan list [array_kelas0, array_kelas1], versi
    baru (>=0.45) mengembalikan satu ndarray (n_samples, n_features, n_kelas).
    """
    if isinstance(raw, list):
        return np.asarray(raw[1])
    arr = np.asarray(raw)
    if arr.ndim == 3:
        return arr[:, :, 1]
    return arr


class ChurnModel:
    def __init__(self) -> None:
        self._model = None
        self._label_encoders: dict[str, Any] = {}
        self._imputation_medians: dict[str, float] = {}
        self._explainer: shap.TreeExplainer | None = None

    def load(self) -> None:
        try:
            self._model = joblib.load(MODEL_PATH)
            self._label_encoders = joblib.load(LABEL_ENCODERS_PATH)
            self._imputation_medians = joblib.load(IMPUTATION_MEDIANS_PATH)
            self._explainer = shap.TreeExplainer(self._model)
        except Exception:
            logger.exception("Gagal memuat model/preprocessing churn dari %s", MODEL_PATH.parent)
            raise
        logger.info(
            "Model churn dimuat dari %s (%d fitur, %d encoder kategorikal, %d kolom imputasi, SHAP explainer siap)",
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

    @property
    def explainer(self) -> shap.TreeExplainer:
        if self._explainer is None:
            raise ModelNotLoadedError("SHAP explainer belum dimuat. Pastikan startup lifespan sudah jalan.")
        return self._explainer

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

    def local_factors(self, data: dict[str, Any], n: int = 5) -> list[dict[str, Any]]:
        """Penjelasan lokal (SHAP) untuk SATU pelanggan -- lihat catatan di
        kepala modul ini soal bedanya dengan top_factors(). `data` dipakai
        dengan cara yang sama seperti predict_one() (lewat FEATURE_FIELD_MAP),
        jadi dict customer/payload yang sudah berhasil dipakai predict_one()
        selalu bisa langsung dipakai di sini juga.
        """
        row = self._encode_row(data)
        df = pd.DataFrame([row])[list(self.model.feature_names_in_)]
        raw_shap = self.explainer.shap_values(df)
        values = _churn_class_shap_values(raw_shap)[0]

        pairs = sorted(
            zip(self.model.feature_names_in_, values),
            key=lambda pair: abs(pair[1]),
            reverse=True,
        )
        return [
            {
                "feature": feature,
                "contribution": round(float(value), 4),
                "direction": "increases_risk" if value >= 0 else "decreases_risk",
            }
            for feature, value in pairs[:n]
        ]


churn_model = ChurnModel()
