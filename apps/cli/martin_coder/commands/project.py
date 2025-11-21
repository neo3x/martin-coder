"""
Project Command - Project management
"""

import typer
from rich.console import Console
from rich.table import Table
from rich.tree import Tree
from typing import Optional
from pathlib import Path
import json

app = typer.Typer()
console = Console()


@app.command("init")
def init_project(
    path: str = typer.Argument(".", help="Project path"),
    name: Optional[str] = typer.Option(None, "--name", "-n", help="Project name"),
):
    """Initialize a project for Martin-Coder"""
    project_path = Path(path).resolve()

    if not project_path.exists():
        console.print(f"[red]Path does not exist: {project_path}[/red]")
        raise typer.Exit(1)

    # Create .martin-coder directory
    config_dir = project_path / ".martin-coder"
    config_dir.mkdir(exist_ok=True)

    # Detect project info
    project_name = name or project_path.name
    language = detect_language(project_path)
    framework = detect_framework(project_path)

    # Create project config
    config = {
        "name": project_name,
        "path": str(project_path),
        "language": language,
        "framework": framework,
        "indexed": False
    }

    config_file = config_dir / "project.json"
    with open(config_file, "w") as f:
        json.dump(config, f, indent=2)

    console.print(f"[green]Project initialized: {project_name}[/green]")
    console.print(f"  Language: {language or 'Unknown'}")
    console.print(f"  Framework: {framework or 'Unknown'}")
    console.print(f"  Config: {config_file}")


@app.command("analyze")
def analyze_project(
    path: str = typer.Argument(".", help="Project path"),
):
    """Analyze project structure and dependencies"""
    project_path = Path(path).resolve()

    if not project_path.exists():
        console.print(f"[red]Path does not exist: {project_path}[/red]")
        raise typer.Exit(1)

    console.print(f"[bold]Analyzing project: {project_path.name}[/bold]\n")

    # Count files by extension
    file_counts = {}
    total_lines = 0

    for item in project_path.rglob("*"):
        if should_ignore(item):
            continue

        if item.is_file():
            ext = item.suffix.lower()
            file_counts[ext] = file_counts.get(ext, 0) + 1

            # Count lines for code files
            if ext in {".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rs"}:
                try:
                    with open(item, "r", errors="replace") as f:
                        total_lines += sum(1 for _ in f)
                except Exception:
                    pass

    # Display results
    table = Table(title="File Statistics")
    table.add_column("Extension", style="cyan")
    table.add_column("Count", justify="right")

    for ext, count in sorted(file_counts.items(), key=lambda x: -x[1])[:15]:
        table.add_row(ext or "(no ext)", str(count))

    console.print(table)
    console.print(f"\n[bold]Total code lines:[/bold] {total_lines:,}")

    # Dependencies
    deps = detect_dependencies(project_path)
    if deps:
        console.print("\n[bold]Dependencies:[/bold]")
        for pkg, version in list(deps.items())[:10]:
            console.print(f"  {pkg}: {version}")
        if len(deps) > 10:
            console.print(f"  ... and {len(deps) - 10} more")


@app.command("tree")
def show_tree(
    path: str = typer.Argument(".", help="Project path"),
    depth: int = typer.Option(3, "--depth", "-d", help="Max depth"),
):
    """Show project file tree"""
    project_path = Path(path).resolve()

    if not project_path.exists():
        console.print(f"[red]Path does not exist: {project_path}[/red]")
        raise typer.Exit(1)

    tree = Tree(f"[bold blue]{project_path.name}[/bold blue]")
    build_tree(project_path, tree, depth)
    console.print(tree)


def build_tree(path: Path, tree: Tree, max_depth: int, current_depth: int = 0):
    """Build tree structure"""
    if current_depth >= max_depth:
        return

    try:
        items = sorted(path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower()))
    except PermissionError:
        return

    for item in items:
        if should_ignore(item):
            continue

        if item.is_dir():
            branch = tree.add(f"[bold cyan]{item.name}/[/bold cyan]")
            build_tree(item, branch, max_depth, current_depth + 1)
        else:
            style = get_file_style(item.suffix)
            tree.add(f"[{style}]{item.name}[/{style}]")


def should_ignore(path: Path) -> bool:
    """Check if path should be ignored"""
    ignore = {".git", "__pycache__", "node_modules", ".venv", "venv",
              ".idea", ".vscode", "dist", "build", ".next", ".cache"}
    return any(part in ignore for part in path.parts)


def get_file_style(ext: str) -> str:
    """Get style for file extension"""
    styles = {
        ".py": "yellow",
        ".js": "yellow",
        ".ts": "blue",
        ".tsx": "blue",
        ".jsx": "yellow",
        ".json": "green",
        ".md": "white",
        ".yml": "magenta",
        ".yaml": "magenta",
    }
    return styles.get(ext.lower(), "white")


def detect_language(path: Path) -> Optional[str]:
    """Detect main programming language"""
    indicators = {
        "Python": ["requirements.txt", "pyproject.toml", "setup.py"],
        "JavaScript": ["package.json"],
        "TypeScript": ["tsconfig.json"],
        "Go": ["go.mod"],
        "Rust": ["Cargo.toml"],
        "Java": ["pom.xml", "build.gradle"],
        "Ruby": ["Gemfile"],
    }

    for lang, files in indicators.items():
        for f in files:
            if (path / f).exists():
                return lang
    return None


def detect_framework(path: Path) -> Optional[str]:
    """Detect framework"""
    if (path / "package.json").exists():
        try:
            with open(path / "package.json") as f:
                pkg = json.load(f)
                deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}

                if "next" in deps:
                    return "Next.js"
                if "react" in deps:
                    return "React"
                if "vue" in deps:
                    return "Vue.js"
                if "express" in deps:
                    return "Express"
        except Exception:
            pass

    if (path / "requirements.txt").exists():
        try:
            with open(path / "requirements.txt") as f:
                content = f.read().lower()
                if "django" in content:
                    return "Django"
                if "flask" in content:
                    return "Flask"
                if "fastapi" in content:
                    return "FastAPI"
        except Exception:
            pass

    return None


def detect_dependencies(path: Path) -> dict:
    """Detect project dependencies"""
    deps = {}

    # Python
    if (path / "requirements.txt").exists():
        try:
            with open(path / "requirements.txt") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        parts = line.split("==")
                        pkg = parts[0].split(">=")[0].split("<=")[0]
                        version = parts[1] if len(parts) > 1 else "*"
                        deps[pkg] = version
        except Exception:
            pass

    # Node.js
    if (path / "package.json").exists():
        try:
            with open(path / "package.json") as f:
                pkg = json.load(f)
                deps.update(pkg.get("dependencies", {}))
        except Exception:
            pass

    return deps
