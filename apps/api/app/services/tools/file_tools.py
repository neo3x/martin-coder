"""
File Operation Tools
"""

import os
import asyncio
from pathlib import Path
from typing import Optional, List, Tuple
import aiofiles
import fnmatch
import hashlib

from app.services.tools.base import BaseTool, ToolParameter, ToolResult


def validate_path(base_path: Optional[str], relative_path: str) -> Tuple[Optional[Path], Optional[str]]:
    """
    Validate that the resolved path is within the allowed base directory.
    Prevents path traversal attacks via ".." or symlinks.

    Returns:
        Tuple of (resolved_path, error_message).
        If valid, error_message is None.
        If invalid, resolved_path is None and error_message contains the reason.
    """
    try:
        if base_path:
            base = Path(base_path).resolve()
            full_path = (base / relative_path).resolve()

            # Check if the resolved path is under the base path
            try:
                full_path.relative_to(base)
            except ValueError:
                return None, f"Path traversal not allowed: {relative_path}"
        else:
            full_path = Path(relative_path).resolve()

        return full_path, None

    except Exception as e:
        return None, f"Invalid path: {str(e)}"


class ReadFileTool(BaseTool):
    """Read file contents"""

    name = "read_file"
    description = "Read the contents of a file. Returns the file content as text."
    parameters = [
        ToolParameter(
            name="path",
            type="string",
            description="Path to the file to read (relative to project root)"
        ),
        ToolParameter(
            name="start_line",
            type="integer",
            description="Starting line number (1-indexed)",
            required=False,
            default=1
        ),
        ToolParameter(
            name="end_line",
            type="integer",
            description="Ending line number (inclusive)",
            required=False
        )
    ]

    async def execute(self, path: str, start_line: int = 1, end_line: Optional[int] = None) -> ToolResult:
        """Read file contents"""
        try:
            # Validate and resolve path (prevents path traversal)
            full_path, error = validate_path(self.project_path, path)
            if error:
                return ToolResult(success=False, result=None, error=error)

            if not full_path.exists():
                return ToolResult(
                    success=False,
                    result=None,
                    error=f"File not found: {path}"
                )

            if not full_path.is_file():
                return ToolResult(
                    success=False,
                    result=None,
                    error=f"Not a file: {path}"
                )

            async with aiofiles.open(full_path, 'r', encoding='utf-8', errors='replace') as f:
                content = await f.read()

            lines = content.splitlines()
            total_lines = len(lines)

            # Apply line range
            start_idx = max(0, start_line - 1)
            end_idx = end_line if end_line else total_lines

            selected_lines = lines[start_idx:end_idx]

            # Format with line numbers
            result_lines = []
            for i, line in enumerate(selected_lines, start=start_idx + 1):
                result_lines.append(f"{i:4d}\t{line}")

            return ToolResult(
                success=True,
                result={
                    "content": "\n".join(result_lines),
                    "total_lines": total_lines,
                    "shown_lines": len(selected_lines),
                    "path": str(path)
                }
            )

        except Exception as e:
            return ToolResult(
                success=False,
                result=None,
                error=str(e)
            )


class WriteFileTool(BaseTool):
    """Write content to a file"""

    name = "write_file"
    description = "Write content to a file. Creates the file if it doesn't exist, or overwrites if it does."
    parameters = [
        ToolParameter(
            name="path",
            type="string",
            description="Path to the file to write (relative to project root)"
        ),
        ToolParameter(
            name="content",
            type="string",
            description="Content to write to the file"
        )
    ]

    async def execute(self, path: str, content: str) -> ToolResult:
        """Write content to file"""
        try:
            # Validate and resolve path (prevents path traversal)
            full_path, error = validate_path(self.project_path, path)
            if error:
                return ToolResult(success=False, result=None, error=error)

            # Create parent directories
            full_path.parent.mkdir(parents=True, exist_ok=True)

            async with aiofiles.open(full_path, 'w', encoding='utf-8') as f:
                await f.write(content)

            return ToolResult(
                success=True,
                result={
                    "path": str(path),
                    "bytes_written": len(content.encode('utf-8')),
                    "lines": len(content.splitlines())
                }
            )

        except Exception as e:
            return ToolResult(
                success=False,
                result=None,
                error=str(e)
            )


class EditFileTool(BaseTool):
    """Edit file with string replacement"""

    name = "edit_file"
    description = "Edit a file by replacing a specific string with new content. The old_string must match exactly."
    parameters = [
        ToolParameter(
            name="path",
            type="string",
            description="Path to the file to edit (relative to project root)"
        ),
        ToolParameter(
            name="old_string",
            type="string",
            description="The exact string to find and replace"
        ),
        ToolParameter(
            name="new_string",
            type="string",
            description="The string to replace with"
        ),
        ToolParameter(
            name="replace_all",
            type="boolean",
            description="Replace all occurrences (default: false, only first)",
            required=False,
            default=False
        )
    ]

    async def execute(
        self,
        path: str,
        old_string: str,
        new_string: str,
        replace_all: bool = False
    ) -> ToolResult:
        """Edit file with string replacement"""
        try:
            # Validate and resolve path (prevents path traversal)
            full_path, error = validate_path(self.project_path, path)
            if error:
                return ToolResult(success=False, result=None, error=error)

            if not full_path.exists():
                return ToolResult(
                    success=False,
                    result=None,
                    error=f"File not found: {path}"
                )

            async with aiofiles.open(full_path, 'r', encoding='utf-8') as f:
                content = await f.read()

            # Check if old_string exists
            if old_string not in content:
                return ToolResult(
                    success=False,
                    result=None,
                    error=f"String not found in file: {old_string[:100]}..."
                )

            # Count occurrences
            count = content.count(old_string)

            # Perform replacement
            if replace_all:
                new_content = content.replace(old_string, new_string)
                replaced = count
            else:
                new_content = content.replace(old_string, new_string, 1)
                replaced = 1

            # Write back
            async with aiofiles.open(full_path, 'w', encoding='utf-8') as f:
                await f.write(new_content)

            return ToolResult(
                success=True,
                result={
                    "path": str(path),
                    "replacements": replaced,
                    "total_occurrences": count
                }
            )

        except Exception as e:
            return ToolResult(
                success=False,
                result=None,
                error=str(e)
            )


