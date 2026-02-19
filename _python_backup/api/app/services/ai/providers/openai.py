"""
OpenAI AI Provider
"""

from typing import AsyncGenerator, List, Optional, Dict, Any
import logging
import json
from openai import AsyncOpenAI

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


class OpenAIProvider(BaseProvider):
    """OpenAI AI Provider"""

    def __init__(self, api_key: Optional[str] = None):
        super().__init__()
        self.name = "openai"
        self.is_local = False
        self.supports_tools = True
        self.supports_vision = True
        self.default_model = "gpt-4o"
        self.available_models = [
            "gpt-4o",
            "gpt-4o-mini",
            "gpt-4-turbo",
            "gpt-4",
            "gpt-3.5-turbo"
        ]

        self.api_key = api_key or settings.OPENAI_API_KEY
        self.client = AsyncOpenAI(api_key=self.api_key) if self.api_key else None

    async def is_available(self) -> bool:
        """Check if OpenAI is available"""
        return self.api_key is not None and len(self.api_key) > 0

    async def get_models(self) -> List[str]:
        """Get available OpenAI models (always returns catalogue for UI display)"""
        return self.available_models

    def _format_messages(self, messages: List[AIMessage]) -> List[Dict[str, Any]]:
        """Format messages for OpenAI API"""
        formatted = []
        for msg in messages:
            if msg.role == "tool":
                formatted.append({
                    "role": "tool",
                    "tool_call_id": msg.tool_call_id,
                    "content": msg.content
                })
            elif msg.tool_calls:
                formatted.append({
                    "role": "assistant",
                    "content": msg.content or None,
                    "tool_calls": [{
                        "id": tc["id"],
                        "type": "function",
                        "function": {
                            "name": tc["name"],
                            "arguments": json.dumps(tc["arguments"]) if isinstance(tc["arguments"], dict) else tc["arguments"]
                        }
                    } for tc in msg.tool_calls]
                })
            else:
                formatted.append({
                    "role": msg.role,
                    "content": msg.content
                })
        return formatted

    def _format_tools(self, tools: Optional[List[ToolDefinition]]) -> Optional[List[Dict[str, Any]]]:
        """Format tools for OpenAI API"""
        if not tools:
            return None

        return [{
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.parameters
            }
        } for tool in tools]

    def _parse_tool_calls(self, tool_calls: Any) -> Optional[List[ToolCall]]:
        """Parse tool calls from OpenAI response"""
        if not tool_calls:
            return None

        parsed = []
        for tc in tool_calls:
            try:
                arguments = json.loads(tc.function.arguments)
            except json.JSONDecodeError:
                arguments = {"raw": tc.function.arguments}

            parsed.append(ToolCall(
                id=tc.id,
                name=tc.function.name,
                arguments=arguments
            ))
        return parsed if parsed else None

    async def complete(
        self,
        messages: List[AIMessage],
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        tools: Optional[List[ToolDefinition]] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AIResponse:
        """Send completion request to OpenAI"""
        if not self.client:
            raise ValueError("OpenAI API key not configured")

        model = model or self.default_model
        formatted_messages = self._format_messages(messages)
        formatted_tools = self._format_tools(tools)

        # Add system prompt
        if system_prompt:
            formatted_messages.insert(0, {
                "role": "system",
                "content": system_prompt
            })

        kwargs = {
            "model": model,
            "messages": formatted_messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }

        if formatted_tools:
            kwargs["tools"] = formatted_tools
            kwargs["tool_choice"] = "auto"

        try:
            response = await self.client.chat.completions.create(**kwargs)
            choice = response.choices[0]

            # Parse tool calls
            tool_calls = self._parse_tool_calls(choice.message.tool_calls)

            return AIResponse(
                content=choice.message.content or "",
                model=model,
                provider=AIProviderType.OPENAI,
                tool_calls=tool_calls,
                finish_reason="tool_use" if tool_calls else choice.finish_reason or "stop",
                usage={
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                }
            )
        except Exception as e:
            logger.error(f"OpenAI completion error: {e}")
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
        """Stream completion from OpenAI"""
        if not self.client:
            raise ValueError("OpenAI API key not configured")

        model = model or self.default_model
        formatted_messages = self._format_messages(messages)
        formatted_tools = self._format_tools(tools)

        # Add system prompt
        if system_prompt:
            formatted_messages.insert(0, {
                "role": "system",
                "content": system_prompt
            })

        kwargs = {
            "model": model,
            "messages": formatted_messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": True,
        }

        if formatted_tools:
            kwargs["tools"] = formatted_tools
            kwargs["tool_choice"] = "auto"

        try:
            current_tool_calls = {}

            async for chunk in await self.client.chat.completions.create(**kwargs):
                delta = chunk.choices[0].delta if chunk.choices else None

                if not delta:
                    continue

                # Text content
                if delta.content:
                    yield StreamDelta(
                        type="text",
                        text=delta.content
                    )

                # Tool calls
                if delta.tool_calls:
                    for tc in delta.tool_calls:
                        tc_id = tc.index

                        if tc_id not in current_tool_calls:
                            current_tool_calls[tc_id] = {
                                "id": tc.id or "",
                                "name": tc.function.name if tc.function else "",
                                "arguments": ""
                            }
                            if tc.function and tc.function.name:
                                yield StreamDelta(
                                    type="tool_call_start",
                                    tool_call=current_tool_calls[tc_id]
                                )

                        if tc.function and tc.function.arguments:
                            current_tool_calls[tc_id]["arguments"] += tc.function.arguments
                            yield StreamDelta(
                                type="tool_call_delta",
                                tool_call={"partial_json": tc.function.arguments}
                            )

                # Check for finish
                if chunk.choices[0].finish_reason:
                    for tc in current_tool_calls.values():
                        yield StreamDelta(
                            type="tool_call_end",
                            tool_call=tc
                        )

        except Exception as e:
            logger.error(f"OpenAI streaming error: {e}")
            raise
