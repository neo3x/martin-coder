"""
Configuration Management
"""

from dataclasses import dataclass, field
from typing import Optional
from pathlib import Path
import json
import os


@dataclass
class Config:
    """CLI Configuration"""
    config_path: Optional[Path] = None

    # Default AI settings
    default_provider: str = "claude"
    default_model: str = "claude-sonnet-4-5-20250929"

    # API Keys
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None

    # Local providers
    lmstudio_url: str = "http://localhost:1234/v1"
    lmstudio_enabled: bool = True
    ollama_url: str = "http://localhost:11434"
    ollama_enabled: bool = True


def get_config_path() -> Path:
    """Get configuration file path"""
    return Path.home() / ".martin-coder" / "config.json"


def get_config() -> Config:
    """Load configuration"""
    config = Config()

    # Load from environment first
    config.anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY")
    config.openai_api_key = os.environ.get("OPENAI_API_KEY")
    config.lmstudio_url = os.environ.get("LMSTUDIO_URL", config.lmstudio_url)
    config.ollama_url = os.environ.get("OLLAMA_URL", config.ollama_url)

    if os.environ.get("DEFAULT_AI_PROVIDER"):
        config.default_provider = os.environ["DEFAULT_AI_PROVIDER"]
    if os.environ.get("DEFAULT_AI_MODEL"):
        config.default_model = os.environ["DEFAULT_AI_MODEL"]

    # Load from config file
    config_path = get_config_path()
    if config_path.exists():
        try:
            with open(config_path) as f:
                data = json.load(f)

            config.config_path = config_path

            # Only override if not already set from env
            if not config.anthropic_api_key and data.get("anthropic_api_key"):
                config.anthropic_api_key = data["anthropic_api_key"]
            if not config.openai_api_key and data.get("openai_api_key"):
                config.openai_api_key = data["openai_api_key"]

            if data.get("default_provider"):
                config.default_provider = data["default_provider"]
            if data.get("default_model"):
                config.default_model = data["default_model"]
            if data.get("lmstudio_url"):
                config.lmstudio_url = data["lmstudio_url"]
            if "lmstudio_enabled" in data:
                config.lmstudio_enabled = data["lmstudio_enabled"]
            if data.get("ollama_url"):
                config.ollama_url = data["ollama_url"]
            if "ollama_enabled" in data:
                config.ollama_enabled = data["ollama_enabled"]

        except Exception:
            pass

    return config


def save_config(config: Config):
    """Save configuration to file"""
    config_path = get_config_path()
    config_path.parent.mkdir(parents=True, exist_ok=True)

    data = {
        "default_provider": config.default_provider,
        "default_model": config.default_model,
        "anthropic_api_key": config.anthropic_api_key,
        "openai_api_key": config.openai_api_key,
        "lmstudio_url": config.lmstudio_url,
        "lmstudio_enabled": config.lmstudio_enabled,
        "ollama_url": config.ollama_url,
        "ollama_enabled": config.ollama_enabled,
    }

    with open(config_path, "w") as f:
        json.dump(data, f, indent=2)

    config.config_path = config_path
