"""Test endpoint admin -- promosi ke admin dilakukan langsung lewat DB (sengaja
tidak ada endpoint API untuk itu, lihat routers/admin.py), jadi test di sini
pakai SessionLocal langsung untuk simulasikan itu."""

import models
from database import SessionLocal
from tests.test_auth import register


def make_admin(email: str) -> None:
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        user.is_admin = True
        db.commit()
    finally:
        db.close()


def register_and_login_admin(client):
    email, password, _ = register(client)
    make_admin(email)
    client.post("/api/auth/login", json={"email": email, "password": password})
    return email, password


def test_admin_endpoints_require_auth(client):
    resp = client.get("/api/admin/users")
    assert resp.status_code == 401
    resp = client.get("/api/admin/stats")
    assert resp.status_code == 401


def test_non_admin_user_gets_404_not_403(client):
    """404, bukan 403 -- lihat komentar require_admin di routers/admin.py."""
    email, password, _ = register(client)
    client.post("/api/auth/login", json={"email": email, "password": password})

    resp = client.get("/api/admin/users")
    assert resp.status_code == 404


def test_admin_can_list_users(client):
    register(client)  # user biasa, harus ikut muncul di daftar
    register_and_login_admin(client)

    resp = client.get("/api/admin/users")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] >= 2
    assert len(body["items"]) >= 2


def test_admin_stats_counts_users(client):
    register(client)
    register_and_login_admin(client)

    resp = client.get("/api/admin/stats")
    assert resp.status_code == 200
    assert resp.json()["total_users"] >= 2


def test_admin_can_reset_another_users_password(client):
    target_email, _, _ = register(client)
    client.post("/api/auth/logout")
    register_and_login_admin(client)

    db = SessionLocal()
    try:
        target = db.query(models.User).filter(models.User.email == target_email).first()
        target_id = target.id
    finally:
        db.close()

    resp = client.post(f"/api/admin/users/{target_id}/reset-password", json={"new_password": "NewPassw0rd9"})
    assert resp.status_code == 200

    client.post("/api/auth/logout")
    resp = client.post("/api/auth/login", json={"email": target_email, "password": "NewPassw0rd9"})
    assert resp.status_code == 200


def test_admin_cannot_delete_own_account_via_admin_endpoint(client):
    admin_email, _ = register_and_login_admin(client)
    db = SessionLocal()
    try:
        admin_id = db.query(models.User).filter(models.User.email == admin_email).first().id
    finally:
        db.close()

    resp = client.delete(f"/api/admin/users/{admin_id}")
    assert resp.status_code == 400


def test_admin_can_delete_other_user(client):
    target_email, _, _ = register(client)
    client.post("/api/auth/logout")
    register_and_login_admin(client)

    db = SessionLocal()
    try:
        target_id = db.query(models.User).filter(models.User.email == target_email).first().id
    finally:
        db.close()

    resp = client.delete(f"/api/admin/users/{target_id}")
    assert resp.status_code == 204

    resp = client.get("/api/admin/users")
    remaining_emails = [u["email"] for u in resp.json()["items"]]
    assert target_email not in remaining_emails


def test_admin_reset_password_for_nonexistent_user_404(client):
    register_and_login_admin(client)
    resp = client.post("/api/admin/users/999999/reset-password", json={"new_password": "NewPassw0rd9"})
    assert resp.status_code == 404
