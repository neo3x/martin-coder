"""
AI Router - Routes requests to appropriate AI providers
"""

from typing import AsyncGenerator, List, Optional, Dict, Any
import logging
import asyncio

from app.core.config import settings
from app.services.ai.providers.base import BaseProvider
from app.services.ai.providers.claude import ClaudeProvider
from app.services.ai.providers.openai import OpenAIProvider
from app.services.ai.providers.lmstudio import LMStudioProvider
from app.services.ai.providers.ollama import OllamaProvider
from app.schemas.ai import (
    AIProviderType,
    AIRequest,
    AIResponse,
    AIMessage,
    ToolDefinition,
    StreamDelta,
    AIProvider as AIProviderSchema
)

logger = logging.getLogger(__name__)


class AIRouter:
    """Routes AI requests to the appropriate provider"""

    def __init__(self):
        self._providers: Dict[str, BaseProvider] = {}
        self._initialize_providers()

    def _initialize_providers(self):
        """Initialize all configured providers"""
        # Claude
        if settings.ANTHROPIC_API_KEY:
            self._providers["claude"] = ClaudeProvider()
            logger.info("Claude provider initialized")

        # OpenAI
        if settings.OPENAI_API_KEY:
            self._providers["openai"] = OpenAIProvider()
            logger.info("OpenAI provider initialized")

        # LM Studio
        if settings.LMSTUDIO_ENABLED:
            self._providers["lmstudio"] = LMStudioProvider()
            logger.info("LM Studio provider initialized")

        # Ollama
        if settings.OLLAMA_ENABLED:
            self._providers["ollama"] = OllamaProvider()
            logger.info("Ollama provider initialized")

    def get_provider(self, provider_name: str) -> BaseProvider:
        """Get a specific provider"""
        if provider_name not in self._providers:
            raise ValueError(f"Provider '{provider_name}' not available")
        return self._providers[provider_name]

    async def get_available_providers(self) -> List[AIProviderSchema]:
        """Get all available providers with their status"""
        providers = []

        for name, provider in self._providers.items():
            is_available = await provider.is_available()
            models = await provider.get_models() if is_available else []

            providers.append(AIProviderSchema(
                name=name,
                type=AIProviderType(name),
                is_available=is_available,
                is_local=provider.is_local,
                models=models,
                default_model=provider.default_model
            ))

        return providers

    async def health_check(self) -> Dict[str, Any]:
        """Check health of all providers"""
        results = {}

        checks = [
            provider.health_check()
            for provider in self._providers.values()
        ]

        health_results = await asyncio.gather(*checks, return_exceptions=True)

        for provider_name, result in zip(self._providers.keys(), health_results):
            if isinstance(result, Exception):
                results[provider_name] = {
                    "is_available": False,
                    "error": str(result)
                }
            else:
                results[provider_name] = result

        return results

    def select_provider(
        self,
        preferred: Optional[str] = None,
        require_tools: bool = False,
        require_vision: bool = False,
        prefer_local: bool = False
    ) -> str:
        """Intelligently select the best provider"""
        if preferred and preferred in self._providers:
            return preferred

        # Filter by requirements
        candidates = []
        for name, provider in self._providers.items():
            if require_tools and not provider.supports_tools:
                continue
            if require_vision and not provider.supports_vision:
                continue
            candidates.append((name, provider))

        if not candidates:
            raise ValueError("No provider meets the requirements")

        # Sort by preference
        def score(item):
            name, provider = item
            s = 0
            if prefer_local and provider.is_local:
                s += 10
            if not prefer_local and not provider.is_local:
                s += 5
            # Prefer Claude for complex tasks
            if name == "claude":
                s += 3
            return s

        candidates.sort(key=score, reverse=True)
        return candidates[0][0]

    async def complete(
        self,
        messages: List[AIMessage],
        provider: Optional[str] = None,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        tools: Optional[List[ToolDefinition]] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AIResponse:
        """Send a completion request"""
        provider_name = self.select_provider(
            preferred=provider,
            require_tools=tools is not None
        )

        provider_instance = self.get_provider(provider_name)

        return await provider_instance.complete(
            messages=messages,
            model=model,
            system_prompt=system_prompt,
            tools=tools,
            max_tokens=max_tokens,
            temperature=temperature
        )

    async def stream(
        self,
        messages: List[AIMessage],
        provider: Optional[str] = None,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        tools: Optional[List[ToolDefinition]] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AsyncGenerator[StreamDelta, None]:
        """Stream a completion request"""
        provider_name = self.select_provider(
            preferred=provider,
            require_tools=tools is not None
        )

        provider_instance = self.get_provider(provider_name)

        async for delta in provider_instance.stream(
            messages=messages,
            model=model,
            system_prompt=system_prompt,
            tools=tools,
            max_tokens=max_tokens,
            temperature=temperature
        ):
            yield delta


# Global router instance
ai_router = AIRouter()
