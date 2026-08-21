"""Unit test murni untuk ml/predictor.py -- tidak butuh HTTP/DB sama sekali,
cuma model_churn.pkl. Profil SAFE/RISKY di bawah sudah divalidasi manual
sebelumnya (lihat riwayat kerja) menghasilkan prediksi 0 (aman) dan 1 (risiko
tinggi, probability 0.66) secara konsisten -- dipakai di sini sebagai golden
value supaya regresi pada model/encoding ketahuan.
"""

import pytest

from ml.predictor import ChurnModel, ModelNotLoadedError

SAFE_PROFILE = {
    "tenure": 30, "warehouse_to_home": 5, "hour_spend_on_app": 4,
    "number_of_device_registered": 3, "satisfaction_score": 5, "number_of_address": 2,
    "complain": 0, "order_amount_hike": 15, "coupon_used": 3, "order_count": 15,
    "day_since_last_order": 2, "cashback_amount": 200,
    "preferred_login_device": "Computer", "preferred_payment_mode": "Debit Card",
    "gender": "Female", "prefered_order_cat": "Laptop & Accessory", "marital_status": "Married", "city_tier": 1,
}
RISKY_PROFILE = {
    "tenure": 1, "warehouse_to_home": 35, "hour_spend_on_app": 6,
    "number_of_device_registered": 4, "satisfaction_score": 1, "number_of_address": 4,
    "complain": 1, "order_amount_hike": 25, "coupon_used": 0, "order_count": 1,
    "day_since_last_order": 70, "cashback_amount": 40,
    "preferred_login_device": "Mobile Phone", "preferred_payment_mode": "COD",
    "gender": "Male", "prefered_order_cat": "Mobile", "marital_status": "Single", "city_tier": 3,
}


@pytest.fixture(scope="module")
def model():
    m = ChurnModel()
    m.load()
    return m


def test_model_not_loaded_raises():
    m = ChurnModel()
    with pytest.raises(ModelNotLoadedError):
        _ = m.model


def test_predict_one_safe_profile_is_low_risk(model):
    prediction, probability = model.predict_one(SAFE_PROFILE)
    assert prediction == 0
    assert 0.0 <= probability < 0.5


def test_predict_one_risky_profile_is_high_risk(model):
    prediction, probability = model.predict_one(RISKY_PROFILE)
    assert prediction == 1
    assert probability == pytest.approx(0.66, abs=0.01)


def test_predict_batch_matches_predict_one(model):
    batch_results = model.predict_batch([RISKY_PROFILE, SAFE_PROFILE])
    assert batch_results[0] == model.predict_one(RISKY_PROFILE)
    assert batch_results[1] == model.predict_one(SAFE_PROFILE)


def test_predict_one_missing_field_raises_value_error(model):
    incomplete = dict(SAFE_PROFILE)
    del incomplete["tenure"]
    with pytest.raises(ValueError, match="tenure"):
        model.predict_one(incomplete)


def test_predict_one_invalid_category_raises_value_error(model):
    invalid = dict(SAFE_PROFILE)
    invalid["gender"] = "Tidak Diketahui"
    with pytest.raises(ValueError, match="gender"):
        model.predict_one(invalid)


def test_predict_batch_row_label_in_error_message(model):
    records = [SAFE_PROFILE, {**SAFE_PROFILE, "gender": "Tidak Diketahui"}]
    with pytest.raises(ValueError, match="Baris 2"):
        model.predict_batch(records)


def test_top_factors_shape_and_order(model):
    factors = model.top_factors(n=5)
    assert len(factors) == 5
    for item in factors:
        assert set(item.keys()) == {"feature", "importance"}
        assert 0.0 <= item["importance"] <= 1.0
    importances = [f["importance"] for f in factors]
    assert importances == sorted(importances, reverse=True)


def test_top_factors_respects_n(model):
    assert len(model.top_factors(n=3)) == 3
    assert len(model.top_factors(n=10)) == 10
