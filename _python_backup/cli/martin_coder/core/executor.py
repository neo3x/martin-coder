"""
Command Executor
"""

import subprocess
import sys
from pathlib import Path
from rich.console import Console

console = Console()


def execute_command(command: str, sandbox: bool = True):
    """Execute a shell command"""
    console.print(f"[bold]Executing:[/bold] {command}\n")

    try:
        # For now, run directly (sandbox would use Docker)
        process = subprocess.Popen(
            command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            cwd=Path.cwd()
        )

        # Stream output
        for line in iter(process.stdout.readline, ""):
            console.print(line, end="")

        process.wait()

        if process.returncode == 0:
            console.print("\n[green]Command completed successfully[/green]")
        else:
            console.print(f"\n[red]Command failed with code {process.returncode}[/red]")

        return process.returncode

    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        return 1
