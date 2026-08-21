"""Test autentikasi lewat HTTP (FastAPI TestClient) -- `client` fixture (lihat
conftest.py) mempertahankan cookie antar request dalam satu test, persis
seperti satu tab browser."""

import random


def rand_email(prefix="user"):
    return f"{prefix}.{random.randint(100000, 999999)}@example.com"


def register(client, email=None, password="Passw0rd1", business_name="Toko Test"):
    email = email or rand_email()
    resp = client.post(
        "/api/auth/register",
        json={"business_name": business_name, "email": email, "password": password},
    )
    return email, password, resp


def test_register_success(client):
    email, password, resp = register(client)
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == email
    assert "password" not in body
    assert "password_hash" not in body


def test_register_duplicate_email_rejected(client):
    email, password, _ = register(client)
    _, _, resp = register(client, email=email)
    assert resp.status_code == 400


def test_register_weak_password_rejected(client):
    _, _, resp = register(client, password="abcdefgh")  # tanpa angka
    assert resp.status_code == 422


def test_login_sets_httponly_cookies_not_in_body(client):
    email, password, _ = register(client)
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" not in body
    assert body["email"] == email

    assert "access_token" in resp.cookies
    assert "refresh_token" in resp.cookies
    set_cookie_headers = resp.headers.get_list("set-cookie")
    assert any("HttpOnly" in h for h in set_cookie_headers)


def test_login_wrong_password_rejected(client):
    email, _, _ = register(client)
    resp = client.post("/api/auth/login", json={"email": email, "password": "salahbanget"})
    assert resp.status_code == 401


def test_login_nonexistent_email_rejected(client):
    resp = client.post("/api/auth/login", json={"email": rand_email(), "password": "apapun123"})
    assert resp.status_code == 401


def test_me_requires_valid_session(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401

    email, password, _ = register(client)
    client.post("/api/auth/login", json={"email": email, "password": password})
    resp = client.get("/api/auth/me")
    assert resp.status_code == 200
    assert resp.json()["email"] == email


def test_refresh_rotates_token_and_old_one_stops_working(client):
    email, password, _ = register(client)
    client.post("/api/auth/login", json={"email": email, "password": password})
    old_refresh_token = client.cookies.get("refresh_token")

    resp = client.post("/api/auth/refresh")
    assert resp.status_code == 200
    new_refresh_token = client.cookies.get("refresh_token")
    assert new_refresh_token != old_refresh_token

    # token lama coba dipakai lagi -> harus ditolak (rotasi + deteksi reuse)
    client.cookies.set("refresh_token", old_refresh_token)
    resp = client.post("/api/auth/refresh")
    assert resp.status_code == 401


def test_logout_revokes_refresh_token_in_database(client):
    email, password, _ = register(client)
    client.post("/api/auth/login", json={"email": email, "password": password})
    refresh_token = client.cookies.get("refresh_token")

    resp = client.post("/api/auth/logout")
    assert resp.status_code == 204

    # bukti logout beneran revoke di server, bukan cuma hapus cookie di klien:
    # pakai NILAI token yang sama secara eksplisit, harus tetap ditolak.
    client.cookies.set("refresh_token", refresh_token)
    resp = client.post("/api/auth/refresh")
    assert resp.status_code == 401


def test_protected_endpoint_requires_auth(client):
    resp = client.get("/api/customers")
    assert resp.status_code == 401


def test_nfr4_data_isolation_between_accounts(client):
    """Akun B tidak boleh bisa lihat/akses data milik akun A sama sekali."""
    email_a, password_a, _ = register(client)
    client.post("/api/auth/login", json={"email": email_a, "password": password_a})

    customer_payload = {
        "tenure": 5, "warehouse_to_home": 10, "hour_spend_on_app": 3,
        "number_of_device_registered": 3, "satisfaction_score": 3, "number_of_address": 2,
        "complain": 0, "order_amount_hike": 12, "coupon_used": 1, "order_count": 3,
        "day_since_last_order": 10, "cashback_amount": 50,
        "preferred_login_device": "Mobile Phone", "preferred_payment_mode": "E wallet",
        "gender": "Female", "prefered_order_cat": "Fashion", "marital_status": "Single", "city_tier": 1,
        "name": "Milik A",
    }
    resp = client.post("/api/customers", json=customer_payload)
    assert resp.status_code == 201
    customer_id = resp.json()["id"]

    client.post("/api/auth/logout")
    email_b, password_b, _ = register(client)
    client.post("/api/auth/login", json={"email": email_b, "password": password_b})

    resp = client.get(f"/api/customers/{customer_id}")
    assert resp.status_code == 404  # bukan 403 -- disengaja, lihat routers/customers.py

    resp = client.get("/api/customers")
    assert resp.status_code == 200
    assert resp.json()["total"] == 0
