import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any
from sqlalchemy.orm import Session
from backend.app.models.email import Email
from backend.app.services.evidence_vault import evidence_vault

logger = logging.getLogger("ThreatLens.Retention")

class RetentionService:
    @staticmethod
    def execute_retention_purge(db: Session, retention_days: int) -> Dict[str, Any]:
        """
        Purges raw email content and bodies for records older than retention_days,
        while strictly preserving hashes, metadata, risk scores, and the forensic chain.
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_days)
        
        expired_emails = (
            db.query(Email)
            .filter(Email.created_at < cutoff_date, Email.is_purged == False)
            .all()
        )

        purged_count = 0
        for em in expired_emails:
            em.raw_content = None
            em.body_text = None
            em.is_purged = True
            purged_count += 1

            # Log PURGE action in Evidence Vault to preserve cryptographic chain
            evidence_vault.append_log_entry(
                db=db,
                action="PURGE",
                data_hash=em.raw_hash,
                email_id=em.id,
                actor="retention_daemon",
            )

        db.commit()
        logger.info(f"Retention policy executed: Purged raw payloads for {purged_count} records older than {retention_days} days.")
        return {
            "purged_count": purged_count,
            "cutoff_date": cutoff_date.isoformat(),
            "retention_days": retention_days,
        }

retention_service = RetentionService()

