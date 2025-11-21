"""
Config Command - Configuration management
"""

import typer
from rich.console import Console
from rich.table import Table
from typing import Optional
from pathlib import Path

from martin_coder.core.config import get_config, save_config

app = typer.Typer()
console = Console()


@app.command("show")
def show_config():
    """Show current configuration"""
    config = get_config()

    table = Table(title="Configuration")
    table.add_column("Setting", style="cyan")
    table.add_column("Value")

    table.add_row("Config Path", str(config.config_path) if config.config_path else "Not set")
    table.add_row("Default Provider", config.default_provider)
    table.add_row("Default Model", config.default_model)
    table.add_row("Anthropic API Key", "***" if config.anthropic_api_key else "Not set")
    table.add_row("OpenAI API Key", "***" if config.openai_api_key else "Not set")
    table.add_row("LM Studio URL", config.lmstudio_url)
    table.add_row("LM Studio Enabled", str(config.lmstudio_enabled))
    table.add_row("Ollama URL", config.ollama_url)
    table.add_row("Ollama Enabled", str(config.ollama_enabled))

    console.print(table)


@app.command("set")
def set_config(
    key: str = typer.Argument(..., help="Configuration key"),
    value: str = typer.Argument(..., help="Configuration value"),
):
    """Set a configuration value"""
    config = get_config()

    valid_keys = [
        "default_provider", "default_model",
        "anthropic_api_key", "openai_api_key",
        "lmstudio_url", "lmstudio_enabled",
        "ollama_url", "ollama_enabled"
    ]

    if key not in valid_keys:
        console.print(f"[red]Invalid key: {key}[/red]")
        console.print(f"Valid keys: {', '.join(valid_keys)}")
        raise typer.Exit(1)

    # Handle boolean values
    if key in ("lmstudio_enabled", "ollama_enabled"):
        value = value.lower() in ("true", "1", "yes")

    setattr(config, key, value)
    save_config(config)

    console.print(f"[green]Set {key} = {value}[/green]")


@app.command("init")
def init_config():
    """Initialize configuration interactively"""
    console.print("[bold]Martin-Coder Configuration Setup[/bold]\n")

    config = get_config()

    # Default provider
    provider = typer.prompt(
        "Default AI provider (claude/openai/lmstudio/ollama)",
        default=config.default_provider
    )
    config.default_provider = provider

    # API Keys
    if typer.confirm("Configure Anthropic (Claude)?", default=bool(config.anthropic_api_key)):
        api_key = typer.prompt("Anthropic API Key", hide_input=True)
        if api_key:
            config.anthropic_api_key = api_key

    if typer.confirm("Configure OpenAI?", default=bool(config.openai_api_key)):
        api_key = typer.prompt("OpenAI API Key", hide_input=True)
        if api_key:
            config.openai_api_key = api_key

    # Local providers
    if typer.confirm("Enable LM Studio?", default=config.lmstudio_enabled):
        config.lmstudio_enabled = True
        config.lmstudio_url = typer.prompt("LM Studio URL", default=config.lmstudio_url)
    else:
        config.lmstudio_enabled = False

    if typer.confirm("Enable Ollama?", default=config.ollama_enabled):
        config.ollama_enabled = True
        config.ollama_url = typer.prompt("Ollama URL", default=config.ollama_url)
    else:
        config.ollama_enabled = False

    # Save
    save_config(config)
    console.print("\n[green]Configuration saved![/green]")


@app.command("path")
def show_path():
    """Show configuration file path"""
    config_path = Path.home() / ".martin-coder" / "config.json"
    console.print(f"Configuration file: {config_path}")
    console.print(f"Exists: {config_path.exists()}")
