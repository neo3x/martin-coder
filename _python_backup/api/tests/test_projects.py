"""
Project Tests
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.project import Project


class TestProjectCRUD:
    """Test project CRUD operations"""

    @pytest.mark.asyncio
    async def test_create_project(self, client: AsyncClient, auth_headers: dict):
        """Test creating a project"""
        response = await client.post(
            "/api/v1/projects",
            headers=auth_headers,
            json={
                "name": "Test Project",
                "description": "A test project",
                "local_path": "/tmp/test-project"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Project"
        assert data["description"] == "A test project"
        assert "id" in data

    @pytest.mark.asyncio
    async def test_create_project_unauthenticated(self, client: AsyncClient):
        """Test creating project without auth"""
        response = await client.post(
            "/api/v1/projects",
            json={"name": "Test Project"}
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_projects(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        test_user: User
    ):
        """Test listing user's projects"""
        # Create some projects
        for i in range(3):
            project = Project(
                name=f"Project {i}",
                owner_id=test_user.id
            )
            db_session.add(project)
        await db_session.commit()

        response = await client.get("/api/v1/projects", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

    @pytest.mark.asyncio
    async def test_get_project(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        test_user: User
    ):
        """Test getting a specific project"""
        project = Project(
            name="Test Project",
            owner_id=test_user.id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        response = await client.get(
            f"/api/v1/projects/{project.id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Project"

    @pytest.mark.asyncio
    async def test_get_project_not_found(self, client: AsyncClient, auth_headers: dict):
        """Test getting nonexistent project"""
        response = await client.get(
            "/api/v1/projects/nonexistent-id",
            headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_project(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        test_user: User
    ):
        """Test updating a project"""
        project = Project(
            name="Original Name",
            owner_id=test_user.id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        response = await client.patch(
            f"/api/v1/projects/{project.id}",
            headers=auth_headers,
            json={"name": "Updated Name"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"

    @pytest.mark.asyncio
    async def test_delete_project(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        test_user: User
    ):
        """Test deleting a project"""
        project = Project(
            name="To Delete",
            owner_id=test_user.id
        )
        db_session.add(project)
        await db_session.commit()
        await db_session.refresh(project)

        response = await client.delete(
            f"/api/v1/projects/{project.id}",
            headers=auth_headers
        )
        assert response.status_code == 200

        # Verify deletion
        response = await client.get(
            f"/api/v1/projects/{project.id}",
            headers=auth_headers
        )
        assert response.status_code == 404
