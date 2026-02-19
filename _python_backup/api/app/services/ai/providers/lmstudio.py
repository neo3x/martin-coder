"""
LM Studio AI Provider (Local LLMs via OpenAI-compatible API)
"""

from typing import AsyncGenerator, List, Optional, Dict, Any
import logging
import json
import httpx
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


class LMStudioProvider(BaseProvider):
    """LM Studio Local AI Provider"""

    def __init__(self, base_url: Optional[str] = None):
        super().__init__()
        self.name = "lmstudio"
        self.is_local = True
        self.supports_tools = True  # Depends on model
        self.supports_vision = False
        self.default_model = "local-model"
        self.available_models = []

        self.base_url = base_url or settings.LMSTUDIO_URL
        self.client = AsyncOpenAI(
            base_url=self.base_url,
            api_key="lm-studio"  # LM Studio doesn't require a real key
        )

    async def is_available(self) -> bool:
        """Check if LM Studio is running"""
        if not settings.LMSTUDIO_ENABLED:
            return False

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/models")
                return response.status_code == 200
        except Exception:
            return False

    async def get_models(self) -> List[str]:
        """Get models loaded in LM Studio"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/models")
                if response.status_code == 200:
                    data = response.json()
                    models = [m["id"] for m in data.get("data", [])]
                    self.available_models = models
                    if models and not self.default_model:
                        self.default_model = models[0]
                    return models
        except Exception as e:
            logger.warning(f"Failed to get LM Studio models: {e}")
        return []

    def _format_messages(self, messages: List[AIMessage]) -> List[Dict[str, Any]]:
        """Format messages for LM Studio (OpenAI-compatible)"""
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
        """Format tools for LM Studio"""
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
        """Parse tool calls from response"""
        if not tool_calls:
            return None

        parsed = []
        for tc in tool_calls:
            try:
                arguments = json.loads(tc.function.arguments)
            except (json.JSONDecodeError, AttributeError):
                arguments = {"raw": str(tc.function.arguments) if hasattr(tc, 'function') else str(tc)}

            parsed.append(ToolCall(
                id=tc.id if hasattr(tc, 'id') else "local",
                name=tc.function.name if hasattr(tc, 'function') else "unknown",
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
        """Send completion request to LM Studio"""
        # Get available models if needed
        if not self.available_models:
            await self.get_models()

        model = model or self.default_model or "local-model"
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

        # Only add tools if the model supports them
        if formatted_tools and self.supports_tools:
            kwargs["tools"] = formatted_tools
            kwargs["tool_choice"] = "auto"

        try:
            response = await self.client.chat.completions.create(**kwargs)
            choice = response.choices[0]

            # Parse tool calls if present
            tool_calls = None
            if hasattr(choice.message, 'tool_calls') and choice.message.tool_calls:
                tool_calls = self._parse_tool_calls(choice.message.tool_calls)

            return AIResponse(
                content=choice.message.content or "",
                model=model,
                provider=AIProviderType.LMSTUDIO,
                tool_calls=tool_calls,
                finish_reason="tool_use" if tool_calls else (choice.finish_reason or "stop"),
                usage={
                    "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                    "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                    "total_tokens": response.usage.total_tokens if response.usage else 0
                }
            )
        except Exception as e:
            logger.error(f"LM Studio completion error: {e}")
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
        """Stream completion from LM Studio"""
        # Get available models if needed
        if not self.available_models:
            await self.get_models()

        model = model or self.default_model or "local-model"
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

        if formatted_tools and self.supports_tools:
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

                # Tool calls (if supported by the model)
                if hasattr(delta, 'tool_calls') and delta.tool_calls:
                    for tc in delta.tool_calls:
                        tc_id = tc.index if hasattr(tc, 'index') else 0

                        if tc_id not in current_tool_calls:
                            current_tool_calls[tc_id] = {
                                "id": tc.id if hasattr(tc, 'id') else f"local_{tc_id}",
                                "name": tc.function.name if hasattr(tc, 'function') and tc.function else "",
                                "arguments": ""
                            }
                            if hasattr(tc, 'function') and tc.function and tc.function.name:
                                yield StreamDelta(
                                    type="tool_call_start",
                                    tool_call=current_tool_calls[tc_id]
                                )

                        if hasattr(tc, 'function') and tc.function and tc.function.arguments:
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
            logger.error(f"LM Studio streaming error: {e}")
            raise
