"""
Authentication Endpoints — SEC-10 (account lockout), SEC-03 (rate limiting)
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_db, get_current_user
from app.core.config import settings
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserResponse,
    LoginRequest,
    Token,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Redis-backed login-attempt tracking (SEC-10)
# ---------------------------------------------------------------------------

async def _get_redis():
    import redis.asyncio as aioredis
    return aioredis.from_url(settings.REDIS_URL, decode_responses=True)


async def _check_lockout(email: str) -> None:
    """Raise 429 if the account is locked out.  Degrades gracefully when Redis is unavailable."""
    try:
        r = await _get_redis()
    except Exception:
        logger.warning("Redis unavailable — skipping lockout check")
        return
    try:
        attempts = await r.get(f"login_attempts:{email}")
        if attempts and int(attempts) >= settings.MAX_LOGIN_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Account temporarily locked. Try again in {settings.LOCKOUT_DURATION_MINUTES} minutes.",
            )
    except HTTPException:
        raise
    except Exception:
        logger.warning("Redis unavailable — skipping lockout check")
    finally:
        try:
            await r.aclose()
        except Exception:
            pass


async def _record_failed_attempt(email: str) -> None:
    """Increment failed-attempt counter with TTL.  Degrades gracefully when Redis is unavailable."""
    try:
        r = await _get_redis()
    except Exception:
        logger.warning("Redis unavailable — skipping failed attempt recording")
        return
    try:
        key = f"login_attempts:{email}"
        await r.incr(key)
        await r.expire(key, settings.LOCKOUT_DURATION_MINUTES * 60)
    except Exception:
        logger.warning("Redis unavailable — skipping failed attempt recording")
    finally:
        try:
            await r.aclose()
        except Exception:
            pass


async def _clear_attempts(email: str) -> None:
    """Clear failed-attempt counter on successful login.  Degrades gracefully when Redis is unavailable."""
    try:
        r = await _get_redis()
    except Exception:
        logger.warning("Redis unavailable — skipping attempt clearing")
        return
    try:
        await r.delete(f"login_attempts:{email}")
    except Exception:
        logger.warning("Redis unavailable — skipping attempt clearing")
    finally:
        try:
            await r.aclose()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/register", response_model=UserResponse)
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user"""
    # Check if email exists
    result = await db.execute(
        select(User).where(User.email == user_in.email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Check if username exists
    result = await db.execute(
        select(User).where(User.username == user_in.username)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )

    # Create user
    user = User(
        email=user_in.email,
        username=user_in.username,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user


@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Login and get access token — with account lockout (SEC-10)."""
    # Check lockout before any password verification
    await _check_lockout(login_data.email)

    # Find user by email
    result = await db.execute(
        select(User).where(User.email == login_data.email)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(login_data.password, user.hashed_password):
        await _record_failed_attempt(login_data.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    # Clear attempt counter on success
    await _clear_attempts(login_data.email)

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    await db.commit()

    # Create tokens
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token"""
    token_data = decode_token(refresh_token)

    if not token_data or token_data.token_type != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    # Verify user exists and is active
    result = await db.execute(
        select(User).where(User.id == token_data.user_id)
    )
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    # Create new tokens
    new_access_token = create_access_token(subject=user.id)
    new_refresh_token = create_refresh_token(subject=user.id)

    return Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    return current_user


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user)
):
    """Logout (client should discard tokens)"""
    # In a more sophisticated system, we'd invalidate the token server-side
    return {"message": "Successfully logged out"}
