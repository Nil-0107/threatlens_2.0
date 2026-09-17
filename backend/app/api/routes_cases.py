from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db, get_current_user
from backend.app.models.case import Case
from backend.app.models.email import Email
from backend.app.schemas.case import CaseCreate, CaseSummary, CaseDetail, LinkEmailRequest
from backend.app.services.evidence_vault import evidence_vault

router = APIRouter(prefix="/cases", tags=["Cases"])

@router.get("", response_model=List[CaseSummary])
def list_cases(db: Session = Depends(get_db)):
    """Lists all investigative cases with email counts and risk metrics."""
    cases = db.query(Case).order_by(Case.created_at.desc()).all()
    results = []
    for c in cases:
        emails = db.query(Email).filter(Email.case_id == c.id).all()
        highest = max([e.risk_score for e in emails]) if emails else 0
        summary = CaseSummary(
            id=c.id,
            title=c.title,
            shared_indicator=c.shared_indicator,
            indicator_type=c.indicator_type,
            status=c.status,
            notes=c.notes,
            created_at=c.created_at,
            updated_at=c.updated_at,
            email_count=len(emails),
            highest_risk_score=highest,
        )
        results.append(summary)
    return results

@router.get("/{id}", response_model=CaseDetail)
def get_case(id: str, db: Session = Depends(get_db)):
    """Retrieves case details along with all linked incident emails."""
    c = db.query(Case).filter(Case.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found.")

    emails = db.query(Email).filter(Email.case_id == c.id).all()
    highest = max([e.risk_score for e in emails]) if emails else 0

    return CaseDetail(
        id=c.id,
        title=c.title,
        shared_indicator=c.shared_indicator,
        indicator_type=c.indicator_type,
        status=c.status,
        notes=c.notes,
        created_at=c.created_at,
        updated_at=c.updated_at,
        email_count=len(emails),
        highest_risk_score=highest,
        emails=emails,
    )

@router.post("", response_model=CaseSummary)
def create_case(payload: CaseCreate, db: Session = Depends(get_db)):
    """Creates a new incident case grouping shared indicators."""
    import uuid
    new_case = Case(
        id=str(uuid.uuid4()),
        title=payload.title,
        shared_indicator=payload.shared_indicator,
        indicator_type=payload.indicator_type,
        status="OPEN",
        notes=payload.notes,
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    return CaseSummary(
        id=new_case.id,
        title=new_case.title,
        shared_indicator=new_case.shared_indicator,
        indicator_type=new_case.indicator_type,
        status=new_case.status,
        notes=new_case.notes,
        created_at=new_case.created_at,
        updated_at=new_case.updated_at,
        email_count=0,
        highest_risk_score=0,
    )

@router.post("/{id}/link")
def link_email(
    id: str,
    payload: LinkEmailRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Links an email to this case and logs the CASE_LINK action in the Evidence Vault."""
    c = db.query(Case).filter(Case.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found.")

    em = db.query(Email).filter(Email.id == payload.email_id).first()
    if not em:
        raise HTTPException(status_code=404, detail="Email not found.")

    em.case_id = c.id
    db.commit()

    # Preserved in Evidence Vault
    evidence_vault.append_log_entry(
        db=db,
        action="CASE_LINK",
        data_hash=em.raw_hash,
        email_id=em.id,
        actor=user.get("username", "analyst"),
    )

    return {"status": "success", "case_id": c.id, "email_id": em.id}

