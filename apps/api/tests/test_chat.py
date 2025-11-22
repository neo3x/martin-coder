"""
Chat Tests
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.chat import Chat, Message, MessageRole


class TestChatCRUD:
    """Test chat CRUD operations"""

    @pytest.mark.asyncio
    async def test_create_chat(self, client: AsyncClient, auth_headers: dict):
        """Test creating a chat"""
        response = await client.post(
            "/api/v1/chat",
            headers=auth_headers,
            json={
                "title": "Test Chat",
                "ai_provider": "claude",
                "ai_model": "claude-sonnet-4-5-20250929"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test Chat"
        assert data["ai_provider"] == "claude"
        assert "id" in data

    @pytest.mark.asyncio
    async def test_list_chats(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        test_user: User
    ):
        """Test listing user's chats"""
        for i in range(3):
            chat = Chat(
                title=f"Chat {i}",
                user_id=test_user.id
            )
            db_session.add(chat)
        await db_session.commit()

        response = await client.get("/api/v1/chat", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

    @pytest.mark.asyncio
    async def test_get_chat_with_messages(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        test_user: User
    ):
        """Test getting chat with messages"""
        chat = Chat(
            title="Test Chat",
            user_id=test_user.id
        )
        db_session.add(chat)
        await db_session.commit()
        await db_session.refresh(chat)

        # Add messages
        for role in [MessageRole.USER, MessageRole.ASSISTANT]:
            msg = Message(
                chat_id=chat.id,
                role=role,
                content=f"Test message from {role.value}"
            )
            db_session.add(msg)
        await db_session.commit()

        response = await client.get(
            f"/api/v1/chat/{chat.id}?include_messages=true",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Test Chat"
        assert len(data["messages"]) == 2

    @pytest.mark.asyncio
    async def test_delete_chat(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        test_user: User
    ):
        """Test deleting a chat"""
        chat = Chat(
            title="To Delete",
            user_id=test_user.id
        )
        db_session.add(chat)
        await db_session.commit()
        await db_session.refresh(chat)

        response = await client.delete(
            f"/api/v1/chat/{chat.id}",
            headers=auth_headers
        )
        assert response.status_code == 200

        # Verify deletion
        response = await client.get(
            f"/api/v1/chat/{chat.id}",
            headers=auth_headers
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_chat(
        self,
        client: AsyncClient,
        auth_headers: dict,
        db_session: AsyncSession,
        test_user: User
    ):
        """Test updating a chat"""
        chat = Chat(
            title="Original",
            user_id=test_user.id
        )
        db_session.add(chat)
        await db_session.commit()
        await db_session.refresh(chat)

        response = await client.patch(
            f"/api/v1/chat/{chat.id}",
            headers=auth_headers,
            json={"title": "Updated Title"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
