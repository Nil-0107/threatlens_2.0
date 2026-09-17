import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base

class ForensicLog(Base):
    """
    Evidence Vault: Tamper-Evident Hash-Chained Forensic Ledger.
    Each entry computes entry_hash = SHA256(id|email_id|action|actor|timestamp|data_hash|prev_hash).
    """
    __tablename__ = "forensic_log"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email_id = Column(String(36), ForeignKey("emails.id"), nullable=True, index=True)
    action = Column(String(50), nullable=False)               # INGEST, SCAN, VIEW, EXPORT, CASE_LINK, PURGE
    actor = Column(String(100), default="analyst")            # User or system identifier
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    data_hash = Column(String(64), nullable=False)            # SHA-256 of context payload (e.g. email raw_hash)
    prev_hash = Column(String(64), nullable=False)            # Previous entry's entry_hash (genesis = "0"*64)
    entry_hash = Column(String(64), nullable=False, index=True) # Cryptographic digest of this entry

    email = relationship("Email", back_populates="logs")

