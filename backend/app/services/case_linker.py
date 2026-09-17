import logging
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from backend.app.models.case import Case
from backend.app.models.email import Email

logger = logging.getLogger("ThreatLens.CaseLinker")

class CaseLinker:
    @staticmethod
    def find_matching_case(
        db: Session, sender_domain: str, origin_ip: Optional[str]
    ) -> Optional[Case]:
        """
        Searches for an active case sharing the sender domain or originating IP.
        """
        # 1. Match by sender domain
        if sender_domain and sender_domain not in ("gmail.com", "outlook.com", "yahoo.com", "hotmail.com"):
            match = (
                db.query(Case)
                .filter(Case.shared_indicator == sender_domain, Case.indicator_type == "DOMAIN")
                .first()
            )
            if match:
                return match

        # 2. Match by originating external IP
        if origin_ip and not origin_ip.startswith("127.") and not origin_ip.startswith("192.168."):
            match = (
                db.query(Case)
                .filter(Case.shared_indicator == origin_ip, Case.indicator_type == "IP")
                .first()
            )
            if match:
                return match

        return None

    @staticmethod
    def link_email_to_case(db: Session, email_id: str, case_id: str) -> bool:
        email = db.query(Email).filter(Email.id == email_id).first()
        case = db.query(Case).filter(Case.id == case_id).first()
        if not email or not case:
            return False

        email.case_id = case_id
        db.commit()
        return True

    @staticmethod
    def get_case_profile(db: Session, case_id: str) -> Optional[Dict[str, Any]]:
        case = db.query(Case).filter(Case.id == case_id).first()
        if not case:
            return None

        emails = db.query(Email).filter(Email.case_id == case_id).all()
        highest_score = max([e.risk_score for e in emails]) if emails else 0

        return {
            "case": case,
            "emails": emails,
            "email_count": len(emails),
            "highest_risk_score": highest_score,
        }

case_linker = CaseLinker()

