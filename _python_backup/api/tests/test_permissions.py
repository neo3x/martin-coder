"""
TEST-01: Authorization and permission tests
"""

import pytest
from httpx import AsyncClient
from app.core.security import create_access_token


class TestAuthorizationPermissions:
    """Tests for authorization and access control"""

    @pytest.mark.asyncio
    async def test_access_projects_requires_auth(self, client: AsyncClient):
        """Unauthenticated users cannot access projects"""
        response = await client.get("/api/v1/projects")
        assert response.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_access_chat_requires_auth(self, client: AsyncClient):
        """Unauthenticated users cannot access chats"""
        response = await client.get("/api/v1/chat")
        assert response.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_expired_token_rejected(self, client: AsyncClient):
        """Expired tokens are rejected"""
        from datetime import timedelta
        token = create_access_token(subject="fake-id", expires_delta=timedelta(seconds=-1))
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_token_for_nonexistent_user(self, client: AsyncClient):
        """Token for non-existent user returns 401"""
        token = create_access_token(subject="nonexistent-user-id")
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_user_can_create_project(self, client: AsyncClient, auth_headers: dict):
        """Authenticated user can create a project"""
        response = await client.post(
            "/api/v1/projects",
            json={"name": "test-project", "description": "A test project"},
            headers=auth_headers,
        )
        assert response.status_code in (200, 201)

    @pytest.mark.asyncio
    async def test_user_cannot_access_other_user_project(
        self, client: AsyncClient, auth_headers: dict, admin_headers: dict
    ):
        """User cannot access another user's project"""
        # Admin creates a project
        create_resp = await client.post(
            "/api/v1/projects",
            json={"name": "admin-project", "description": "Admin's project"},
            headers=admin_headers,
        )
        if create_resp.status_code in (200, 201):
            project_id = create_resp.json().get("id")
            if project_id:
                # Regular user tries to access it
                get_resp = await client.get(
                    f"/api/v1/projects/{project_id}",
                    headers=auth_headers,
                )
                # Should be 403 or 404 (depending on implementation)
                assert get_resp.status_code in (403, 404)

    @pytest.mark.asyncio
    async def test_malformed_bearer_token(self, client: AsyncClient):
        """Malformed bearer token is rejected"""
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer "},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_no_bearer_prefix(self, client: AsyncClient):
        """Missing Bearer prefix is rejected"""
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "some-token-without-bearer"},
        )
        assert response.status_code in (401, 403)