class ListDirectoryTool(BaseTool):
    """List directory contents"""

    name = "list_directory"
    description = "List files and directories in a path. Returns a tree structure."
    parameters = [
        ToolParameter(
            name="path",
            type="string",
            description="Path to the directory (relative to project root)",
            required=False,
            default="."
        ),
        ToolParameter(
            name="recursive",
            type="boolean",
            description="List recursively",
            required=False,
            default=False
        ),
        ToolParameter(
            name="max_depth",
            type="integer",
            description="Maximum depth for recursive listing",
            required=False,
            default=3
        ),
        ToolParameter(
            name="pattern",
            type="string",
            description="Filter by glob pattern (e.g., '*.py')",
            required=False
        )
    ]

    async def execute(
        self,
        path: str = ".",
        recursive: bool = False,
        max_depth: int = 3,
        pattern: Optional[str] = None
    ) -> ToolResult:
        """List directory contents"""
        try:
            # Validate and resolve path (prevents path traversal)
            full_path, error = validate_path(self.project_path, path)
            if error:
                return ToolResult(success=False, result=None, error=error)

            if not full_path.exists():
                return ToolResult(
                    success=False,
                    result=None,
                    error=f"Directory not found: {path}"
                )

            if not full_path.is_dir():
                return ToolResult(
                    success=False,
                    result=None,
                    error=f"Not a directory: {path}"
                )

            def should_ignore(p: Path) -> bool:
                """Check if path should be ignored"""
                ignore_patterns = [
                    '.git', '__pycache__', 'node_modules', '.venv', 'venv',
                    '.idea', '.vscode', '*.pyc', '.DS_Store', 'dist', 'build'
                ]
                for pat in ignore_patterns:
                    if fnmatch.fnmatch(p.name, pat):
                        return True
                return False

            def list_dir(dir_path: Path, depth: int = 0) -> List[dict]:
                """Recursively list directory"""
                items = []

                try:
                    entries = sorted(dir_path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower()))
                except PermissionError:
                    return items

                for entry in entries:
                    if should_ignore(entry):
                        continue

                    if pattern and entry.is_file():
                        if not fnmatch.fnmatch(entry.name, pattern):
                            continue

                    item = {
                        "name": entry.name,
                        "type": "directory" if entry.is_dir() else "file",
                        "path": str(entry.relative_to(full_path))
                    }

                    if entry.is_file():
                        item["size"] = entry.stat().st_size

                    if entry.is_dir() and recursive and depth < max_depth:
                        children = list_dir(entry, depth + 1)
                        if children:
                            item["children"] = children

                    items.append(item)

                return items

            # Run in executor to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, list_dir, full_path)

            return ToolResult(
                success=True,
                result={
                    "path": str(path),
                    "items": result,
                    "count": len(result)
                }
            )

        except Exception as e:
            return ToolResult(
                success=False,
                result=None,
                error=str(e)
            )


class SearchFilesTool(BaseTool):
    """Search for files by name pattern"""

    name = "search_files"
    description = "Search for files matching a glob pattern in the project."
    parameters = [
        ToolParameter(
            name="pattern",
            type="string",
            description="Glob pattern to match (e.g., '**/*.py', 'src/**/*.ts')"
        ),
        ToolParameter(
            name="path",
            type="string",
            description="Starting path for search",
            required=False,
            default="."
        ),
        ToolParameter(
            name="max_results",
            type="integer",
            description="Maximum number of results",
            required=False,
            default=100
        )
    ]

    async def execute(
        self,
        pattern: str,
        path: str = ".",
        max_results: int = 100
    ) -> ToolResult:
        """Search for files"""
        try:
            # Validate and resolve path (prevents path traversal)
            full_path, error = validate_path(self.project_path, path)
            if error:
                return ToolResult(success=False, result=None, error=error)

            if not full_path.exists():
                return ToolResult(
                    success=False,
                    result=None,
                    error=f"Path not found: {path}"
                )

            def search():
                matches = []
                ignore_dirs = {'.git', '__pycache__', 'node_modules', '.venv', 'venv', '.idea'}

                for match in full_path.glob(pattern):
                    # Skip ignored directories
                    if any(part in ignore_dirs for part in match.parts):
                        continue

                    if match.is_file():
                        rel_path = match.relative_to(full_path)
                        matches.append({
                            "path": str(rel_path),
                            "name": match.name,
                            "size": match.stat().st_size
                        })

                        if len(matches) >= max_results:
                            break

                return matches

            loop = asyncio.get_event_loop()
            matches = await loop.run_in_executor(None, search)

            return ToolResult(
                success=True,
                result={
                    "pattern": pattern,
                    "matches": matches,
                    "count": len(matches),
                    "truncated": len(matches) >= max_results
                }
            )

        except Exception as e:
            return ToolResult(
                success=False,
                result=None,
                error=str(e)
            )
