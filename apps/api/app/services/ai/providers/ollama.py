"""
Ollama AI Provider (Local LLMs)
"""

from typing import AsyncGenerator, List, Optional, Dict, Any
import logging
import json
import httpx

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


class OllamaProvider(BaseProvider):
    """Ollama Local AI Provider"""

    def __init__(self, base_url: Optional[str] = None):
        super().__init__()
        self.name = "ollama"
        self.is_local = True
        self.supports_tools = True
        self.supports_vision = True  # Some models support it
        self.default_model = "codellama"
        self.available_models = []

        self.base_url = (base_url or settings.OLLAMA_URL).rstrip('/')

    async def is_available(self) -> bool:
        """Check if Ollama is running"""
        if not settings.OLLAMA_ENABLED:
            return False

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except Exception:
            return False

    async def get_models(self) -> List[str]:
        """Get models available in Ollama"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                if response.status_code == 200:
                    data = response.json()
                    models = [m["name"] for m in data.get("models", [])]
                    self.available_models = models
                    if models and self.default_model not in models:
                        self.default_model = models[0]
                    return models
        except Exception as e:
            logger.warning(f"Failed to get Ollama models: {e}")
        return []

    def _format_messages(self, messages: List[AIMessage]) -> List[Dict[str, Any]]:
        """Format messages for Ollama API"""
        formatted = []
        for msg in messages:
            if msg.role == "tool":
                # Tool results - format as user message with context
                formatted.append({
                    "role": "user",
                    "content": f"Tool result for {msg.tool_call_id}:\n{msg.content}"
                })
            elif msg.tool_calls:
                # Assistant with tool calls
                content = msg.content or ""
                for tc in msg.tool_calls:
                    content += f"\n\nCalling tool: {tc['name']}\nArguments: {json.dumps(tc['arguments'])}"
                formatted.append({
                    "role": "assistant",
                    "content": content
                })
            else:
                formatted.append({
                    "role": msg.role,
                    "content": msg.content
                })
        return formatted

    def _format_tools(self, tools: Optional[List[ToolDefinition]]) -> Optional[List[Dict[str, Any]]]:
        """Format tools for Ollama API"""
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

    def _parse_tool_calls_from_content(self, content: str) -> Optional[List[ToolCall]]:
        """Try to parse tool calls from content (for models that output JSON)"""
        # Look for JSON tool call patterns in the response
        import re

        # Pattern for function calls in various formats
        patterns = [
            r'\{"function":\s*"(\w+)",\s*"arguments":\s*(\{[^}]+\})\}',
            r'<tool_call>\s*(\w+)\s*(\{[^}]+\})\s*</tool_call>',
        ]

        tool_calls = []
        for pattern in patterns:
            matches = re.findall(pattern, content)
            for i, match in enumerate(matches):
                try:
                    name = match[0]
                    args = json.loads(match[1]) if isinstance(match[1], str) else match[1]
                    tool_calls.append(ToolCall(
                        id=f"ollama_{i}",
                        name=name,
                        arguments=args
                    ))
                except (json.JSONDecodeError, IndexError):
                    continue

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
        """Send completion request to Ollama"""
        if not self.available_models:
            await self.get_models()

        model = model or self.default_model
        formatted_messages = self._format_messages(messages)
        formatted_tools = self._format_tools(tools)

        # Add system prompt
        if system_prompt:
            formatted_messages.insert(0, {
                "role": "system",
                "content": system_prompt
            })

        # If tools are provided, add instructions to the system prompt
        if formatted_tools:
            tool_instructions = self._create_tool_instructions(formatted_tools)
            if formatted_messages and formatted_messages[0]["role"] == "system":
                formatted_messages[0]["content"] += f"\n\n{tool_instructions}"
            else:
                formatted_messages.insert(0, {
                    "role": "system",
                    "content": tool_instructions
                })

        request_body = {
            "model": model,
            "messages": formatted_messages,
            "stream": False,
            "options": {
                "num_predict": max_tokens,
                "temperature": temperature
            }
        }

        # Add native tools if supported
        if formatted_tools:
            request_body["tools"] = formatted_tools

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json=request_body
                )
                response.raise_for_status()
                data = response.json()

                content = data.get("message", {}).get("content", "")

                # Check for native tool calls first
                tool_calls = None
                native_tool_calls = data.get("message", {}).get("tool_calls")
                if native_tool_calls:
                    tool_calls = [
                        ToolCall(
                            id=f"ollama_{i}",
                            name=tc.get("function", {}).get("name", ""),
                            arguments=tc.get("function", {}).get("arguments", {})
                        )
                        for i, tc in enumerate(native_tool_calls)
                    ]
                else:
                    # Try to parse from content
                    tool_calls = self._parse_tool_calls_from_content(content)

                return AIResponse(
                    content=content,
                    model=model,
                    provider=AIProviderType.OLLAMA,
                    tool_calls=tool_calls,
                    finish_reason="tool_use" if tool_calls else "stop",
                    usage={
                        "prompt_tokens": data.get("prompt_eval_count", 0),
                        "completion_tokens": data.get("eval_count", 0),
                        "total_tokens": data.get("prompt_eval_count", 0) + data.get("eval_count", 0)
                    }
                )
        except Exception as e:
            logger.error(f"Ollama completion error: {e}")
            raise

    def _create_tool_instructions(self, tools: List[Dict[str, Any]]) -> str:
        """Create instructions for tool use"""
        tool_desc = "You have access to the following tools:\n\n"
        for tool in tools:
            func = tool.get("function", {})
            tool_desc += f"- {func.get('name')}: {func.get('description')}\n"
            tool_desc += f"  Parameters: {json.dumps(func.get('parameters', {}))}\n\n"

        tool_desc += """
