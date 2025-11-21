"""
Martin-Coder CLI - Main entry point
"""

import typer
from rich.console import Console
from rich.panel import Panel
from typing import Optional

from martin_coder import __version__
from martin_coder.commands import chat, project, config, generate

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
        console.print(f"[bold blue]Martin-Coder CLI[/bold blue] version {__version__}")
        raise typer.Exit()


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
):
    """Martin-Coder - AI-powered code generation and editing CLI"""
    pass


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

    config = get_config()

    console.print(Panel.fit(
        f"""[bold]Martin-Coder Status[/bold]

[cyan]Working Directory:[/cyan] {Path.cwd()}
[cyan]Config File:[/cyan] {config.config_path or 'Not found'}
[cyan]Default Provider:[/cyan] {config.default_provider}
[cyan]Default Model:[/cyan] {config.default_model}

[bold]Configured Providers:[/bold]
  Claude: {'✓' if config.anthropic_api_key else '✗'}
  OpenAI: {'✓' if config.openai_api_key else '✗'}
  LM Studio: {'✓' if config.lmstudio_enabled else '✗'}
  Ollama: {'✓' if config.ollama_enabled else '✗'}
""",
        title="Status",
        border_style="blue"
    ))


if __name__ == "__main__":
    app()
