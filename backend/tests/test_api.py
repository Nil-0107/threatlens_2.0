import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_api_root(client):
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["service"] == "ThreatLens Forensic Intelligence Platform"

def test_upload_phishing_email(client):
    with open("samples/sample_phishing_spoofed.eml", "rb") as f:
        res = client.post(
            "/api/emails/upload",
            files={"file": ("sample_phishing_spoofed.eml", f, "message/rfc822")},
        )
    assert res.status_code == 200
    data = res.json()
    assert data["risk_score"] >= 60
    assert data["risk_level"] in ("High", "Critical")
    assert len(data["reasons"]) > 0
    assert len(data["hops"]) > 0
    assert data["origin_ip"] == "185.220.101.5"
    assert data["suggested_case_id"] is not None  # Auto-matched seeded Russian relay case!

    email_id = data["id"]

    # Test GET email details
    detail_res = client.get(f"/api/emails/{email_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == email_id

    # Test GET trace
    trace_res = client.get(f"/api/emails/{email_id}/trace")
    assert trace_res.status_code == 200
    assert len(trace_res.json()) >= 1

    # Test verify-chain
    verify_res = client.get(f"/api/emails/{email_id}/verify-chain")
    assert verify_res.status_code == 200
    assert verify_res.json()["is_valid"] is True

    # Test PDF export
    export_res = client.get(f"/api/emails/{email_id}/export")
    assert export_res.status_code == 200
    assert export_res.headers["content-type"] == "application/pdf"
    assert len(export_res.content) > 1000

def test_upload_legit_email(client):
    with open("samples/sample_legit.eml", "rb") as f:
        res = client.post(
            "/api/emails/upload",
            files={"file": ("sample_legit.eml", f, "message/rfc822")},
        )
    assert res.status_code == 200
    data = res.json()
    assert data["risk_level"] == "Low"
    assert data["risk_score"] < 30

