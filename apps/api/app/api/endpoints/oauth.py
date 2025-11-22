"""
OAuth Endpoints
"""

import secrets
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_db
from app.core.security import create_access_token, create_refresh_token, get_password_hash
from app.core.config import settings
from app.models.user import User
from app.services.oauth import oauth_service, OAuthUserInfo
from app.schemas.user import Token

router = APIRouter()

# Store OAuth states (in production, use Redis)
oauth_states: dict = {}


@router.get("/providers")
async def list_oauth_providers():
    """List available OAuth providers"""
    providers = oauth_service.get_available_providers()
    return {
        "providers": providers,
        "github": "github" in providers,
        "google": "google" in providers
    }


@router.get("/{provider}/authorize")
async def oauth_authorize(
    provider: str,
    redirect_uri: str = Query(..., description="Redirect URI after auth")
):
    """Get OAuth authorization URL"""
    try:
        oauth_provider = oauth_service.get_provider(provider)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown provider: {provider}"
        )

    if not oauth_provider.is_configured:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Provider {provider} is not configured"
        )

    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)
    oauth_states[state] = {"redirect_uri": redirect_uri, "provider": provider}

    auth_url = oauth_provider.get_authorization_url(
        redirect_uri=f"{settings.FRONTEND_URL}/api/auth/{provider}/callback",
        state=state
    )

    return {"authorization_url": auth_url, "state": state}


@router.get("/{provider}/callback")
async def oauth_callback(
    provider: str,
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Handle OAuth callback"""
    # Verify state
    state_data = oauth_states.pop(state, None)
    if not state_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired state"
        )

    try:
        # Authenticate with provider
        user_info = await oauth_service.authenticate(
            provider_name=provider,
            code=code,
            redirect_uri=f"{settings.FRONTEND_URL}/api/auth/{provider}/callback"
        )

        # Find or create user
        user = await get_or_create_oauth_user(db, user_info)

        # Generate tokens
        access_token = create_access_token(subject=user.id)
        refresh_token = create_refresh_token(subject=user.id)

        # Redirect back to frontend with tokens
        redirect_uri = state_data["redirect_uri"]
        return RedirectResponse(
            url=f"{redirect_uri}?access_token={access_token}&refresh_token={refresh_token}"
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


async def get_or_create_oauth_user(
    db: AsyncSession,
    user_info: OAuthUserInfo
) -> User:
    """Get existing user or create new one from OAuth info"""
    # First, try to find by OAuth ID
    result = await db.execute(
        select(User).where(
            User.oauth_provider == user_info.provider,
            User.oauth_id == user_info.oauth_id
        )
    )
    user = result.scalar_one_or_none()

    if user:
        # Update tokens
        user.oauth_access_token = user_info.access_token
        if user_info.refresh_token:
            user.oauth_refresh_token = user_info.refresh_token
        await db.commit()
        return user

    # Try to find by email
    result = await db.execute(
        select(User).where(User.email == user_info.email)
    )
    user = result.scalar_one_or_none()

    if user:
        # Link OAuth to existing account
        user.oauth_provider = user_info.provider
        user.oauth_id = user_info.oauth_id
        user.oauth_access_token = user_info.access_token
        user.oauth_refresh_token = user_info.refresh_token
        if not user.avatar_url and user_info.avatar_url:
            user.avatar_url = user_info.avatar_url
        await db.commit()
        return user

    # Create new user
    # Ensure unique username
    base_username = user_info.username
    username = base_username
    counter = 1

    while True:
        result = await db.execute(
            select(User).where(User.username == username)
        )
        if not result.scalar_one_or_none():
            break
        username = f"{base_username}{counter}"
        counter += 1

    user = User(
        email=user_info.email,
        username=username,
        hashed_password=get_password_hash(secrets.token_urlsafe(32)),
        full_name=user_info.full_name,
        avatar_url=user_info.avatar_url,
        is_active=True,
        is_verified=True,  # OAuth users are pre-verified
        oauth_provider=user_info.provider,
        oauth_id=user_info.oauth_id,
        oauth_access_token=user_info.access_token,
        oauth_refresh_token=user_info.refresh_token
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user
