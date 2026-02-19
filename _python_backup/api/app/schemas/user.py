"""
User Schemas
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a user"""
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    """Schema for updating a user"""
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    full_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8)
    avatar_url: Optional[str] = None
    default_ai_provider: Optional[str] = None
    default_ai_model: Optional[str] = None


class UserResponse(UserBase):
    """Schema for user response"""
    id: str
    avatar_url: Optional[str] = None
    is_active: bool
    is_superuser: bool
    is_verified: bool
    default_ai_provider: Optional[str] = None
    default_ai_model: Optional[str] = None
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserInDB(UserResponse):
    """Schema for user in database (includes hashed password)"""
    hashed_password: str


class LoginRequest(BaseModel):
    """Schema for login request"""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Schema for token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """Schema for token payload"""
    sub: str
    exp: datetime
    type: str = "access"
