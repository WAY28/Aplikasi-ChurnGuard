from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---- Auth ----


class RegisterRequest(BaseModel):
    business_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class RegisterResponse(BaseModel):
    id: int
    business_name: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---- Customer ----


class CustomerFeatures(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: str | None = None

    tenure: float
    warehouse_to_home: float
    hour_spend_on_app: float
    number_of_device_registered: int
    satisfaction_score: int
    number_of_address: int
    complain: int
    order_amount_hike: float
    coupon_used: float
    order_count: float
    day_since_last_order: float
    cashback_amount: float
    preferred_login_device: str
    preferred_payment_mode: str
    gender: str
    prefered_order_cat: str
    marital_status: str
    city_tier: int


class CustomerCreateResponse(BaseModel):
    id: int
    churn_prediction: int
    churn_probability: float


class TopFactor(BaseModel):
    feature: str
    importance: float


class CustomerOut(BaseModel):
    id: int
    upload_session_id: int | None
    name: str | None
    phone: str | None
    email: str | None
    contact_status: str
    contacted_at: datetime | None

    tenure: float | None
    warehouse_to_home: float | None
    hour_spend_on_app: float | None
    number_of_device_registered: int | None
    satisfaction_score: int | None
    number_of_address: int | None
    complain: int | None
    order_amount_hike: float | None
    coupon_used: float | None
    order_count: float | None
    day_since_last_order: float | None
    cashback_amount: float | None
    preferred_login_device: str | None
    preferred_payment_mode: str | None
    gender: str | None
    prefered_order_cat: str | None
    marital_status: str | None
    city_tier: int | None

    churn_prediction: int | None
    churn_probability: float | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CustomerDetailOut(CustomerOut):
    top_factors: list[TopFactor]


class ContactStatusUpdate(BaseModel):
    contact_status: Literal["dihubungi_wa", "dihubungi_email"]


class ContactStatusResponse(BaseModel):
    id: int
    contact_status: str
    contacted_at: datetime


class UploadResponse(BaseModel):
    upload_session_id: int
    total_customers: int
    high_risk_count: int


class UploadSessionOut(BaseModel):
    id: int
    filename: str
    total_customers: int
    high_risk_count: int
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---- Trial tanpa akun (publik, tidak disimpan ke DB) ----


class TrialPredictResponse(BaseModel):
    churn_prediction: int
    churn_probability: float
    top_factors: list[TopFactor]


class TrialUploadResultItem(BaseModel):
    row: int
    churn_prediction: int
    churn_probability: float


class TrialUploadResponse(BaseModel):
    total_customers: int
    high_risk_count: int
    results: list[TrialUploadResultItem]
