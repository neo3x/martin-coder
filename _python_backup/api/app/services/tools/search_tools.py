"""
Code Search Tools
"""

import asyncio
import re
from pathlib import Path
from typing import Optional, List
import aiofiles

from app.services.tools.base import BaseTool, ToolParameter, ToolResult


class SearchCodeTool(BaseTool):
    """Search code content"""

    name = "search_code"
    description = "Search for text or patterns in code files. Returns matching lines with context."
    parameters = [
        ToolParameter(
            name="query",
            type="string",
            description="Search query (text or regex pattern)"
        ),
        ToolParameter(
            name="path",
            type="string",
            description="Path to search in",
            required=False,
            default="."
        ),
        ToolParameter(
            name="file_pattern",
            type="string",
            description="Glob pattern for files to search (e.g., '*.py')",
            required=False
        ),
        ToolParameter(
            name="is_regex",
            type="boolean",
            description="Treat query as regex pattern",
            required=False,
            default=False
        ),
        ToolParameter(
            name="case_sensitive",
            type="boolean",
            description="Case sensitive search",
            required=False,
            default=False
        ),
        ToolParameter(
            name="context_lines",
            type="integer",
            description="Number of context lines before/after match",
            required=False,
            default=2
        ),
        ToolParameter(
            name="max_results",
            type="integer",
            description="Maximum number of results",
            required=False,
            default=50
        )
    ]

    # File extensions to search
    CODE_EXTENSIONS = {
        '.py', '.js', '.ts', '.tsx', '.jsx', '.java', '.c', '.cpp', '.h',
        '.hpp', '.cs', '.go', '.rs', '.rb', '.php', '.swift', '.kt',
        '.scala', '.r', '.m', '.mm', '.sql', '.sh', '.bash', '.zsh',
        '.yml', '.yaml', '.json', '.xml', '.html', '.css', '.scss',
        '.less', '.md', '.txt', '.rst', '.toml', '.ini', '.cfg',
        '.vue', '.svelte', '.astro'
    }

    IGNORE_DIRS = {
        '.git', '__pycache__', 'node_modules', '.venv', 'venv',
        '.idea', '.vscode', 'dist', 'build', '.next', '.cache'
    }

    async def execute(
        self,
        query: str,
        path: str = ".",
        file_pattern: Optional[str] = None,
        is_regex: bool = False,
        case_sensitive: bool = False,
        context_lines: int = 2,
        max_results: int = 50
    ) -> ToolResult:
        """Search code content"""
        try:
            # Resolve path
            if self.project_path:
                search_path = Path(self.project_path) / path
            else:
                search_path = Path(path)

            if not search_path.exists():
                return ToolResult(
                    success=False,
                    result=None,
                    error=f"Path not found: {path}"
                )

            # Compile pattern
            flags = 0 if case_sensitive else re.IGNORECASE
            if is_regex:
                try:
                    pattern = re.compile(query, flags)
                except re.error as e:
                    return ToolResult(
                        success=False,
                        result=None,
                        error=f"Invalid regex pattern: {e}"
                    )
            else:
                # Escape special characters for literal search
                pattern = re.compile(re.escape(query), flags)

            results = []
            files_searched = 0

            async def search_file(file_path: Path) -> List[dict]:
                """Search a single file"""
                matches = []
                try:
                    async with aiofiles.open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                        content = await f.read()

                    lines = content.splitlines()

                    for i, line in enumerate(lines):
                        if pattern.search(line):
                            # Get context
                            start = max(0, i - context_lines)
                            end = min(len(lines), i + context_lines + 1)

                            context = []
                            for j in range(start, end):
                                prefix = ">" if j == i else " "
                                context.append(f"{prefix} {j + 1:4d}: {lines[j]}")

                            rel_path = file_path.relative_to(search_path) if file_path.is_relative_to(search_path) else file_path

                            matches.append({
                                "file": str(rel_path),
                                "line": i + 1,
                                "match": line.strip(),
                                "context": "\n".join(context)
                            })

                            if len(matches) >= max_results:
                                break

                except Exception:
                    pass

                return matches

            def get_files():
                """Get files to search"""
                files = []
                for item in search_path.rglob('*'):
                    # Skip ignored directories
                    if any(part in self.IGNORE_DIRS for part in item.parts):
                        continue

                    if not item.is_file():
                        continue

                    # Apply file pattern filter
                    if file_pattern:
                        if not item.match(file_pattern):
                            continue
                    else:
                        # Only search code files by default
                        if item.suffix.lower() not in self.CODE_EXTENSIONS:
                            continue

                    # Skip large files
                    try:
                        if item.stat().st_size > 1_000_000:  # 1MB
                            continue
                    except OSError:
                        continue

                    files.append(item)

                return files

            # Get files in executor
            loop = asyncio.get_event_loop()
            files = await loop.run_in_executor(None, get_files)
            files_searched = len(files)

            # Search files concurrently
            search_tasks = [search_file(f) for f in files[:1000]]  # Limit files
            file_results = await asyncio.gather(*search_tasks)

            for matches in file_results:
                results.extend(matches)
                if len(results) >= max_results:
                    results = results[:max_results]
                    break

            return ToolResult(
                success=True,
                result={
                    "query": query,
                    "matches": results,
                    "count": len(results),
                    "files_searched": files_searched,
                    "truncated": len(results) >= max_results
                }
            )

        except Exception as e:
            return ToolResult(
                success=False,
                result=None,
                error=str(e)
            )


