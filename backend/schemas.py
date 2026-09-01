import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# ---- Auth ----

PASSWORD_MIN_LENGTH = 8


def _validate_password_strength(password: str) -> str:
    if len(password) < PASSWORD_MIN_LENGTH:
        raise ValueError(f"Password minimal {PASSWORD_MIN_LENGTH} karakter")
    if not re.search(r"[A-Za-z]", password):
        raise ValueError("Password harus mengandung minimal satu huruf")
    if not re.search(r"\d", password):
        raise ValueError("Password harus mengandung minimal satu angka")
    return password


class RegisterRequest(BaseModel):
    business_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=128)

    @field_validator("password")
    @classmethod
    def check_password_strength(cls, value: str) -> str:
        return _validate_password_strength(value)


class RegisterResponse(BaseModel):
    id: int
    business_name: str
    email: str
    is_admin: bool = False

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=128)

    @field_validator("new_password")
    @classmethod
    def check_password_strength(cls, value: str) -> str:
        return _validate_password_strength(value)


class ResetPasswordResponse(BaseModel):
    message: str


class MessageResponse(BaseModel):
    message: str


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


class PaginatedCustomersOut(BaseModel):
    items: list[CustomerOut]
    page: int
    limit: int
    total: int
    total_pages: int
    high_risk_total: int


class PaginatedUploadSessionsOut(BaseModel):
    items: list[UploadSessionOut]
    page: int
    limit: int
    total: int
    total_pages: int


# ---- Kelola akun ----


class DeleteAccountRequest(BaseModel):
    password: str


class UpdateAccountRequest(BaseModel):
    business_name: str | None = Field(None, min_length=1, max_length=255)
    email: EmailStr | None = None
    # Wajib diisi kalau mengubah email ATAU password (lihat routers/account.py)
    current_password: str | None = None
    new_password: str | None = Field(None, min_length=PASSWORD_MIN_LENGTH, max_length=128)

    @field_validator("new_password")
    @classmethod
    def check_new_password_strength(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return _validate_password_strength(value)


# ---- Admin ----


class AdminUserOut(BaseModel):
    id: int
    business_name: str
    email: str
    is_admin: bool
    created_at: datetime
    customer_count: int
    upload_count: int


class PaginatedAdminUsersOut(BaseModel):
    items: list[AdminUserOut]
    page: int
    limit: int
    total: int
    total_pages: int


class AdminStatsOut(BaseModel):
    total_users: int
    total_customers: int
    total_upload_sessions: int


class AdminResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=128)

    @field_validator("new_password")
    @classmethod
    def check_password_strength(cls, value: str) -> str:
        return _validate_password_strength(value)


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
