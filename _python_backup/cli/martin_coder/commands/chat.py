"""
Chat Command - Interactive AI chat
"""

import typer
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.live import Live
from typing import Optional
from prompt_toolkit import prompt
from prompt_toolkit.history import FileHistory
from pathlib import Path

from martin_coder.core.config import get_config
from martin_coder.core.ai import get_ai_client

app = typer.Typer()
console = Console()


@app.command("start")
def start_chat(
    provider: str = typer.Option(None, "--provider", "-p", help="AI provider"),
    model: Optional[str] = typer.Option(None, "--model", "-m", help="Model to use"),
    project: Optional[str] = typer.Option(None, "--project", help="Project path"),
):
    """Start an interactive chat session"""
    config = get_config()
    provider = provider or config.default_provider
    model = model or config.default_model

    console.print(Panel.fit(
        f"[bold blue]Martin-Coder Chat[/bold blue]\n"
        f"Provider: {provider} | Model: {model}\n"
        f"Type 'exit' or 'quit' to end the session\n"
        f"Type '/help' for commands",
        border_style="blue"
    ))

    # Initialize AI client
    ai_client = get_ai_client(provider, model)

    # Chat history
    messages = []
    history_file = Path.home() / ".martin-coder" / "chat_history"
    history_file.parent.mkdir(parents=True, exist_ok=True)

    # System prompt
    system_prompt = """You are Martin-Coder, an expert AI coding assistant. You help users with:
- Writing, editing, and debugging code
- Creating project architectures
- Explaining code and concepts
- Reviewing and improving code

Be concise but thorough. Use markdown for code blocks."""

    while True:
        try:
            # Get user input
            user_input = prompt(
                "\n[You] > ",
                history=FileHistory(str(history_file)),
                multiline=False
            ).strip()

            if not user_input:
                continue

            # Handle commands
            if user_input.lower() in ("exit", "quit", "/exit", "/quit"):
                console.print("\n[yellow]Goodbye![/yellow]")
                break

            if user_input.startswith("/"):
                handle_command(user_input, messages)
                continue

            # Add user message
            messages.append({"role": "user", "content": user_input})

            # Get AI response with streaming
            console.print("\n[Assistant]")

            response_content = ""
            with Live(console=console, refresh_per_second=10) as live:
                for chunk in ai_client.stream_chat(messages, system_prompt):
                    response_content += chunk
                    live.update(Markdown(response_content))

            # Add assistant message
            messages.append({"role": "assistant", "content": response_content})

        except KeyboardInterrupt:
            console.print("\n[yellow]Use 'exit' to quit[/yellow]")
        except Exception as e:
            console.print(f"\n[red]Error: {e}[/red]")


def handle_command(command: str, messages: list):
    """Handle chat commands"""
    cmd = command.lower().split()[0]

    if cmd == "/help":
        console.print(Panel.fit(
            """[bold]Available Commands:[/bold]

/help     - Show this help
/clear    - Clear chat history
/save     - Save chat to file
/load     - Load chat from file
/model    - Change AI model
/exit     - Exit chat""",
            title="Help",
            border_style="green"
        ))
    elif cmd == "/clear":
        messages.clear()
        console.print("[green]Chat history cleared[/green]")
    elif cmd == "/save":
        save_chat(messages)
    else:
        console.print(f"[yellow]Unknown command: {cmd}[/yellow]")


def save_chat(messages: list):
    """Save chat to file"""
    import json
    from datetime import datetime

    filename = f"chat_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, "w") as f:
        json.dump(messages, f, indent=2)
    console.print(f"[green]Chat saved to {filename}[/green]")


def quick_ask(question: str, provider: str, model: Optional[str]):
    """Quick one-shot question"""
    config = get_config()
    model = model or config.default_model

    ai_client = get_ai_client(provider, model)

    messages = [{"role": "user", "content": question}]

    console.print("\n[bold]Answer:[/bold]\n")

    response = ""
    with Live(console=console, refresh_per_second=10) as live:
        for chunk in ai_client.stream_chat(messages):
            response += chunk
            live.update(Markdown(response))

    console.print()
