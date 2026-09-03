from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
from backend.app.schemas.email import EmailSummaryResponse

class CaseCreate(BaseModel):
    title: str
    shared_indicator: str
    indicator_type: str  # "DOMAIN" or "IP"
    notes: Optional[str] = None

class CaseSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    shared_indicator: str
    indicator_type: str
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    email_count: int = 0
    highest_risk_score: int = 0

class CaseDetail(CaseSummary):
    model_config = ConfigDict(from_attributes=True)

    emails: List[EmailSummaryResponse] = []

class LinkEmailRequest(BaseModel):
    email_id: str

