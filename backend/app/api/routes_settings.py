from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db
from backend.app.models.settings import SystemSetting
from backend.app.services.retention_service import retention_service
from backend.app.config import settings

router = APIRouter(prefix="/settings", tags=["Settings"])

class RetentionUpdateRequest(BaseModel):
    retention_days: int

@router.get("")
def get_settings(db: Session = Depends(get_db)):
    setting_obj = db.query(SystemSetting).filter(SystemSetting.key == "retention_days").first()
    days = int(setting_obj.value) if setting_obj else settings.DEFAULT_RETENTION_DAYS
    return {
        "retention_days": days,
        "default_retention_days": settings.DEFAULT_RETENTION_DAYS,
        "pii_masking_enabled": settings.ENABLE_PII_MASKING_BY_DEFAULT,
    }

@router.post("/retention")
def update_retention(payload: RetentionUpdateRequest, db: Session = Depends(get_db)):
    setting_obj = db.query(SystemSetting).filter(SystemSetting.key == "retention_days").first()
    if not setting_obj:
        setting_obj = SystemSetting(key="retention_days", value=str(payload.retention_days))
        db.add(setting_obj)
    else:
        setting_obj.value = str(payload.retention_days)
    db.commit()

    # Trigger retention check
    purge_result = retention_service.execute_retention_purge(db=db, retention_days=payload.retention_days)

    return {
        "status": "updated",
        "retention_days": payload.retention_days,
        "purge_result": purge_result,
    }

