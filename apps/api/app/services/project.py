"""
Project Service - Project analysis and management
"""

from typing import Dict, Any, List, Optional
from pathlib import Path
import asyncio
import aiofiles
import logging
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.project import Project, ProjectFile
from app.services.rag.retriever import RAGRetriever
from app.schemas.project import ProjectAnalysis, ProjectStructure

logger = logging.getLogger(__name__)


class ProjectService:
    """Service for project operations"""

    # File extensions to analyze
    CODE_EXTENSIONS = {
        ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rs",
        ".rb", ".php", ".swift", ".kt", ".scala", ".c", ".cpp", ".h",
        ".cs", ".vue", ".svelte", ".astro"
    }

    CONFIG_FILES = {
        "package.json", "requirements.txt", "Cargo.toml", "go.mod",
        "pom.xml", "build.gradle", "Gemfile", "composer.json",
        "pyproject.toml", "setup.py"
    }

    IGNORE_DIRS = {
        ".git", "__pycache__", "node_modules", ".venv", "venv",
        ".idea", ".vscode", "dist", "build", ".next", ".cache",
        "target", "vendor", ".tox", ".mypy_cache"
    }

    def __init__(self, db: AsyncSession):
        self.db = db

    async def analyze_project(self, project: Project) -> ProjectAnalysis:
        """Analyze project structure and dependencies"""
        if not project.local_path:
            raise ValueError("Project has no local path")

        project_path = Path(project.local_path)
        if not project_path.exists():
            raise ValueError(f"Project path does not exist: {project.local_path}")

        # Analyze structure
        structure = await self._build_structure(project_path)
        languages = {}
        frameworks = []
        dependencies = {}
        total_lines = 0
        file_count = 0

        # Walk through files
        for item in project_path.rglob("*"):
            if any(part in self.IGNORE_DIRS for part in item.parts):
                continue

            if not item.is_file():
                continue

            # Detect languages
            if item.suffix in self.CODE_EXTENSIONS:
                lang = self._extension_to_language(item.suffix)
                languages[lang] = languages.get(lang, 0) + 1

                # Count lines
                try:
                    async with aiofiles.open(item, 'r', errors='replace') as f:
                        content = await f.read()
                        total_lines += len(content.splitlines())
                except Exception:
                    pass

                file_count += 1

                # Save file info
                await self._save_file_info(project, item, project_path)

            # Detect frameworks and dependencies
            if item.name in self.CONFIG_FILES:
                fw, deps = await self._analyze_config_file(item)
                frameworks.extend(fw)
                dependencies.update(deps)

        # Update project metadata
        if languages:
            main_lang = max(languages, key=languages.get)
            project.detected_language = main_lang

        if frameworks:
            project.detected_framework = frameworks[0]

        await self.db.commit()

        return ProjectAnalysis(
            project_id=project.id,
            languages=languages,
            frameworks=list(set(frameworks)),
            dependencies=dependencies,
            file_count=file_count,
            total_lines=total_lines,
            structure=structure
        )

    async def index_project_for_rag(self, project: Project) -> int:
        """Index project files for RAG search"""
        if not project.local_path:
            raise ValueError("Project has no local path")

        project_path = Path(project.local_path)
        rag = RAGRetriever(project.id)

        files_to_index = []

        for item in project_path.rglob("*"):
            if any(part in self.IGNORE_DIRS for part in item.parts):
                continue

            if not item.is_file():
                continue

            if item.suffix not in self.CODE_EXTENSIONS:
                continue

            # Skip large files
            try:
                if item.stat().st_size > 500_000:  # 500KB
                    continue
            except OSError:
                continue

            try:
                async with aiofiles.open(item, 'r', errors='replace') as f:
                    content = await f.read()

                rel_path = str(item.relative_to(project_path))
                files_to_index.append({
                    "path": rel_path,
                    "content": content
                })
            except Exception as e:
                logger.warning(f"Error reading {item}: {e}")

        # Index files
        indexed_count = await rag.index_files(files_to_index)

        # Update project status
        project.is_indexed = True
        project.last_indexed_at = datetime.utcnow()
        await self.db.commit()

        return indexed_count

    async def _build_structure(self, root: Path, max_depth: int = 4) -> ProjectStructure:
        """Build project structure tree"""
        def build_tree(path: Path, depth: int = 0) -> Optional[ProjectStructure]:
            if depth > max_depth:
                return None

            if path.name in self.IGNORE_DIRS:
                return None

            if path.is_file():
                return ProjectStructure(
                    name=path.name,
                    path=str(path.relative_to(root)),
                    type="file",
                    language=self._extension_to_language(path.suffix),
                    size_bytes=path.stat().st_size
                )
            else:
                children = []
                try:
                    for child in sorted(path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
                        child_struct = build_tree(child, depth + 1)
                        if child_struct:
                            children.append(child_struct)
                except PermissionError:
                    pass

                return ProjectStructure(
                    name=path.name,
                    path=str(path.relative_to(root)) if path != root else ".",
                    type="directory",
                    children=children if children else None
                )

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, build_tree, root)

    async def _save_file_info(self, project: Project, file_path: Path, root: Path):
        """Save or update file information"""
        rel_path = str(file_path.relative_to(root))

        # Check if file already exists
        result = await self.db.execute(
            select(ProjectFile).where(
                ProjectFile.project_id == project.id,
                ProjectFile.path == rel_path
            )
        )
        existing = result.scalar_one_or_none()

        # Get file stats
        stats = file_path.stat()

        # Calculate content hash
        import hashlib
        try:
            async with aiofiles.open(file_path, 'rb') as f:
                content = await f.read()
                content_hash = hashlib.sha256(content).hexdigest()
                line_count = content.decode('utf-8', errors='replace').count('\n')
        except Exception:
            content_hash = ""
            line_count = 0

        if existing:
            # Update if changed
            if existing.content_hash != content_hash:
                existing.content_hash = content_hash
                existing.size_bytes = stats.st_size
                existing.line_count = line_count
                existing.is_indexed = False
        else:
            # Create new
            project_file = ProjectFile(
                project_id=project.id,
                path=rel_path,
                name=file_path.name,
                extension=file_path.suffix,
                language=self._extension_to_language(file_path.suffix),
                content_hash=content_hash,
                size_bytes=stats.st_size,
                line_count=line_count
            )
            self.db.add(project_file)

    async def _analyze_config_file(self, file_path: Path) -> tuple:
        """Analyze configuration file for frameworks and dependencies"""
        frameworks = []
        dependencies = {}

        try:
            async with aiofiles.open(file_path, 'r') as f:
                content = await f.read()

            if file_path.name == "package.json":
                import json
                data = json.loads(content)
                deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
                dependencies.update(deps)

                # Detect frameworks
                if "react" in deps:
                    frameworks.append("React")
                if "next" in deps:
                    frameworks.append("Next.js")
                if "vue" in deps:
                    frameworks.append("Vue.js")
                if "express" in deps:
                    frameworks.append("Express")
                if "fastify" in deps:
                    frameworks.append("Fastify")

            elif file_path.name == "requirements.txt":
                for line in content.splitlines():
                    line = line.strip()
                    if line and not line.startswith("#"):
                        parts = line.split("==")
                        pkg = parts[0].split(">=")[0].split("<=")[0]
                        version = parts[1] if len(parts) > 1 else "*"
                        dependencies[pkg] = version

                        if "django" in pkg.lower():
                            frameworks.append("Django")
                        elif "flask" in pkg.lower():
                            frameworks.append("Flask")
                        elif "fastapi" in pkg.lower():
                            frameworks.append("FastAPI")

            elif file_path.name == "pyproject.toml":
                # Simple TOML parsing for dependencies
                if "fastapi" in content.lower():
                    frameworks.append("FastAPI")
                if "django" in content.lower():
                    frameworks.append("Django")
                if "flask" in content.lower():
                    frameworks.append("Flask")

        except Exception as e:
            logger.warning(f"Error analyzing {file_path}: {e}")

        return frameworks, dependencies

    def _extension_to_language(self, ext: str) -> Optional[str]:
        """Convert file extension to language name"""
        mapping = {
            ".py": "Python",
            ".js": "JavaScript",
            ".ts": "TypeScript",
            ".tsx": "TypeScript",
            ".jsx": "JavaScript",
            ".java": "Java",
            ".go": "Go",
            ".rs": "Rust",
            ".rb": "Ruby",
            ".php": "PHP",
            ".swift": "Swift",
            ".kt": "Kotlin",
            ".scala": "Scala",
            ".c": "C",
            ".cpp": "C++",
            ".h": "C",
            ".cs": "C#",
            ".vue": "Vue",
            ".svelte": "Svelte",
        }
        return mapping.get(ext)
