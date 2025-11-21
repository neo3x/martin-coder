"""
Code Chunker - Intelligent code chunking for RAG
"""

from typing import List, Dict, Any, Optional
import re
import logging
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class ChunkType(str, Enum):
    """Type of code chunk"""
    FILE = "file"
    CLASS = "class"
    FUNCTION = "function"
    METHOD = "method"
    BLOCK = "block"


@dataclass
class CodeChunk:
    """Represents a chunk of code"""
    content: str
    chunk_type: ChunkType
    file_path: str
    start_line: int
    end_line: int
    name: Optional[str] = None
    parent: Optional[str] = None
    language: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    @property
    def id(self) -> str:
        """Generate unique ID for chunk"""
        return f"{self.file_path}:{self.start_line}-{self.end_line}:{self.chunk_type.value}"


class CodeChunker:
    """Intelligent code chunking for different languages"""

    # Maximum chunk size in characters
    MAX_CHUNK_SIZE = 4000
    # Overlap between chunks
    OVERLAP_SIZE = 200
    # Minimum chunk size
    MIN_CHUNK_SIZE = 100

    # Language detection by extension
    LANGUAGE_MAP = {
        ".py": "python",
        ".js": "javascript",
        ".ts": "typescript",
        ".tsx": "typescript",
        ".jsx": "javascript",
        ".java": "java",
        ".go": "go",
        ".rs": "rust",
        ".cpp": "cpp",
        ".c": "c",
        ".rb": "ruby",
        ".php": "php",
        ".swift": "swift",
        ".kt": "kotlin",
        ".scala": "scala",
        ".cs": "csharp",
    }

    # Regex patterns for different languages
    PATTERNS = {
        "python": {
            "class": r"^class\s+(\w+).*?:",
            "function": r"^(?:async\s+)?def\s+(\w+)\s*\(",
        },
        "javascript": {
            "class": r"^(?:export\s+)?class\s+(\w+)",
            "function": r"^(?:export\s+)?(?:async\s+)?function\s+(\w+)",
            "arrow": r"^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(",
        },
        "typescript": {
            "class": r"^(?:export\s+)?class\s+(\w+)",
            "function": r"^(?:export\s+)?(?:async\s+)?function\s+(\w+)",
            "interface": r"^(?:export\s+)?interface\s+(\w+)",
            "type": r"^(?:export\s+)?type\s+(\w+)",
        },
        "java": {
            "class": r"^(?:public|private|protected)?\s*(?:abstract|final)?\s*class\s+(\w+)",
            "method": r"^(?:public|private|protected)?\s*(?:static|final|abstract)?\s*\w+\s+(\w+)\s*\(",
        },
        "go": {
            "function": r"^func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(",
            "struct": r"^type\s+(\w+)\s+struct",
            "interface": r"^type\s+(\w+)\s+interface",
        },
    }

    def __init__(self, max_chunk_size: int = MAX_CHUNK_SIZE):
        self.max_chunk_size = max_chunk_size

    def detect_language(self, file_path: str) -> Optional[str]:
        """Detect programming language from file extension"""
        for ext, lang in self.LANGUAGE_MAP.items():
            if file_path.endswith(ext):
                return lang
        return None

    def chunk_file(self, content: str, file_path: str) -> List[CodeChunk]:
        """Chunk a file intelligently based on code structure"""
        language = self.detect_language(file_path)

        if language and language in self.PATTERNS:
            chunks = self._chunk_by_structure(content, file_path, language)
        else:
            chunks = self._chunk_by_lines(content, file_path, language)

        return chunks

    def _chunk_by_structure(
        self,
        content: str,
        file_path: str,
        language: str
    ) -> List[CodeChunk]:
        """Chunk code by structural elements (classes, functions)"""
        chunks = []
        lines = content.splitlines()
        patterns = self.PATTERNS.get(language, {})

        # Find all structural elements
        elements = []
        current_indent = 0

        for i, line in enumerate(lines):
            stripped = line.lstrip()
            if not stripped or stripped.startswith('#') or stripped.startswith('//'):
                continue

            indent = len(line) - len(stripped)

            for elem_type, pattern in patterns.items():
                match = re.match(pattern, stripped)
                if match:
                    elements.append({
                        "type": elem_type,
                        "name": match.group(1),
                        "line": i,
                        "indent": indent
                    })
                    break

        if not elements:
            # No structure found, fall back to line-based chunking
            return self._chunk_by_lines(content, file_path, language)

        # Create chunks for each element
        for j, elem in enumerate(elements):
            # Find end of this element
            start_line = elem["line"]

            if j < len(elements) - 1:
                # Next element at same or lower indent marks the end
                end_line = elements[j + 1]["line"] - 1
            else:
                end_line = len(lines) - 1

            # Extract content
            chunk_lines = lines[start_line:end_line + 1]
            chunk_content = "\n".join(chunk_lines)

            # If chunk is too large, split it
            if len(chunk_content) > self.max_chunk_size:
                sub_chunks = self._split_large_chunk(
                    chunk_content, file_path, language, start_line, elem
                )
                chunks.extend(sub_chunks)
            elif len(chunk_content) >= self.MIN_CHUNK_SIZE:
                chunk_type = ChunkType.CLASS if "class" in elem["type"] else ChunkType.FUNCTION
                chunks.append(CodeChunk(
                    content=chunk_content,
                    chunk_type=chunk_type,
                    file_path=file_path,
                    start_line=start_line + 1,
                    end_line=end_line + 1,
                    name=elem["name"],
                    language=language
                ))

        # Add any remaining content as file-level chunks
        if not chunks:
            return self._chunk_by_lines(content, file_path, language)

        return chunks

    def _chunk_by_lines(
        self,
        content: str,
        file_path: str,
        language: Optional[str]
    ) -> List[CodeChunk]:
        """Chunk code by lines with overlap"""
        chunks = []
        lines = content.splitlines()

        if len(content) <= self.max_chunk_size:
            # Small file, single chunk
            return [CodeChunk(
                content=content,
                chunk_type=ChunkType.FILE,
                file_path=file_path,
                start_line=1,
                end_line=len(lines),
                language=language
            )]

        # Split into chunks with overlap
        current_chunk_lines = []
        current_size = 0
        chunk_start = 1

        for i, line in enumerate(lines):
            line_size = len(line) + 1  # +1 for newline

            if current_size + line_size > self.max_chunk_size and current_chunk_lines:
                # Create chunk
                chunks.append(CodeChunk(
                    content="\n".join(current_chunk_lines),
                    chunk_type=ChunkType.BLOCK,
                    file_path=file_path,
                    start_line=chunk_start,
                    end_line=chunk_start + len(current_chunk_lines) - 1,
                    language=language
                ))

                # Start new chunk with overlap
                overlap_lines = current_chunk_lines[-5:] if len(current_chunk_lines) > 5 else []
                current_chunk_lines = overlap_lines
                current_size = sum(len(l) + 1 for l in overlap_lines)
                chunk_start = i - len(overlap_lines) + 1

            current_chunk_lines.append(line)
            current_size += line_size

        # Last chunk
        if current_chunk_lines:
            chunks.append(CodeChunk(
                content="\n".join(current_chunk_lines),
                chunk_type=ChunkType.BLOCK,
                file_path=file_path,
                start_line=chunk_start,
                end_line=chunk_start + len(current_chunk_lines) - 1,
                language=language
            ))

        return chunks

    def _split_large_chunk(
        self,
        content: str,
        file_path: str,
        language: str,
        base_line: int,
        elem: Dict
    ) -> List[CodeChunk]:
        """Split a large chunk into smaller pieces"""
        chunks = []
        lines = content.splitlines()
        chunk_lines = []
        current_size = 0
        chunk_num = 0

        for i, line in enumerate(lines):
            line_size = len(line) + 1

            if current_size + line_size > self.max_chunk_size and chunk_lines:
                chunks.append(CodeChunk(
                    content="\n".join(chunk_lines),
                    chunk_type=ChunkType.BLOCK,
                    file_path=file_path,
                    start_line=base_line + i - len(chunk_lines) + 1,
                    end_line=base_line + i,
                    name=f"{elem['name']}_part{chunk_num}",
                    language=language
                ))
                chunk_num += 1
                chunk_lines = []
                current_size = 0

            chunk_lines.append(line)
            current_size += line_size

        if chunk_lines:
            chunks.append(CodeChunk(
                content="\n".join(chunk_lines),
                chunk_type=ChunkType.BLOCK,
                file_path=file_path,
                start_line=base_line + len(lines) - len(chunk_lines) + 1,
                end_line=base_line + len(lines),
                name=f"{elem['name']}_part{chunk_num}" if chunk_num > 0 else elem["name"],
                language=language
            ))

        return chunks
