from fastapi import APIRouter, UploadFile

import schemas
from errors import handle_prediction_errors
from ml.predictor import churn_model
from upload_utils import parse_upload_file

router = APIRouter(prefix="/api/trial", tags=["trial"])

# Endpoint di file ini SENGAJA tidak punya Depends(get_current_user) ataupun
# Depends(get_db) -- publik tanpa token, dan tidak pernah menyentuh database
# sama sekali (lihat api.md bagian "3. Trial Tanpa Akun"). Prediksi memakai
# ulang ChurnModel yang sama dengan router customers, cuma langkah simpan ke
# DB yang dilewati.


@router.post("/predict", response_model=schemas.TrialPredictResponse)
def trial_predict(payload: schemas.CustomerFeatures):
    with handle_prediction_errors():
        prediction, probability = churn_model.predict_one(payload.model_dump())

    return schemas.TrialPredictResponse(
        churn_prediction=prediction,
        churn_probability=probability,
        top_factors=churn_model.top_factors(),
    )


@router.post("/upload", response_model=schemas.TrialUploadResponse)
async def trial_upload(file: UploadFile):
    records = await parse_upload_file(file)

    with handle_prediction_errors():
        predictions = churn_model.predict_batch(records)

    results = []
    high_risk_count = 0
    for row_number, (prediction, probability) in enumerate(predictions, start=1):
        results.append(
            schemas.TrialUploadResultItem(row=row_number, churn_prediction=prediction, churn_probability=probability)
        )
        if prediction == 1:
            high_risk_count += 1

    return schemas.TrialUploadResponse(
        total_customers=len(records),
        high_risk_count=high_risk_count,
        results=results,
    )
