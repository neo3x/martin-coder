"""
Martin-Coder CLI - Main entry point
"""

import typer
from rich.console import Console
from rich.panel import Panel
from typing import Optional

from martin_coder import __version__
from martin_coder.commands import chat, project, config, generate
from martin_coder.i18n import (
    t, init_locale, get_current_locale,
    load_language_preference, select_language_prompt,
    LOCALE_NAMES, LOCALES
)

app = typer.Typer(
    name="martin-coder",
    help="AI-powered code generation and editing CLI",
    add_completion=True,
)
console = Console()

# Register sub-commands
app.add_typer(chat.app, name="chat", help="Interactive chat with AI")
app.add_typer(project.app, name="project", help="Project management commands")
app.add_typer(config.app, name="config", help="Configuration management")
app.add_typer(generate.app, name="generate", help="Generate code")


def version_callback(value: bool):
    if value:
        console.print(f"[bold blue]Martin-Coder CLI[/bold blue] {t('app.version')} {__version__}")
        raise typer.Exit()


def language_callback(value: Optional[str]):
    if value:
        if value in LOCALES:
            init_locale(value)
            from martin_coder.i18n import save_language_preference
            save_language_preference(value)
            console.print(f"[green]{t('language.changed', lang=LOCALE_NAMES[value])}[/green]")
        else:
            console.print(f"[red]Invalid language. Available: {', '.join(LOCALES)}[/red]")
        raise typer.Exit()


def _init_language():
    """Initialize language from saved preference or prompt user."""
    saved_locale = load_language_preference()
    if saved_locale:
        init_locale(saved_locale)
    else:
        # First run - prompt for language selection
        select_language_prompt()


@app.callback()
def main(
    version: bool = typer.Option(
        False,
        "--version",
        "-v",
        callback=version_callback,
        is_eager=True,
        help="Show version and exit"
    ),
    language: Optional[str] = typer.Option(
        None,
        "--language",
        "--lang",
        "-l",
        callback=language_callback,
        is_eager=True,
        help="Set language (en/es)"
    ),
):
    """Martin-Coder - AI-powered code generation and editing CLI"""
    _init_language()


@app.command()
def init(
    path: str = typer.Argument(".", help="Project path to initialize"),
    name: Optional[str] = typer.Option(None, "--name", "-n", help="Project name"),
):
    """Initialize a new project or register existing one"""
    from martin_coder.commands.project import init_project
    init_project(path, name)


@app.command()
def ask(
    question: str = typer.Argument(..., help="Question to ask the AI"),
    provider: str = typer.Option("claude", "--provider", "-p", help="AI provider"),
    model: Optional[str] = typer.Option(None, "--model", "-m", help="Model to use"),
):
    """Ask a quick question to the AI"""
    from martin_coder.commands.chat import quick_ask
    quick_ask(question, provider, model)


@app.command()
def run(
    command: str = typer.Argument(..., help="Command to execute"),
    sandbox: bool = typer.Option(True, "--sandbox/--no-sandbox", help="Run in sandbox"),
):
    """Execute a command in the project directory"""
    from martin_coder.core.executor import execute_command
    execute_command(command, sandbox)


@app.command()
def status():
    """Show current project and configuration status"""
    from martin_coder.core.config import get_config
    from pathlib import Path

    cfg = get_config()

    console.print(Panel.fit(
        f"""[bold]{t('status.title')}[/bold]

[cyan]{t('status.working_directory')}:[/cyan] {Path.cwd()}
[cyan]{t('status.config_file')}:[/cyan] {cfg.config_path or t('status.not_found')}
[cyan]{t('status.default_provider')}:[/cyan] {cfg.default_provider}
[cyan]{t('status.default_model')}:[/cyan] {cfg.default_model}
[cyan]{t('language.current', lang=LOCALE_NAMES[get_current_locale()])}[/cyan]

[bold]{t('status.configured_providers')}:[/bold]
  Claude: {'✓' if cfg.anthropic_api_key else '✗'}
  OpenAI: {'✓' if cfg.openai_api_key else '✗'}
  LM Studio: {'✓' if cfg.lmstudio_enabled else '✗'}
  Ollama: {'✓' if cfg.ollama_enabled else '✗'}
""",
        title=t('status.title'),
        border_style="blue"
    ))


if __name__ == "__main__":
    app()
