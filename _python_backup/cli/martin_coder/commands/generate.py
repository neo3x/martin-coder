"""
Generate Command - Code generation
"""

import typer
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.live import Live
from typing import Optional
from pathlib import Path

from martin_coder.core.config import get_config
from martin_coder.core.ai import get_ai_client

app = typer.Typer()
console = Console()


@app.command("code")
def generate_code(
    prompt: str = typer.Argument(..., help="Description of what to generate"),
    output: Optional[str] = typer.Option(None, "--output", "-o", help="Output file path"),
    language: Optional[str] = typer.Option(None, "--language", "-l", help="Programming language"),
    provider: str = typer.Option(None, "--provider", "-p", help="AI provider"),
):
    """Generate code from a description"""
    config = get_config()
    provider = provider or config.default_provider

    ai_client = get_ai_client(provider, config.default_model)

    # Build prompt
    system_prompt = """You are an expert programmer. Generate clean, well-documented code based on the user's requirements.
Follow best practices and include comments where helpful.
Only output the code, no explanations before or after unless specifically asked."""

    if language:
        system_prompt += f"\n\nGenerate code in {language}."

    messages = [{"role": "user", "content": prompt}]

    console.print(f"\n[bold]Generating code...[/bold]\n")

    response = ""
    with Live(console=console, refresh_per_second=10) as live:
        for chunk in ai_client.stream_chat(messages, system_prompt):
            response += chunk
            live.update(Markdown(response))

    # Save to file if specified
    if output:
        output_path = Path(output)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Extract code from response
        code = extract_code(response)

        with open(output_path, "w") as f:
            f.write(code)

        console.print(f"\n[green]Code saved to: {output_path}[/green]")


@app.command("project")
def generate_project(
    description: str = typer.Argument(..., help="Project description"),
    output: str = typer.Option(".", "--output", "-o", help="Output directory"),
    provider: str = typer.Option(None, "--provider", "-p", help="AI provider"),
):
    """Generate a complete project structure"""
    config = get_config()
    provider = provider or config.default_provider

    ai_client = get_ai_client(provider, config.default_model)

    system_prompt = """You are an expert software architect. Generate a complete project structure based on the user's requirements.
Output a JSON object with the following structure:
{
  "name": "project-name",
  "files": [
    {"path": "relative/path/to/file.ext", "content": "file content here"},
    ...
  ]
}
Include all necessary files: source code, configuration, README, etc."""

    messages = [{"role": "user", "content": description}]

    console.print(f"\n[bold]Generating project structure...[/bold]\n")

    response = ""
    for chunk in ai_client.stream_chat(messages, system_prompt):
        response += chunk
        console.print(".", end="")

    console.print("\n")

    # Parse and create project
    try:
        import json
        project_data = json.loads(extract_json(response))

        output_path = Path(output) / project_data.get("name", "project")
        output_path.mkdir(parents=True, exist_ok=True)

        for file_info in project_data.get("files", []):
            file_path = output_path / file_info["path"]
            file_path.parent.mkdir(parents=True, exist_ok=True)

            with open(file_path, "w") as f:
                f.write(file_info["content"])

            console.print(f"  Created: {file_info['path']}")

        console.print(f"\n[green]Project created at: {output_path}[/green]")

    except Exception as e:
        console.print(f"[red]Error creating project: {e}[/red]")
        console.print("\n[yellow]Raw response:[/yellow]")
        console.print(response)


@app.command("readme")
def generate_readme(
    path: str = typer.Argument(".", help="Project path"),
    output: str = typer.Option("README.md", "--output", "-o", help="Output file"),
    provider: str = typer.Option(None, "--provider", "-p", help="AI provider"),
):
    """Generate a README for a project"""
    config = get_config()
    provider = provider or config.default_provider

    project_path = Path(path).resolve()

    # Gather project info
    project_info = analyze_project_for_readme(project_path)

    ai_client = get_ai_client(provider, config.default_model)

    system_prompt = """Generate a comprehensive README.md for the project. Include:
- Project title and description
- Features
- Installation instructions
- Usage examples
- Configuration
- Contributing guidelines
- License

Use proper markdown formatting."""

    messages = [{"role": "user", "content": f"Generate README for this project:\n\n{project_info}"}]

    console.print(f"\n[bold]Generating README...[/bold]\n")

    response = ""
    with Live(console=console, refresh_per_second=10) as live:
        for chunk in ai_client.stream_chat(messages, system_prompt):
            response += chunk
            live.update(Markdown(response))

    # Save
    output_path = project_path / output
    with open(output_path, "w") as f:
        f.write(response)

    console.print(f"\n[green]README saved to: {output_path}[/green]")


def extract_code(response: str) -> str:
    """Extract code from markdown response"""
    import re

    # Try to find code blocks
    pattern = r"```[\w]*\n(.*?)```"
    matches = re.findall(pattern, response, re.DOTALL)

    if matches:
        return "\n\n".join(matches)

    return response


def extract_json(response: str) -> str:
    """Extract JSON from response"""
    import re

    # Try to find JSON block
    pattern = r"```json\n(.*?)```"
    matches = re.findall(pattern, response, re.DOTALL)

    if matches:
        return matches[0]

    # Try to find raw JSON
    pattern = r"\{.*\}"
    matches = re.findall(pattern, response, re.DOTALL)

    if matches:
        return matches[0]

    return response


def analyze_project_for_readme(path: Path) -> str:
    """Analyze project for README generation"""
    info = []
    info.append(f"Project Name: {path.name}")

    # Detect language and framework
    from martin_coder.commands.project import detect_language, detect_framework

    lang = detect_language(path)
    framework = detect_framework(path)

    if lang:
        info.append(f"Language: {lang}")
    if framework:
        info.append(f"Framework: {framework}")

    # List main files
    main_files = []
    for item in path.iterdir():
        if item.is_file() and not item.name.startswith("."):
            main_files.append(item.name)

    info.append(f"Main files: {', '.join(main_files[:10])}")

    # Check for existing README content
    existing_readme = path / "README.md"
    if existing_readme.exists():
        with open(existing_readme) as f:
            content = f.read()
            if content.strip():
                info.append(f"\nExisting README content:\n{content[:1000]}")

    return "\n".join(info)
