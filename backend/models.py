from sqlalchemy import Column, Float, ForeignKey, Integer, String, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    business_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    upload_sessions = relationship("UploadSession", back_populates="user", cascade="all, delete-orphan")
    customers = relationship("Customer", back_populates="user", cascade="all, delete-orphan")
    reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")


class UploadSession(Base):
    __tablename__ = "upload_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    total_customers = Column(Integer, nullable=False, default=0)
    high_risk_count = Column(Integer, nullable=False, default=0)
    uploaded_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="upload_sessions")
    customers = relationship("Customer", back_populates="upload_session", cascade="all, delete-orphan")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    upload_session_id = Column(Integer, ForeignKey("upload_sessions.id"), nullable=True, index=True)

    name = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True, index=True)
    email = Column(String(255), nullable=True, index=True)
    contact_status = Column(String(30), nullable=False, default="belum_dihubungi")
    contacted_at = Column(TIMESTAMP(timezone=True), nullable=True)

    tenure = Column(Float)
    warehouse_to_home = Column(Float)
    hour_spend_on_app = Column(Float)
    number_of_device_registered = Column(Integer)
    satisfaction_score = Column(Integer)
    number_of_address = Column(Integer)
    complain = Column(Integer)
    order_amount_hike = Column(Float)
    coupon_used = Column(Float)
    order_count = Column(Float)
    day_since_last_order = Column(Float)
    cashback_amount = Column(Float)
    preferred_login_device = Column(String(50))
    preferred_payment_mode = Column(String(50))
    gender = Column(String(20))
    prefered_order_cat = Column(String(50))
    marital_status = Column(String(50))
    city_tier = Column(Integer)

    churn_prediction = Column(Integer)
    churn_probability = Column(Float)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="customers")
    upload_session = relationship("UploadSession", back_populates="customers")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # Hash SHA-256 dari token acak yang dikirim lewat email -- token asli tidak
    # pernah disimpan di DB (mirip prinsip password_hash), supaya kalau tabel ini
    # bocor, token tetap tidak bisa dipakai langsung.
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)
    used_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="reset_tokens")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # Sama seperti PasswordResetToken -- hash SHA-256, token asli tidak pernah
    # disimpan, cuma dikirim sekali ke klien lewat cookie httpOnly.
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)
    # NULL = masih aktif. Diisi saat dipakai untuk refresh (rotasi) ATAU saat
    # user logout ATAU saat kedapatan dipakai ulang (dianggap dicuri).
    revoked_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="refresh_tokens")
