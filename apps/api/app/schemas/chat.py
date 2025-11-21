"""
Chat Schemas
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from app.models.chat import MessageRole


class MessageBase(BaseModel):
    """Base message schema"""
    role: MessageRole
    content: str


class MessageCreate(MessageBase):
    """Schema for creating a message"""
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_call_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class MessageResponse(MessageBase):
    """Schema for message response"""
    id: str
    chat_id: str
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_call_id: Optional[str] = None
    prompt_tokens: int = 0
    completion_tokens: int = 0
    model: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatBase(BaseModel):
    """Base chat schema"""
    title: str = "New Chat"


class ChatCreate(ChatBase):
    """Schema for creating a chat"""
    project_id: Optional[str] = None
    ai_provider: str = "claude"
    ai_model: str = "claude-sonnet-4-5-20250929"
    system_prompt: Optional[str] = None
    context_files: Optional[List[str]] = None


class ChatUpdate(BaseModel):
    """Schema for updating a chat"""
    title: Optional[str] = None
    ai_provider: Optional[str] = None
    ai_model: Optional[str] = None
    system_prompt: Optional[str] = None
    context_files: Optional[List[str]] = None


class ChatResponse(ChatBase):
    """Schema for chat response"""
    id: str
    user_id: str
    project_id: Optional[str] = None
    ai_provider: str
    ai_model: str
    system_prompt: Optional[str] = None
    context_files: Optional[List[str]] = None
    message_count: int
    total_tokens: int
    created_at: datetime
    updated_at: datetime
    messages: Optional[List[MessageResponse]] = None

    class Config:
        from_attributes = True


class ChatCompletionRequest(BaseModel):
    """Schema for chat completion request"""
    message: str = Field(..., min_length=1)
    chat_id: Optional[str] = None
    project_id: Optional[str] = None
    ai_provider: Optional[str] = None
    ai_model: Optional[str] = None
    context_files: Optional[List[str]] = None
    use_tools: bool = True
    stream: bool = True


class ChatCompletionResponse(BaseModel):
    """Schema for chat completion response"""
    chat_id: str
    message: MessageResponse
    tool_calls: Optional[List[Dict[str, Any]]] = None
    usage: Dict[str, int]


class StreamChunk(BaseModel):
    """Schema for streaming response chunk"""
    type: str  # "content", "tool_call", "tool_result", "done", "error"
    content: Optional[str] = None
    tool_call: Optional[Dict[str, Any]] = None
    tool_result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    message_id: Optional[str] = None
