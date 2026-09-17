from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class ForensicLogItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email_id: Optional[str] = None
    action: str
    actor: str
    timestamp: datetime
    data_hash: str
    prev_hash: str
    entry_hash: str

class VerifyChainResponse(BaseModel):
    is_valid: bool
    chain_length: int
    broken_entry_id: Optional[str] = None
    broken_index: Optional[int] = None
    message: str
    entries: List[ForensicLogItem] = []

class TamperLogRequest(BaseModel):
    log_id: str
    tampered_actor: Optional[str] = "unauthorized_intruder"
    tampered_action: Optional[str] = "ALTERED_SCAN"

