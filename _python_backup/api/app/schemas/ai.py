"""
AI Provider Schemas
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class AIProviderType(str, Enum):
    """AI Provider types"""
    CLAUDE = "claude"
    OPENAI = "openai"
    LMSTUDIO = "lmstudio"
    OLLAMA = "ollama"


class AIProvider(BaseModel):
    """AI Provider information"""
    name: str
    type: AIProviderType
    is_available: bool
    is_local: bool
    models: List[str]
    default_model: str


class AIModel(BaseModel):
    """AI Model information"""
    id: str
    name: str
    provider: AIProviderType
    context_window: int
    supports_tools: bool
    supports_vision: bool
    is_available: bool


class AIMessage(BaseModel):
    """Message for AI request"""
    role: str  # "user", "assistant", "system", "tool"
    content: str
    tool_call_id: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None


class ToolDefinition(BaseModel):
    """Tool definition for AI"""
    name: str
    description: str
    parameters: Dict[str, Any]  # JSON Schema


class AIRequest(BaseModel):
    """Request to AI provider"""
    provider: AIProviderType = AIProviderType.CLAUDE
    model: str = "claude-sonnet-4-5-20250929"
    messages: List[AIMessage]
    system_prompt: Optional[str] = None
    tools: Optional[List[ToolDefinition]] = None
    max_tokens: int = Field(default=4096, ge=1, le=100000)
    temperature: float = Field(default=0.7, ge=0, le=2)
    stream: bool = True


class ToolCall(BaseModel):
    """Tool call from AI"""
    id: str
    name: str
    arguments: Dict[str, Any]


class ToolResult(BaseModel):
    """Result of tool execution"""
    tool_call_id: str
    result: Any
    is_error: bool = False
    error_message: Optional[str] = None


class AIResponse(BaseModel):
    """Response from AI provider"""
    content: str
    model: str
    provider: AIProviderType
    tool_calls: Optional[List[ToolCall]] = None
    finish_reason: str  # "stop", "tool_use", "max_tokens"
    usage: Dict[str, int]  # prompt_tokens, completion_tokens, total_tokens


class StreamDelta(BaseModel):
    """Streaming delta from AI"""
    type: str  # "text", "tool_call_start", "tool_call_delta", "tool_call_end"
    text: Optional[str] = None
    tool_call: Optional[Dict[str, Any]] = None
