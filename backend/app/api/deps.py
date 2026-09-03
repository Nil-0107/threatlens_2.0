from typing import Generator, Optional
import jwt
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from backend.app.database import SessionLocal
from backend.app.config import settings
from backend.app.models.user import User

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> dict:
    """
    Extracts authenticated user info from Bearer JWT token.
    If header is present and valid, returns user details from token/db.
    Defaults to anonymous analyst if header is omitted (allows demo flexibility).
    """
    if not authorization or not authorization.startswith("Bearer "):
        return {"username": "analyst@threatlens.io", "email": "analyst@threatlens.io", "role": "analyst", "full_name": "Demo Analyst"}

    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email = payload.get("sub")
        role = payload.get("role", "analyst")
        full_name = payload.get("name", email)
        
        # Verify in DB
        db_user = db.query(User).filter(User.email == email).first()
        if db_user:
            return {
                "id": db_user.id,
                "username": db_user.email,
                "email": db_user.email,
                "role": db_user.role,
                "full_name": db_user.full_name or db_user.email,
            }
        return {"username": email, "email": email, "role": role, "full_name": full_name}
    except Exception:
        return {"username": "analyst@threatlens.io", "email": "analyst@threatlens.io", "role": "analyst", "full_name": "Demo Analyst"}
