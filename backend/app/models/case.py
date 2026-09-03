import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Case(Base):
    __tablename__ = "cases"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    shared_indicator = Column(String(255), nullable=False, index=True)
    indicator_type = Column(String(50), nullable=False)  # "DOMAIN" or "IP"
    status = Column(String(50), default="OPEN")          # "OPEN", "INVESTIGATING", "RESOLVED"
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    emails = relationship("Email", back_populates="case")

