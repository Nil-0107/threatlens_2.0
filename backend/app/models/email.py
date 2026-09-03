import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Email(Base):
    __tablename__ = "emails"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    raw_hash = Column(String(64), nullable=False, index=True)  # SHA-256 of raw RFC 822 content
    sender = Column(String(255), nullable=False, index=True)
    sender_domain = Column(String(255), nullable=False, index=True)
    display_name = Column(String(255), nullable=True)
    reply_to = Column(String(255), nullable=True)
    return_path = Column(String(255), nullable=True)
    subject = Column(String(500), nullable=True)
    received_at = Column(DateTime, nullable=True)
    risk_score = Column(Integer, default=0)                    # 0 - 100
    risk_level = Column(String(20), default="Low")            # Low, Medium, High, Critical
    origin_ip = Column(String(50), nullable=True, index=True)
    
    # Relationships
    case_id = Column(String(36), ForeignKey("cases.id"), nullable=True, index=True)
    case = relationship("Case", back_populates="emails")

    # Storage and Retention
    raw_content = Column(Text, nullable=True)
    body_text = Column(Text, nullable=True)
    is_purged = Column(Boolean, default=False)
    auth_results = Column(Text, nullable=True)                # JSON serialized SPF/DKIM/DMARC summary
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    reasons = relationship("RiskReason", back_populates="email", cascade="all, delete-orphan")
    hops = relationship("GeoHop", back_populates="email", cascade="all, delete-orphan", order_by="GeoHop.hop_order")
    logs = relationship("ForensicLog", back_populates="email", cascade="all, delete-orphan")


class RiskReason(Base):
    __tablename__ = "risk_reasons"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email_id = Column(String(36), ForeignKey("emails.id"), nullable=False, index=True)
    reason = Column(String(500), nullable=False)
    weight = Column(Float, default=0.0)
    category = Column(String(50), default="GENERAL")          # HEADER_AUTH, DOMAIN_SPOOF, URL_THREAT, ML_CONTENT

    email = relationship("Email", back_populates="reasons")


class GeoHop(Base):
    __tablename__ = "geo_hops"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email_id = Column(String(36), ForeignKey("emails.id"), nullable=False, index=True)
    hop_order = Column(Integer, nullable=False)               # 0 = earliest / likely origin, ascending
    ip = Column(String(64), nullable=False)
    country = Column(String(100), default="Unknown")
    country_code = Column(String(10), nullable=True)
    city = Column(String(100), default="Unknown")
    isp = Column(String(255), default="Unknown")
    org = Column(String(255), nullable=True)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    is_internal = Column(Boolean, default=False)
    is_likely_origin = Column(Boolean, default=False)
    reverse_dns = Column(String(255), nullable=True)

    email = relationship("Email", back_populates="hops")

