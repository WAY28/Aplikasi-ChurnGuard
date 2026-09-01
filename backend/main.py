import logging
import secrets
import time
from contextlib import asynccontextmanager

from logging_config import configure_logging

configure_logging()  # WAJIB paling awal -- sebelum modul lain sempat logging apa pun

from fastapi import Depends, FastAPI, HTTPException, Request, status  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.openapi.docs import get_swagger_ui_html  # noqa: E402
from fastapi.openapi.utils import get_openapi  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402
from fastapi.security import HTTPBasic, HTTPBasicCredentials  # noqa: E402
from slowapi import _rate_limit_exceeded_handler  # noqa: E402
from slowapi.errors import RateLimitExceeded  # noqa: E402
from slowapi.middleware import SlowAPIMiddleware  # noqa: E402

import config  # noqa: E402
import models  # noqa: E402,F401 -- registrasi model ke Base.metadata
from ml.predictor import churn_model  # noqa: E402
from rate_limit import limiter  # noqa: E402
from routers import account as account_router  # noqa: E402
from routers import admin as admin_router  # noqa: E402
from routers import auth as auth_router  # noqa: E402
from routers import customers as customers_router  # noqa: E402
from routers import trial as trial_router  # noqa: E402
from routers import upload_sessions as upload_sessions_router  # noqa: E402

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Skema database dikelola lewat Alembic sekarang (lihat backend/MIGRATIONS.md),
    # bukan create_all() otomatis -- jalankan `alembic upgrade head` sebelum start.
    churn_model.load()  # model dimuat sekali di sini, dipakai ulang di semua request
    logger.info("Model churn dimuat, ChurnGuard API siap menerima request")
    yield
    logger.info("ChurnGuard API shutdown")


# docs_url/redoc_url/openapi_url dikosongkan (None) di sini kalau DOCS_ENABLED=false
# ATAU kalau mau digembok Basic Auth (didaftarkan ulang manual di bawah dengan
# proteksi) -- lihat config.py untuk penjelasan 3 mode-nya.
_docs_gated = config.DOCS_ENABLED and config.DOCS_BASIC_AUTH_USER and config.DOCS_BASIC_AUTH_PASSWORD
_docs_kwargs = {"docs_url": None, "redoc_url": None, "openapi_url": None} if (not config.DOCS_ENABLED or _docs_gated) else {}

app = FastAPI(title="ChurnGuard API", version="1.0.0", lifespan=lifespan, **_docs_kwargs)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    # Daftar origin eksplisit (lihat config.CORS_ORIGINS), bukan wildcard "*".
    # Set env CORS_ORIGINS (dipisah koma) untuk menambah origin produksi.
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "%s %s -> %d (%.1fms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


if _docs_gated:
    security = HTTPBasic()

    def verify_docs_credentials(credentials: HTTPBasicCredentials = Depends(security)) -> None:
        # secrets.compare_digest -- perbandingan waktu-konstan, supaya durasi
        # respons tidak bisa dipakai menebak username/password karakter-per-karakter.
        correct_user = secrets.compare_digest(credentials.username, config.DOCS_BASIC_AUTH_USER)
        correct_password = secrets.compare_digest(credentials.password, config.DOCS_BASIC_AUTH_PASSWORD)
        if not (correct_user and correct_password):
            logger.warning("Percobaan akses /docs dengan kredensial salah (user=%r)", credentials.username)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Kredensial salah",
                headers={"WWW-Authenticate": "Basic"},
            )

    @app.get("/docs", include_in_schema=False)
    def get_docs(_: None = Depends(verify_docs_credentials)):
        return get_swagger_ui_html(openapi_url="/openapi.json", title=f"{app.title} - Docs")

    @app.get("/openapi.json", include_in_schema=False)
    def get_openapi_json(_: None = Depends(verify_docs_credentials)):
        return JSONResponse(get_openapi(title=app.title, version=app.version, routes=app.routes))

    logger.info("/docs aktif dengan proteksi HTTP Basic Auth")
elif not config.DOCS_ENABLED:
    logger.info("/docs dinonaktifkan (DOCS_ENABLED=false)")

app.include_router(auth_router.router)
app.include_router(customers_router.router)
app.include_router(upload_sessions_router.router)
app.include_router(trial_router.router)
app.include_router(account_router.router)
app.include_router(admin_router.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "ChurnGuard API"}
