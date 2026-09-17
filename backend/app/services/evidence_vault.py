import hashlib
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.app.models.forensic import ForensicLog

logger = logging.getLogger("ThreatLens.EvidenceVault")

GENESIS_PREV_HASH = "0" * 64

class EvidenceVault:
    @staticmethod
    def calculate_entry_hash(
        log_id: str,
        email_id: Optional[str],
        action: str,
        actor: str,
        timestamp_iso: str,
        data_hash: str,
        prev_hash: str,
    ) -> str:
        """
        Computes deterministic SHA-256 hash of canonical forensic record string:
        id|email_id|action|actor|timestamp_iso|data_hash|prev_hash
        """
        canonical_str = f"{log_id}|{email_id or ''}|{action}|{actor}|{timestamp_iso}|{data_hash}|{prev_hash}"
        return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()

    @classmethod
    def append_log_entry(
        cls,
        db: Session,
        action: str,
        data_hash: str,
        email_id: Optional[str] = None,
        actor: str = "analyst",
    ) -> ForensicLog:
        """
        Appends an immutable entry to the cryptographic hash chain.
        Retrieves the latest entry_hash in the ledger to serve as prev_hash.
        """
        import uuid

        # 1. Fetch latest entry hash
        latest_entry = (
            db.query(ForensicLog)
            .order_by(ForensicLog.timestamp.desc(), ForensicLog.id.desc())
            .first()
        )

        prev_hash = latest_entry.entry_hash if latest_entry else GENESIS_PREV_HASH

        # 2. Prepare new log entry
        new_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        timestamp_iso = now.isoformat()

        entry_hash = cls.calculate_entry_hash(
            log_id=new_id,
            email_id=email_id,
            action=action,
            actor=actor,
            timestamp_iso=timestamp_iso,
            data_hash=data_hash,
            prev_hash=prev_hash,
        )

        log_record = ForensicLog(
            id=new_id,
            email_id=email_id,
            action=action,
            actor=actor,
            timestamp=now,
            data_hash=data_hash,
            prev_hash=prev_hash,
            entry_hash=entry_hash,
        )

        db.add(log_record)
        db.commit()
        db.refresh(log_record)
        return log_record

    @classmethod
    def verify_chain(cls, db: Session, email_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Cryptographically audits the hash chain from genesis to tip.
        Verifies:
        1. Predecessor linkage: entry[i].prev_hash == entry[i-1].entry_hash
        2. Content integrity: recomputed hash == entry[i].entry_hash
        """
        query = db.query(ForensicLog)
        if email_id:
            # Audit entries related to this email or global chain up to this email
            query = query.filter(ForensicLog.email_id == email_id)
        
        entries: List[ForensicLog] = query.order_by(ForensicLog.timestamp.asc(), ForensicLog.id.asc()).all()

        if not entries:
            return {
                "is_valid": True,
                "chain_length": 0,
                "broken_entry_id": None,
                "broken_index": None,
                "message": "Chain is empty. No log entries recorded yet.",
                "entries": [],
            }

        # Check all entries in order
        for idx, entry in enumerate(entries):
            # Check recomputed hash
            # Note: handle both timezone-aware and naive timestamps consistently
            ts_iso = entry.timestamp.isoformat() if entry.timestamp.tzinfo else entry.timestamp.replace(tzinfo=timezone.utc).isoformat()
            
            recomputed = cls.calculate_entry_hash(
                log_id=entry.id,
                email_id=entry.email_id,
                action=entry.action,
                actor=entry.actor,
                timestamp_iso=ts_iso,
                data_hash=entry.data_hash,
                prev_hash=entry.prev_hash,
            )

            if recomputed != entry.entry_hash:
                logger.warning(f"Forensic verification failed at index {idx} (ID: {entry.id}): Hash mismatch.")
                return {
                    "is_valid": False,
                    "chain_length": len(entries),
                    "broken_entry_id": entry.id,
                    "broken_index": idx,
                    "message": f"Cryptographic integrity violation detected at log entry #{idx + 1} (ID: {entry.id}). Content was altered after recording.",
                    "entries": entries,
                }

            # If not genesis, verify prev_hash links to predecessor entry
            if idx > 0 and not email_id:
                prev_entry = entries[idx - 1]
                if entry.prev_hash != prev_entry.entry_hash:
                    logger.warning(f"Forensic link broken between index {idx-1} and {idx}.")
                    return {
                        "is_valid": False,
                        "chain_length": len(entries),
                        "broken_entry_id": entry.id,
                        "broken_index": idx,
                        "message": f"Hash chain continuity broken at index #{idx + 1}. Previous hash pointer does not match preceding entry digest.",
                        "entries": entries,
                    }

        return {
            "is_valid": True,
            "chain_length": len(entries),
            "broken_entry_id": None,
            "broken_index": None,
            "message": f"Cryptographic audit passed. All {len(entries)} ledger entries are tamper-free and verified.",
            "entries": entries,
        }

evidence_vault = EvidenceVault()

