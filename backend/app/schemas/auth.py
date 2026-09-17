from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime

class SignUpRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    role: Optional[str] = "analyst"  # "analyst" or "admin"

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    access_token: str
    token_type: str = "bearer"
    role: str
    email: str
    full_name: Optional[str] = None

class UserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: Optional[str] = None
    role: str
    created_at: datetime
