"""
Base AI Provider - Abstract interface for all AI providers
"""

from abc import ABC, abstractmethod
from typing import AsyncGenerator, List, Optional, Dict, Any
import logging

from app.schemas.ai import (
    AIRequest,
    AIResponse,
    AIMessage,
    ToolDefinition,
    ToolCall,
    StreamDelta
)

logger = logging.getLogger(__name__)


class BaseProvider(ABC):
    """Abstract base class for AI providers"""

    def __init__(self):
        self.name: str = "base"
        self.is_local: bool = False
        self.supports_tools: bool = True
        self.supports_vision: bool = False
        self.default_model: str = ""
        self.available_models: List[str] = []

    @abstractmethod
    async def is_available(self) -> bool:
        """Check if the provider is available and configured"""
        pass

    @abstractmethod
    async def get_models(self) -> List[str]:
        """Get list of available models"""
        pass

    @abstractmethod
    async def complete(
        self,
        messages: List[AIMessage],
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        tools: Optional[List[ToolDefinition]] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AIResponse:
        """Send a completion request and get full response"""
        pass

    @abstractmethod
    async def stream(
        self,
        messages: List[AIMessage],
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        tools: Optional[List[ToolDefinition]] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AsyncGenerator[StreamDelta, None]:
        """Send a completion request and stream the response"""
        pass

    def _format_tools(self, tools: Optional[List[ToolDefinition]]) -> Optional[List[Dict[str, Any]]]:
        """Format tools for the specific provider - override in subclasses"""
        if not tools:
            return None
        return [tool.model_dump() for tool in tools]

    def _format_messages(self, messages: List[AIMessage]) -> List[Dict[str, Any]]:
        """Format messages for the specific provider - override in subclasses"""
        return [msg.model_dump() for msg in messages]

    def _parse_tool_calls(self, response: Any) -> Optional[List[ToolCall]]:
        """Parse tool calls from response - override in subclasses"""
        return None

    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on the provider"""
        try:
            is_available = await self.is_available()
            models = await self.get_models() if is_available else []
            return {
                "provider": self.name,
                "is_available": is_available,
                "is_local": self.is_local,
                "models": models,
                "supports_tools": self.supports_tools,
                "supports_vision": self.supports_vision
            }
        except Exception as e:
            logger.error(f"Health check failed for {self.name}: {e}")
            return {
                "provider": self.name,
                "is_available": False,
                "error": str(e)
            }
