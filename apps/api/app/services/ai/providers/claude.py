"""
Claude (Anthropic) AI Provider
"""

from typing import AsyncGenerator, List, Optional, Dict, Any
import logging
import anthropic
from anthropic import AsyncAnthropic

from app.core.config import settings
from app.services.ai.providers.base import BaseProvider
from app.schemas.ai import (
    AIResponse,
    AIMessage,
    ToolDefinition,
    ToolCall,
    StreamDelta,
    AIProviderType
)

logger = logging.getLogger(__name__)


class ClaudeProvider(BaseProvider):
    """Anthropic Claude AI Provider"""

    def __init__(self, api_key: Optional[str] = None):
        super().__init__()
        self.name = "claude"
        self.is_local = False
        self.supports_tools = True
        self.supports_vision = True
        self.default_model = "claude-sonnet-4-5-20250929"
        self.available_models = [
            "claude-sonnet-4-5-20250929",
            "claude-3-5-sonnet-20241022",
            "claude-3-opus-20240229",
            "claude-3-haiku-20240307"
        ]

        self.api_key = api_key or settings.ANTHROPIC_API_KEY
        self.client = AsyncAnthropic(api_key=self.api_key) if self.api_key else None

    async def is_available(self) -> bool:
        """Check if Claude is available"""
        return self.api_key is not None and len(self.api_key) > 0

    async def get_models(self) -> List[str]:
        """Get available Claude models (always returns catalogue for UI display)"""
        return self.available_models

    def _format_messages(self, messages: List[AIMessage]) -> List[Dict[str, Any]]:
        """Format messages for Claude API"""
        formatted = []
        for msg in messages:
            if msg.role == "tool":
                # Tool results in Claude format
                formatted.append({
                    "role": "user",
                    "content": [{
                        "type": "tool_result",
                        "tool_use_id": msg.tool_call_id,
                        "content": msg.content
                    }]
                })
            elif msg.tool_calls:
                # Assistant message with tool calls
                content = []
                if msg.content:
                    content.append({"type": "text", "text": msg.content})
                for tc in msg.tool_calls:
                    content.append({
                        "type": "tool_use",
                        "id": tc["id"],
                        "name": tc["name"],
                        "input": tc["arguments"]
                    })
                formatted.append({"role": "assistant", "content": content})
            else:
                formatted.append({
                    "role": msg.role,
                    "content": msg.content
                })
        return formatted

    def _format_tools(self, tools: Optional[List[ToolDefinition]]) -> Optional[List[Dict[str, Any]]]:
        """Format tools for Claude API"""
        if not tools:
            return None

        return [{
            "name": tool.name,
            "description": tool.description,
            "input_schema": tool.parameters
        } for tool in tools]

    def _parse_tool_calls(self, content_blocks: List[Any]) -> Optional[List[ToolCall]]:
        """Parse tool calls from Claude response"""
        tool_calls = []
        for block in content_blocks:
            if hasattr(block, 'type') and block.type == "tool_use":
                tool_calls.append(ToolCall(
                    id=block.id,
                    name=block.name,
                    arguments=block.input
                ))
        return tool_calls if tool_calls else None

    async def complete(
        self,
        messages: List[AIMessage],
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        tools: Optional[List[ToolDefinition]] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AIResponse:
        """Send completion request to Claude"""
        if not self.client:
            raise ValueError("Claude API key not configured")

        model = model or self.default_model
        formatted_messages = self._format_messages(messages)
        formatted_tools = self._format_tools(tools)

        kwargs = {
            "model": model,
            "messages": formatted_messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }

        if system_prompt:
            kwargs["system"] = system_prompt

        if formatted_tools:
            kwargs["tools"] = formatted_tools

        try:
            response = await self.client.messages.create(**kwargs)

            # Extract text content
            content = ""
            for block in response.content:
                if hasattr(block, 'text'):
                    content += block.text

            # Parse tool calls
            tool_calls = self._parse_tool_calls(response.content)

            return AIResponse(
                content=content,
                model=model,
                provider=AIProviderType.CLAUDE,
                tool_calls=tool_calls,
                finish_reason="tool_use" if tool_calls else response.stop_reason or "stop",
                usage={
                    "prompt_tokens": response.usage.input_tokens,
                    "completion_tokens": response.usage.output_tokens,
                    "total_tokens": response.usage.input_tokens + response.usage.output_tokens
                }
            )
        except Exception as e:
            logger.error(f"Claude completion error: {e}")
            raise

    async def stream(
        self,
        messages: List[AIMessage],
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        tools: Optional[List[ToolDefinition]] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AsyncGenerator[StreamDelta, None]:
        """Stream completion from Claude"""
        if not self.client:
            raise ValueError("Claude API key not configured")

        model = model or self.default_model
        formatted_messages = self._format_messages(messages)
        formatted_tools = self._format_tools(tools)

        kwargs = {
            "model": model,
            "messages": formatted_messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }

        if system_prompt:
            kwargs["system"] = system_prompt

        if formatted_tools:
            kwargs["tools"] = formatted_tools

        try:
            async with self.client.messages.stream(**kwargs) as stream:
                current_tool_call = None

                async for event in stream:
                    if event.type == "content_block_start":
                        if hasattr(event.content_block, 'type'):
                            if event.content_block.type == "tool_use":
                                current_tool_call = {
                                    "id": event.content_block.id,
                                    "name": event.content_block.name,
                                    "arguments": ""
                                }
                                yield StreamDelta(
                                    type="tool_call_start",
                                    tool_call=current_tool_call
                                )

                    elif event.type == "content_block_delta":
                        if hasattr(event.delta, 'text'):
                            yield StreamDelta(
                                type="text",
                                text=event.delta.text
                            )
                        elif hasattr(event.delta, 'partial_json'):
                            if current_tool_call:
                                current_tool_call["arguments"] += event.delta.partial_json
                                yield StreamDelta(
                                    type="tool_call_delta",
                                    tool_call={"partial_json": event.delta.partial_json}
                                )

                    elif event.type == "content_block_stop":
                        if current_tool_call:
                            yield StreamDelta(
                                type="tool_call_end",
                                tool_call=current_tool_call
                            )
                            current_tool_call = None

        except Exception as e:
            logger.error(f"Claude streaming error: {e}")
            raise
