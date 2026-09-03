import uuid
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_signup_and_login_flow(client):
    unique_email = f"officer_{uuid.uuid4().hex[:8]}@cybercell.gov.in"
    # 1. Sign up new analyst
    signup_payload = {
        "email": unique_email,
        "password": "SecurePassword999",
        "full_name": "Inspector Vikram Singh",
        "role": "analyst",
    }
    res = client.post("/api/auth/signup", json=signup_payload)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "analyst"
    assert data["email"] == unique_email
    assert data["full_name"] == "Inspector Vikram Singh"

    # 2. Duplicate signup should return 409
    res_dup = client.post("/api/auth/signup", json=signup_payload)
    assert res_dup.status_code == 409

    # 3. Login with correct credentials
    login_payload = {
        "email": unique_email,
        "password": "SecurePassword999",
    }
    res_login = client.post("/api/auth/login", json=login_payload)
    assert res_login.status_code == 200
    login_data = res_login.json()
    assert "access_token" in login_data
    token = login_data["access_token"]

    # 4. Login with invalid password should fail
    bad_login = {
        "email": unique_email,
        "password": "WrongPassword",
    }
    res_bad = client.post("/api/auth/login", json=bad_login)
    assert res_bad.status_code == 401

    # 5. Access /me endpoint with token
    res_me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_me.status_code == 200
    assert res_me.json()["email"] == unique_email

def test_seeded_user_login(client):
    # Test seeded analyst
    res = client.post("/api/auth/login", json={
        "email": "analyst@threatlens.io",
        "password": "threatlens2026",
    })
    assert res.status_code == 200
    assert res.json()["role"] == "analyst"

