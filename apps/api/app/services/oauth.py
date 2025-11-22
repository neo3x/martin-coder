"""
OAuth Service - GitHub and Google OAuth integration
"""

from typing import Optional, Dict, Any
from dataclasses import dataclass
import httpx
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class OAuthUserInfo:
    """OAuth user information"""
    provider: str
    oauth_id: str
    email: str
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None


class OAuthProvider:
    """Base OAuth provider"""

    def __init__(self):
        self.client_id: str = ""
        self.client_secret: str = ""
        self.authorize_url: str = ""
        self.token_url: str = ""
        self.userinfo_url: str = ""
        self.scopes: list = []

    def get_authorization_url(self, redirect_uri: str, state: str) -> str:
        """Get OAuth authorization URL"""
        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "scope": " ".join(self.scopes),
            "state": state,
            "response_type": "code"
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{self.authorize_url}?{query}"

    async def exchange_code(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for tokens"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.token_url,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code"
                },
                headers={"Accept": "application/json"}
            )
            response.raise_for_status()
            return response.json()

    async def get_user_info(self, access_token: str) -> OAuthUserInfo:
        """Get user info from provider"""
        raise NotImplementedError


class GitHubOAuth(OAuthProvider):
    """GitHub OAuth provider"""

    def __init__(self):
        super().__init__()
        self.client_id = settings.GITHUB_CLIENT_ID or ""
        self.client_secret = settings.GITHUB_CLIENT_SECRET or ""
        self.authorize_url = "https://github.com/login/oauth/authorize"
        self.token_url = "https://github.com/login/oauth/access_token"
        self.userinfo_url = "https://api.github.com/user"
        self.scopes = ["read:user", "user:email"]

    @property
    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret)

    async def get_user_info(self, access_token: str) -> OAuthUserInfo:
        """Get GitHub user info"""
        async with httpx.AsyncClient() as client:
            # Get user profile
            response = await client.get(
                self.userinfo_url,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json"
                }
            )
            response.raise_for_status()
            user_data = response.json()

            # Get user emails if email is private
            email = user_data.get("email")
            if not email:
                email_response = await client.get(
                    "https://api.github.com/user/emails",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Accept": "application/json"
                    }
                )
                if email_response.status_code == 200:
                    emails = email_response.json()
                    primary = next((e for e in emails if e.get("primary")), None)
                    email = primary["email"] if primary else emails[0]["email"]

            return OAuthUserInfo(
                provider="github",
                oauth_id=str(user_data["id"]),
                email=email or f"{user_data['login']}@github.local",
                username=user_data["login"],
                full_name=user_data.get("name"),
                avatar_url=user_data.get("avatar_url"),
                access_token=access_token
            )


class GoogleOAuth(OAuthProvider):
    """Google OAuth provider"""

    def __init__(self):
        super().__init__()
        self.client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '') or ""
        self.client_secret = getattr(settings, 'GOOGLE_CLIENT_SECRET', '') or ""
        self.authorize_url = "https://accounts.google.com/o/oauth2/v2/auth"
        self.token_url = "https://oauth2.googleapis.com/token"
        self.userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        self.scopes = ["openid", "email", "profile"]

    @property
    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret)

    def get_authorization_url(self, redirect_uri: str, state: str) -> str:
        """Get Google authorization URL with additional params"""
        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "scope": " ".join(self.scopes),
            "state": state,
            "response_type": "code",
            "access_type": "offline",
            "prompt": "consent"
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{self.authorize_url}?{query}"

    async def get_user_info(self, access_token: str) -> OAuthUserInfo:
        """Get Google user info"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.userinfo_url,
                headers={"Authorization": f"Bearer {access_token}"}
            )
            response.raise_for_status()
            user_data = response.json()

            # Generate username from email
            email = user_data["email"]
            username = email.split("@")[0]

            return OAuthUserInfo(
                provider="google",
                oauth_id=user_data["id"],
                email=email,
                username=username,
                full_name=user_data.get("name"),
                avatar_url=user_data.get("picture"),
                access_token=access_token
            )


class OAuthService:
    """OAuth service for handling all providers"""

    def __init__(self):
        self.providers = {
            "github": GitHubOAuth(),
            "google": GoogleOAuth()
        }

    def get_provider(self, name: str) -> OAuthProvider:
        """Get OAuth provider by name"""
        provider = self.providers.get(name)
        if not provider:
            raise ValueError(f"Unknown OAuth provider: {name}")
        return provider

    def get_available_providers(self) -> list:
        """Get list of configured providers"""
        return [
            name for name, provider in self.providers.items()
            if provider.is_configured
        ]

    async def authenticate(
        self,
        provider_name: str,
        code: str,
        redirect_uri: str
    ) -> OAuthUserInfo:
        """Authenticate user with OAuth provider"""
        provider = self.get_provider(provider_name)

        # Exchange code for tokens
        token_data = await provider.exchange_code(code, redirect_uri)
        access_token = token_data.get("access_token")

        if not access_token:
            raise ValueError("No access token received")

        # Get user info
        user_info = await provider.get_user_info(access_token)
        user_info.refresh_token = token_data.get("refresh_token")

        return user_info


# Global OAuth service instance
oauth_service = OAuthService()
