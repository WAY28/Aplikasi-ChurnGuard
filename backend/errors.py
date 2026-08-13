from contextlib import contextmanager

from fastapi import HTTPException, status

from ml.predictor import ModelNotLoadedError


@contextmanager
def handle_prediction_errors():
    """Ubah error dari ChurnModel jadi HTTPException yang konsisten.
    Dipakai di setiap endpoint yang memanggil predict_one/predict_batch
    (routers/customers.py dan routers/trial.py)."""
    try:
        yield
    except ModelNotLoadedError:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Model belum siap")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