When you need to use a tool, respond with a JSON object in this format:
{"function": "tool_name", "arguments": {"arg1": "value1"}}

Only use tools when necessary. Provide your response after tool results.
"""
        return tool_desc

    async def stream(
        self,
        messages: List[AIMessage],
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        tools: Optional[List[ToolDefinition]] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AsyncGenerator[StreamDelta, None]:
        """Stream completion from Ollama"""
        if not self.available_models:
            await self.get_models()

        model = model or self.default_model
        formatted_messages = self._format_messages(messages)
        formatted_tools = self._format_tools(tools)

        # Add system prompt
        if system_prompt:
            formatted_messages.insert(0, {
                "role": "system",
                "content": system_prompt
            })

        # Add tool instructions if needed
        if formatted_tools:
            tool_instructions = self._create_tool_instructions(formatted_tools)
            if formatted_messages and formatted_messages[0]["role"] == "system":
                formatted_messages[0]["content"] += f"\n\n{tool_instructions}"
            else:
                formatted_messages.insert(0, {
                    "role": "system",
                    "content": tool_instructions
                })

        request_body = {
            "model": model,
            "messages": formatted_messages,
            "stream": True,
            "options": {
                "num_predict": max_tokens,
                "temperature": temperature
            }
        }

        if formatted_tools:
            request_body["tools"] = formatted_tools

        try:
            accumulated_content = ""

            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/api/chat",
                    json=request_body
                ) as response:
                    async for line in response.aiter_lines():
                        if not line:
                            continue

                        try:
                            data = json.loads(line)

                            # Check for native tool calls
                            if data.get("message", {}).get("tool_calls"):
                                for tc in data["message"]["tool_calls"]:
                                    yield StreamDelta(
                                        type="tool_call_start",
                                        tool_call={
                                            "id": f"ollama_{tc.get('id', '0')}",
                                            "name": tc.get("function", {}).get("name", ""),
                                            "arguments": json.dumps(tc.get("function", {}).get("arguments", {}))
                                        }
                                    )
                                    yield StreamDelta(
                                        type="tool_call_end",
                                        tool_call={
                                            "id": f"ollama_{tc.get('id', '0')}",
                                            "name": tc.get("function", {}).get("name", ""),
                                            "arguments": json.dumps(tc.get("function", {}).get("arguments", {}))
                                        }
                                    )

                            # Text content
                            content = data.get("message", {}).get("content", "")
                            if content:
                                accumulated_content += content
                                yield StreamDelta(
                                    type="text",
                                    text=content
                                )

                            # Check if done
                            if data.get("done"):
                                # Try to parse tool calls from accumulated content
                                tool_calls = self._parse_tool_calls_from_content(accumulated_content)
                                if tool_calls:
                                    for tc in tool_calls:
                                        yield StreamDelta(
                                            type="tool_call_start",
                                            tool_call={
                                                "id": tc.id,
                                                "name": tc.name,
                                                "arguments": json.dumps(tc.arguments)
                                            }
                                        )
                                        yield StreamDelta(
                                            type="tool_call_end",
                                            tool_call={
                                                "id": tc.id,
                                                "name": tc.name,
                                                "arguments": json.dumps(tc.arguments)
                                            }
                                        )
                                break

                        except json.JSONDecodeError:
                            continue

        except Exception as e:
            logger.error(f"Ollama streaming error: {e}")
            raise
