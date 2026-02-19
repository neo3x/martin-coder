"""
OAuth Endpoints — SEC-02 (HttpOnly cookies), SEC-08 (Redis state)
"""

import json as _json
import secrets
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import httpx

from app.api.deps import get_db, get_current_user
from app.core.security import create_access_token, create_refresh_token, get_password_hash
from app.core.config import settings
from app.models.user import User
from app.services.oauth import oauth_service, OAuthUserInfo
from app.schemas.user import Token

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Redis-backed OAuth state store (SEC-08)
# ---------------------------------------------------------------------------

async def _get_redis():
    """Lazy Redis connection for OAuth state."""
    import redis.asyncio as aioredis
    return aioredis.from_url(settings.REDIS_URL, decode_responses=True)


async def _store_oauth_state(state: str, data: dict) -> None:
    """Persist OAuth state in Redis with a 10-minute TTL."""
    try:
        r = await _get_redis()
    except Exception:
        logger.warning("Redis unavailable — cannot store OAuth state")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OAuth state storage unavailable",
        )
    try:
        await r.setex(f"oauth_state:{state}", 600, _json.dumps(data))
    finally:
        try:
            await r.aclose()
        except Exception:
            pass


async def _pop_oauth_state(state: str) -> Optional[dict]:
    """Retrieve and delete OAuth state from Redis."""
    try:
        r = await _get_redis()
    except Exception:
        logger.warning("Redis unavailable — cannot verify OAuth state")
        return None
    try:
        key = f"oauth_state:{state}"
        raw = await r.get(key)
        if raw:
            await r.delete(key)
            return _json.loads(raw)
        return None
    except Exception:
        logger.warning("Redis unavailable — cannot verify OAuth state")
        return None
    finally:
        try:
            await r.aclose()
        except Exception:
            pass


class GitHubTokenConnectRequest(BaseModel):
    token: str


class GitHubRepoResponse(BaseModel):
    id: int
    name: str
    full_name: str
    private: bool
    html_url: str
    default_branch: str


@router.get("/providers")
async def list_oauth_providers():
    """List available OAuth providers"""
    providers = oauth_service.get_available_providers()
    return {
        "providers": providers,
        "github": "github" in providers,
        "google": "google" in providers
    }


@router.post("/github/token")
async def connect_github_with_token(
    payload: GitHubTokenConnectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Connect GitHub account using a Personal Access Token."""
    token = payload.token.strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub token is required"
        )

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid GitHub token or insufficient permissions"
        )

    user_data = response.json()
    current_user.oauth_provider = "github"
    current_user.oauth_id = str(user_data.get("id", current_user.id))
    current_user.oauth_access_token = token
    await db.commit()

    return {
        "connected": True,
        "username": user_data.get("login"),
        "name": user_data.get("name"),
        "avatar_url": user_data.get("avatar_url"),
    }


@router.get("/github/repos", response_model=list[GitHubRepoResponse])
async def list_github_repositories(
    current_user: User = Depends(get_current_user)
):
    """List repositories from connected GitHub account."""
    token = current_user.oauth_access_token
    if not token or current_user.oauth_provider != "github":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub is not connected with token"
        )

    repos: list[dict] = []
    page = 1

    async with httpx.AsyncClient(timeout=20.0) as client:
        while page <= 5:
            response = await client.get(
                "https://api.github.com/user/repos",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
                params={"per_page": 100, "page": page, "sort": "updated"},
            )
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to fetch repositories from GitHub"
                )

            chunk = response.json()
            repos.extend(chunk)
            if len(chunk) < 100:
                break
            page += 1

    return [
        GitHubRepoResponse(
            id=repo["id"],
            name=repo["name"],
            full_name=repo["full_name"],
            private=repo["private"],
            html_url=repo["html_url"],
            default_branch=repo.get("default_branch", "main"),
        )
        for repo in repos
    ]


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

    # Generate state for CSRF protection — stored in Redis (SEC-08)
    state = secrets.token_urlsafe(32)
    await _store_oauth_state(state, {"redirect_uri": redirect_uri, "provider": provider})

    auth_url = oauth_provider.get_authorization_url(
        redirect_uri=f"{settings.FRONTEND_URL}/api/oauth/{provider}/callback",
        state=state
    )

    return {"authorization_url": auth_url, "state": state}


@router.get("/{provider}/callback")
async def oauth_callback(
    provider: str,
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Handle OAuth callback — tokens set as HttpOnly cookies (SEC-02)."""
    # Verify state from Redis (SEC-08)
    state_data = await _pop_oauth_state(state)
    if not state_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired state",
        )

    try:
        # Authenticate with provider
        user_info = await oauth_service.authenticate(
            provider_name=provider,
            code=code,
            redirect_uri=f"{settings.FRONTEND_URL}/api/oauth/{provider}/callback",
        )

        # Find or create user
        user = await get_or_create_oauth_user(db, user_info)

        # Generate tokens
        access_token = create_access_token(subject=user.id)
        refresh_token = create_refresh_token(subject=user.id)

        # Redirect — tokens in HttpOnly cookies instead of URL (SEC-02)
        redirect_uri = state_data["redirect_uri"]
        redirect = RedirectResponse(url=redirect_uri, status_code=302)

        is_secure = settings.ENVIRONMENT == "production"
        redirect.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=is_secure,
            samesite="lax",
            max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            path="/",
        )
        redirect.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=is_secure,
            samesite="lax",
            max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
            path="/api/v1/auth/refresh",
        )

        return redirect

    except Exception as e:
        logger.error(f"OAuth callback error for {provider}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAuth authentication failed",
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
