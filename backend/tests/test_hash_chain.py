import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.database import Base
from backend.app.models.forensic import ForensicLog
from backend.app.services.evidence_vault import evidence_vault

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    yield db
    db.close()

def test_hash_chain_creation_and_audit(test_db):
    # 1. Add Entry 1 (Genesis)
    log1 = evidence_vault.append_log_entry(
        db=test_db,
        action="INGEST",
        data_hash="a" * 64,
        email_id="email-1",
        actor="analyst",
    )
    assert log1.prev_hash == "0" * 64
    assert len(log1.entry_hash) == 64

    # 2. Add Entry 2
    log2 = evidence_vault.append_log_entry(
        db=test_db,
        action="VIEW",
        data_hash="a" * 64,
        email_id="email-1",
        actor="analyst",
    )
    assert log2.prev_hash == log1.entry_hash

    # 3. Add Entry 3
    log3 = evidence_vault.append_log_entry(
        db=test_db,
        action="EXPORT",
        data_hash="a" * 64,
        email_id="email-1",
        actor="analyst",
    )
    assert log3.prev_hash == log2.entry_hash

    # 4. Verify clean chain
    audit = evidence_vault.verify_chain(test_db)
    assert audit["is_valid"] is True
    assert audit["chain_length"] == 3
    assert audit["broken_entry_id"] is None

    # 5. Simulate Tampering on Entry 2
    log2.actor = "malicious_hacker"
    test_db.commit()

    # 6. Verify audit immediately detects tampering
    tampered_audit = evidence_vault.verify_chain(test_db)
    assert tampered_audit["is_valid"] is False
    assert tampered_audit["broken_entry_id"] == log2.id
    assert tampered_audit["broken_index"] == 1
    assert "Cryptographic integrity violation" in tampered_audit["message"]

