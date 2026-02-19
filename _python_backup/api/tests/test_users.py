"""
TEST-03: User endpoint tests
"""

import pytest
from httpx import AsyncClient
from app.models.user import User


class TestUserEndpoints:
    """Tests for user management endpoints"""

    @pytest.mark.asyncio
    async def test_get_current_user(self, client: AsyncClient, auth_headers: dict):
        """Test GET /api/v1/auth/me returns current user"""
        response = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["username"] == "testuser"

    @pytest.mark.asyncio
    async def test_get_current_user_unauthorized(self, client: AsyncClient):
        """Test GET /api/v1/auth/me without token returns 401"""
        response = await client.get("/api/v1/auth/me")
        assert response.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_get_current_user_invalid_token(self, client: AsyncClient):
        """Test GET /api/v1/auth/me with invalid token returns 401"""
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalidtoken123"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_admin_access(self, client: AsyncClient, admin_headers: dict):
        """Test admin user can access their info"""
        response = await client.get("/api/v1/auth/me", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["is_superuser"] is True

    @pytest.mark.asyncio
    async def test_regular_user_not_superuser(self, client: AsyncClient, auth_headers: dict):
        """Test regular user is not superuser"""
        response = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["is_superuser"] is False
