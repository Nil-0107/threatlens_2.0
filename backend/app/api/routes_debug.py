from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db
from backend.app.models.forensic import ForensicLog
from backend.app.schemas.forensic import TamperLogRequest

router = APIRouter(prefix="/debug", tags=["Debug & Demo Tools"])

@router.post("/tamper-log")
def simulate_log_tampering(payload: TamperLogRequest, db: Session = Depends(get_db)):
    """
    Demonstration Endpoint for Hackathon Judges:
    Deliberately alters a historical log entry's actor and data without updating the hash.
    Immediately afterwards, calling /verify-chain will fail and pinpoint this exact record!
    """
    entry = db.query(ForensicLog).filter(ForensicLog.id == payload.log_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Forensic log entry not found.")

    original_actor = entry.actor
    entry.actor = payload.tampered_actor or "rogue_intruder"
    entry.action = payload.tampered_action or "ALTERED_SCAN"
    db.commit()

    return {
        "status": "tampered",
        "log_id": entry.id,
        "original_actor": original_actor,
        "new_actor": entry.actor,
        "message": "Log entry was deliberately altered in the database. Run verify-chain to see cryptographic detection in action.",
    }

