"""
TEST-04: OAuth flow tests
"""

import pytest
from httpx import AsyncClient


class TestOAuthEndpoints:
    """Tests for OAuth functionality"""

    @pytest.mark.asyncio
    async def test_list_providers(self, client: AsyncClient):
        """Test listing OAuth providers"""
        response = await client.get("/api/v1/oauth/providers")
        assert response.status_code == 200
        data = response.json()
        assert "providers" in data
        assert isinstance(data["providers"], list)

    @pytest.mark.asyncio
    async def test_authorize_unknown_provider(self, client: AsyncClient):
        """Test authorization with unknown provider returns error"""
        response = await client.get(
            "/api/v1/oauth/unknown_provider/authorize",
            params={"redirect_uri": "http://localhost:3000/callback"},
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_callback_invalid_state(self, client: AsyncClient):
        """Test callback with invalid state returns error"""
        response = await client.get(
            "/api/v1/oauth/github/callback",
            params={"code": "fake-code", "state": "invalid-state"},
            follow_redirects=False,
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_github_token_requires_auth(self, client: AsyncClient):
        """Test GitHub token connection requires authentication"""
        response = await client.post(
            "/api/v1/oauth/github/token",
            json={"token": "fake-token"},
        )
        assert response.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_github_repos_requires_auth(self, client: AsyncClient):
        """Test GitHub repos endpoint requires authentication"""
        response = await client.get("/api/v1/oauth/github/repos")
        assert response.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_github_token_empty(self, client: AsyncClient, auth_headers: dict):
        """Test connecting with empty token returns error"""
        response = await client.post(
            "/api/v1/oauth/github/token",
            json={"token": "   "},
            headers=auth_headers,
        )
        assert response.status_code == 400
