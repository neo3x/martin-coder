"""
AI Client for CLI
"""

from typing import Generator, Optional, List, Dict, Any
from abc import ABC, abstractmethod

from martin_coder.core.config import get_config


class AIClient(ABC):
    """Abstract AI client"""

    @abstractmethod
    def stream_chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None
    ) -> Generator[str, None, None]:
        """Stream chat completion"""
        pass

    @abstractmethod
    def complete(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None
    ) -> str:
        """Get complete response"""
        pass


class ClaudeClient(AIClient):
    """Anthropic Claude client"""

    def __init__(self, api_key: str, model: str):
        import anthropic
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model

    def stream_chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None
    ) -> Generator[str, None, None]:
        kwargs = {
            "model": self.model,
            "messages": messages,
            "max_tokens": 4096,
        }
        if system_prompt:
            kwargs["system"] = system_prompt

        with self.client.messages.stream(**kwargs) as stream:
            for text in stream.text_stream:
                yield text

    def complete(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None
    ) -> str:
        kwargs = {
            "model": self.model,
            "messages": messages,
            "max_tokens": 4096,
        }
        if system_prompt:
            kwargs["system"] = system_prompt

        response = self.client.messages.create(**kwargs)
        return response.content[0].text


class OpenAIClient(AIClient):
    """OpenAI client"""

    def __init__(self, api_key: str, model: str, base_url: Optional[str] = None):
        from openai import OpenAI
        kwargs = {"api_key": api_key}
        if base_url:
            kwargs["base_url"] = base_url
        self.client = OpenAI(**kwargs)
        self.model = model

    def stream_chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None
    ) -> Generator[str, None, None]:
        msgs = list(messages)
        if system_prompt:
            msgs.insert(0, {"role": "system", "content": system_prompt})

        stream = self.client.chat.completions.create(
            model=self.model,
            messages=msgs,
            stream=True
        )

        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def complete(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None
    ) -> str:
        msgs = list(messages)
        if system_prompt:
            msgs.insert(0, {"role": "system", "content": system_prompt})

        response = self.client.chat.completions.create(
            model=self.model,
            messages=msgs
        )
        return response.choices[0].message.content


class OllamaClient(AIClient):
    """Ollama client"""

    def __init__(self, base_url: str, model: str):
        import httpx
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.client = httpx.Client(timeout=120.0)

    def stream_chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None
    ) -> Generator[str, None, None]:
        import json

        msgs = list(messages)
        if system_prompt:
            msgs.insert(0, {"role": "system", "content": system_prompt})

        with self.client.stream(
            "POST",
            f"{self.base_url}/api/chat",
            json={"model": self.model, "messages": msgs, "stream": True}
        ) as response:
            for line in response.iter_lines():
                if line:
                    try:
                        data = json.loads(line)
                        content = data.get("message", {}).get("content", "")
                        if content:
                            yield content
                    except json.JSONDecodeError:
                        continue

    def complete(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None
    ) -> str:
        result = ""
        for chunk in self.stream_chat(messages, system_prompt):
            result += chunk
        return result


def get_ai_client(provider: str, model: Optional[str] = None) -> AIClient:
    """Get AI client for provider"""
    config = get_config()

    if provider == "claude":
        if not config.anthropic_api_key:
            raise ValueError("Anthropic API key not configured")
        return ClaudeClient(
            api_key=config.anthropic_api_key,
            model=model or "claude-sonnet-4-5-20250929"
        )

    elif provider == "openai":
        if not config.openai_api_key:
            raise ValueError("OpenAI API key not configured")
        return OpenAIClient(
            api_key=config.openai_api_key,
            model=model or "gpt-4o"
        )

    elif provider == "lmstudio":
        return OpenAIClient(
            api_key="lm-studio",
            model=model or "local-model",
            base_url=config.lmstudio_url
        )

    elif provider == "ollama":
        return OllamaClient(
            base_url=config.ollama_url,
            model=model or "codellama"
        )

    else:
        raise ValueError(f"Unknown provider: {provider}")
