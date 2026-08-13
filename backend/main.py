from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models  # noqa: F401 -- registrasi model ke Base.metadata
from database import Base, engine
from ml.predictor import churn_model
from routers import auth as auth_router
from routers import customers as customers_router
from routers import trial as trial_router
from routers import upload_sessions as upload_sessions_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    churn_model.load()  # model dimuat sekali di sini, dipakai ulang di semua request
    yield


app = FastAPI(title="ChurnGuard API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev only -- batasi ke origin frontend saat produksi
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(customers_router.router)
app.include_router(upload_sessions_router.router)
app.include_router(trial_router.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "ChurnGuard API"}