class GrepTool(BaseTool):
    """Fast grep-style search using ripgrep if available"""

    name = "grep"
    description = "Fast text search using ripgrep (rg). Falls back to Python search if rg not available."
    parameters = [
        ToolParameter(
            name="pattern",
            type="string",
            description="Search pattern"
        ),
        ToolParameter(
            name="path",
            type="string",
            description="Path to search",
            required=False,
            default="."
        ),
        ToolParameter(
            name="file_type",
            type="string",
            description="File type to search (py, js, ts, etc.)",
            required=False
        ),
        ToolParameter(
            name="case_insensitive",
            type="boolean",
            description="Case insensitive search",
            required=False,
            default=True
        ),
        ToolParameter(
            name="context",
            type="integer",
            description="Context lines",
            required=False,
            default=2
        )
    ]

    async def execute(
        self,
        pattern: str,
        path: str = ".",
        file_type: Optional[str] = None,
        case_insensitive: bool = True,
        context: int = 2
    ) -> ToolResult:
        """Execute grep search"""
        try:
            # Resolve path
            if self.project_path:
                search_path = Path(self.project_path) / path
            else:
                search_path = Path(path)

            # Try ripgrep first
            rg_available = await self._check_ripgrep()

            if rg_available:
                return await self._ripgrep_search(
                    pattern, search_path, file_type, case_insensitive, context
                )
            else:
                # Fall back to Python search
                search_tool = SearchCodeTool(self.project_path)
                return await search_tool.execute(
                    query=pattern,
                    path=path,
                    case_sensitive=not case_insensitive,
                    context_lines=context
                )

        except Exception as e:
            return ToolResult(
                success=False,
                result=None,
                error=str(e)
            )

    async def _check_ripgrep(self) -> bool:
        """Check if ripgrep is available"""
        try:
            process = await asyncio.create_subprocess_exec(
                'rg', '--version',
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            await process.communicate()
            return process.returncode == 0
        except FileNotFoundError:
            return False

    async def _ripgrep_search(
        self,
        pattern: str,
        search_path: Path,
        file_type: Optional[str],
        case_insensitive: bool,
        context: int
    ) -> ToolResult:
        """Search using ripgrep"""
        cmd = ['rg', '--json', '-C', str(context)]

        if case_insensitive:
            cmd.append('-i')

        if file_type:
            cmd.extend(['-t', file_type])

        cmd.extend([pattern, str(search_path)])

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await process.communicate()

        if process.returncode not in (0, 1):  # 1 = no matches
            return ToolResult(
                success=False,
                result=None,
                error=stderr.decode('utf-8', errors='replace')
            )

        # Parse JSON output
        import json
        results = []
        for line in stdout.decode('utf-8', errors='replace').splitlines():
            try:
                data = json.loads(line)
                if data.get('type') == 'match':
                    match_data = data.get('data', {})
                    results.append({
                        "file": match_data.get('path', {}).get('text', ''),
                        "line": match_data.get('line_number', 0),
                        "match": match_data.get('lines', {}).get('text', '').strip()
                    })
            except json.JSONDecodeError:
                continue

        return ToolResult(
            success=True,
            result={
                "pattern": pattern,
                "matches": results[:100],
                "count": len(results),
                "truncated": len(results) > 100
            }
        )
