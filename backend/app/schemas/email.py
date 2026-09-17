from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class RiskReasonSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    reason: str
    weight: float
    category: str

class GeoHopSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    hop_order: int
    ip: str
    country: str
    country_code: Optional[str] = None
    city: str
    isp: str
    org: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    is_internal: bool
    is_likely_origin: bool
    reverse_dns: Optional[str] = None

class EmailSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    raw_hash: str
    sender: str
    sender_domain: str
    display_name: Optional[str] = None
    subject: Optional[str] = None
    received_at: Optional[datetime] = None
    risk_score: int
    risk_level: str
    origin_ip: Optional[str] = None
    case_id: Optional[str] = None
    is_purged: bool = False
    created_at: datetime

class EmailDetailResponse(EmailSummaryResponse):
    model_config = ConfigDict(from_attributes=True)

    reply_to: Optional[str] = None
    return_path: Optional[str] = None
    raw_content: Optional[str] = None
    body_text: Optional[str] = None
    auth_results: Optional[str] = None
    reasons: List[RiskReasonSchema] = []
    hops: List[GeoHopSchema] = []
    suggested_case_id: Optional[str] = None

