from fastapi import APIRouter, HTTPException, UploadFile, status

import schemas
from ml.predictor import ModelNotLoadedError, churn_model
from upload_utils import parse_upload_file

router = APIRouter(prefix="/api/trial", tags=["trial"])

# Endpoint di file ini SENGAJA tidak punya Depends(get_current_user) ataupun
# Depends(get_db) -- publik tanpa token, dan tidak pernah menyentuh database
# sama sekali (lihat api.md bagian "3. Trial Tanpa Akun"). Prediksi memakai
# ulang ChurnModel yang sama dengan router customers, cuma langkah simpan ke
# DB yang dilewati.


@router.post("/predict", response_model=schemas.TrialPredictResponse)
def trial_predict(payload: schemas.CustomerFeatures):
    try:
        prediction, probability = churn_model.predict_one(payload.model_dump())
    except ModelNotLoadedError:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Model belum siap")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return schemas.TrialPredictResponse(
        churn_prediction=prediction,
        churn_probability=probability,
        top_factors=churn_model.top_factors(),
    )


@router.post("/upload", response_model=schemas.TrialUploadResponse)
async def trial_upload(file: UploadFile):
    records = await parse_upload_file(file)

    try:
        predictions = churn_model.predict_batch(records)
    except ModelNotLoadedError:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Model belum siap")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

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
