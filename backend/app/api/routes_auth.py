import uuid
from datetime import datetime, timezone, timedelta
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.api.deps import get_db, get_current_user
from backend.app.models.user import User, hash_password, verify_password
from backend.app.schemas.auth import SignUpRequest, LoginRequest, TokenResponse, UserProfileResponse
from backend.app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

def create_access_token(user: User) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user.email,
        "name": user.full_name or user.email,
        "role": user.role,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


@router.post("/signup", response_model=TokenResponse)
def signup(payload: SignUpRequest, db: Session = Depends(get_db)):
    """
    Registers a new Cyber Cell Analyst or Enterprise Admin with email and password.
    """
    clean_email = payload.email.strip().lower()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")

    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Please sign in.",
        )

    # Hash password with secure salt
    hashed_pwd, salt = hash_password(payload.password)

    user_role = payload.role if payload.role in ("analyst", "admin") else "analyst"
    new_user = User(
        id=str(uuid.uuid4()),
        email=clean_email,
        hashed_password=hashed_pwd,
        salt=salt,
        full_name=payload.full_name or clean_email.split("@")[0],
        role=user_role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(new_user)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=new_user.role,
        email=new_user.email,
        full_name=new_user.full_name,
    )


@router.post("/login", response_model=TokenResponse)
def login(creds: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates an existing user using email and password.
    """
    clean_email = creds.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()

    # Fallback support for original shorthand usernames if entered (analyst or admin)
    if not user:
        if clean_email == "analyst":
            user = db.query(User).filter(User.email == "analyst@threatlens.io").first()
        elif clean_email == "admin":
            user = db.query(User).filter(User.email == "admin@threatlens.io").first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. If you don't have an account, please sign up.",
        )

    if not verify_password(creds.password, user.hashed_password, user.salt):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token(user)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role,
        email=user.email,
        full_name=user.full_name,
    )


@router.get("/me", response_model=UserProfileResponse)
def get_me(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Returns currently authenticated user profile.
    """
    email = user.get("email")
    db_user = db.query(User).filter(User.email == email).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user
