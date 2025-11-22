"""
Internationalization module for Martin-Coder CLI
"""

import json
from pathlib import Path
from typing import Optional
from functools import lru_cache

# Available locales
LOCALES = ["en", "es"]
DEFAULT_LOCALE = "en"

# Translations storage
_translations: dict = {}
_current_locale: str = DEFAULT_LOCALE


def load_translations(locale: str) -> dict:
    """Load translations for a specific locale."""
    translations_dir = Path(__file__).parent / "translations"
    translation_file = translations_dir / f"{locale}.json"

    if translation_file.exists():
        with open(translation_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def init_locale(locale: Optional[str] = None) -> str:
    """Initialize the locale. Returns the active locale."""
    global _translations, _current_locale

    if locale and locale in LOCALES:
        _current_locale = locale
    else:
        # Try to get from environment or config
        import os
        env_locale = os.environ.get("MARTIN_CODER_LANG", "").lower()
        if env_locale in LOCALES:
            _current_locale = env_locale
        else:
            _current_locale = DEFAULT_LOCALE

    _translations = load_translations(_current_locale)
    return _current_locale


def get_current_locale() -> str:
    """Get the current locale."""
    return _current_locale


def t(key: str, **kwargs) -> str:
    """
    Get translation for a key.

    Args:
        key: Dot-notation key (e.g., "common.loading")
        **kwargs: Format arguments

    Returns:
        Translated string or key if not found
    """
    global _translations

    if not _translations:
        init_locale()

    # Navigate nested keys
    keys = key.split(".")
    value = _translations

    for k in keys:
        if isinstance(value, dict) and k in value:
            value = value[k]
        else:
            return key  # Return key if translation not found

    if isinstance(value, str):
        try:
            return value.format(**kwargs) if kwargs else value
        except KeyError:
            return value

    return key


def select_language_prompt() -> str:
    """Show language selection prompt and return selected locale."""
    from rich.console import Console
    from rich.prompt import Prompt

    console = Console()

    console.print("\n[bold]Select Language / Seleccionar Idioma:[/bold]")
    console.print("  [cyan]1.[/cyan] English")
    console.print("  [cyan]2.[/cyan] Español")

    choice = Prompt.ask("\nChoice / Opción", choices=["1", "2"], default="1")

    locale = "en" if choice == "1" else "es"
    init_locale(locale)

    # Save preference
    save_language_preference(locale)

    return locale


def save_language_preference(locale: str):
    """Save language preference to config."""
    from martin_coder.core.config import get_config_path

    config_dir = get_config_path().parent  # Get the .martin-coder directory
    config_file = config_dir / "language"

    config_dir.mkdir(parents=True, exist_ok=True)
    config_file.write_text(locale)


def load_language_preference() -> Optional[str]:
    """Load saved language preference."""
    from martin_coder.core.config import get_config_path

    config_dir = get_config_path().parent  # Get the .martin-coder directory
    config_file = config_dir / "language"

    if config_file.exists():
        locale = config_file.read_text().strip()
        if locale in LOCALES:
            return locale
    return None


# Locale display names
LOCALE_NAMES = {
    "en": "English",
    "es": "Español",
}
