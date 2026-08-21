"""Unit test murni untuk validator password (schemas._validate_password_strength)
-- tidak butuh HTTP/DB."""

import pytest
from pydantic import ValidationError

from schemas import RegisterRequest


@pytest.mark.parametrize(
    "password",
    [
        "abcdefgh",  # tanpa angka
        "12345678",  # tanpa huruf
        "short1",  # kurang dari 8 karakter
        "a1" * 70,  # 140 karakter, lewat batas max_length=128
    ],
)
def test_weak_passwords_rejected(password):
    with pytest.raises(ValidationError):
        RegisterRequest(business_name="Toko", email="a@example.com", password=password)


@pytest.mark.parametrize("password", ["Passw0rd1", "abcdefg1", "P4sswordPanjang"])
def test_strong_enough_passwords_accepted(password):
    req = RegisterRequest(business_name="Toko", email="a@example.com", password=password)
    assert req.password == password
