"""
Chat Endpoints
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.chat import Chat, Message, MessageRole
from app.models.project import Project
from app.schemas.chat import (
    ChatCreate,
    ChatUpdate,
    ChatResponse,
    MessageResponse,
    ChatCompletionRequest
)
from app.services.chat import ChatService

router = APIRouter()

def _to_chat_response(chat: Chat, messages: Optional[List[MessageResponse]] = None) -> ChatResponse:
    """Serialize chat without triggering lazy-loading relationships."""
    return ChatResponse(
        id=chat.id,
        user_id=chat.user_id,
        project_id=chat.project_id,
        title=chat.title,
        ai_provider=chat.ai_provider,
        ai_model=chat.ai_model,
        system_prompt=chat.system_prompt,
        context_files=chat.context_files,
        message_count=chat.message_count,
        total_tokens=chat.total_tokens,
        created_at=chat.created_at,
        updated_at=chat.updated_at,
        messages=messages,
    )


@router.get("", response_model=List[ChatResponse])
async def list_chats(
    project_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List user's chats"""
    query = select(Chat).where(Chat.user_id == current_user.id)

    if project_id:
        query = query.where(Chat.project_id == project_id)

    query = query.order_by(Chat.updated_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    chats = result.scalars().all()
    return [_to_chat_response(chat) for chat in chats]


@router.post("", response_model=ChatResponse)
async def create_chat(
    chat_in: ChatCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new chat"""
    # Verify project ownership if provided
    if chat_in.project_id:
        result = await db.execute(
            select(Project).where(
                Project.id == chat_in.project_id,
                Project.owner_id == current_user.id
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )

    chat = Chat(
        **chat_in.model_dump(),
        user_id=current_user.id
    )

    db.add(chat)
    await db.commit()
    await db.refresh(chat)

    return _to_chat_response(chat)


@router.get("/{chat_id}", response_model=ChatResponse)
async def get_chat(
    chat_id: str,
    include_messages: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get chat by ID"""
    result = await db.execute(
        select(Chat).where(
            Chat.id == chat_id,
            Chat.user_id == current_user.id
        )
    )
    chat = result.scalar_one_or_none()

    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )

    response = _to_chat_response(chat)

    if include_messages:
        result = await db.execute(
            select(Message)
            .where(Message.chat_id == chat_id)
            .order_by(Message.created_at)
        )
        response.messages = [
            MessageResponse.model_validate(m)
            for m in result.scalars().all()
        ]

    return response


@router.patch("/{chat_id}", response_model=ChatResponse)
async def update_chat(
    chat_id: str,
    chat_update: ChatUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a chat"""
    result = await db.execute(
        select(Chat).where(
            Chat.id == chat_id,
            Chat.user_id == current_user.id
        )
    )
    chat = result.scalar_one_or_none()

    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )

    update_data = chat_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(chat, field, value)

    await db.commit()
    await db.refresh(chat)

    return _to_chat_response(chat)


@router.delete("/{chat_id}")
async def delete_chat(
    chat_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a chat"""
    result = await db.execute(
        select(Chat).where(
            Chat.id == chat_id,
            Chat.user_id == current_user.id
        )
    )
    chat = result.scalar_one_or_none()

    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )

    await db.delete(chat)
    await db.commit()

    return {"message": "Chat deleted"}


@router.post("/{chat_id}/messages")
async def send_message(
    chat_id: str,
    request: ChatCompletionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a message and get AI response (streaming)"""
    # Verify chat ownership
    result = await db.execute(
        select(Chat).where(
            Chat.id == chat_id,
            Chat.user_id == current_user.id
        )
    )
    chat = result.scalar_one_or_none()

    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )

    # Get project if associated
    project = None
    if chat.project_id:
        result = await db.execute(
            select(Project).where(Project.id == chat.project_id)
        )
        project = result.scalar_one_or_none()

    chat_service = ChatService(db, current_user)

    if request.stream:
        # Streaming response
        async def generate():
            async for chunk in chat_service.stream_completion(
                chat=chat,
                message=request.message,
                project=project,
                use_tools=request.use_tools
            ):
                yield f"data: {json.dumps(chunk)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream"
        )
    else:
        # Non-streaming response
        response = await chat_service.complete(
            chat=chat,
            message=request.message,
            project=project,
            use_tools=request.use_tools
        )
        return response


@router.get("/{chat_id}/messages", response_model=List[MessageResponse])
async def list_messages(
    chat_id: str,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List messages in a chat"""
    # Verify chat ownership
    result = await db.execute(
        select(Chat).where(
            Chat.id == chat_id,
            Chat.user_id == current_user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )

    result = await db.execute(
        select(Message)
        .where(Message.chat_id == chat_id)
        .order_by(Message.created_at)
        .offset(skip)
        .limit(limit)
    )

    return result.scalars().all()
