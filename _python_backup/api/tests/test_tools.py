"""
Tools Tests
"""

import pytest
import tempfile
import os
from pathlib import Path

from app.services.tools.file_tools import (
    ReadFileTool,
    WriteFileTool,
    EditFileTool,
    ListDirectoryTool,
    SearchFilesTool
)
from app.services.tools.search_tools import SearchCodeTool


class TestFileTools:
    """Test file operation tools"""

    @pytest.fixture
    def temp_dir(self):
        """Create temporary directory for tests"""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield tmpdir

    @pytest.mark.asyncio
    async def test_write_and_read_file(self, temp_dir):
        """Test writing and reading a file"""
        write_tool = WriteFileTool(temp_dir)
        read_tool = ReadFileTool(temp_dir)

        # Write
        result = await write_tool.execute(
            path="test.txt",
            content="Hello, World!"
        )
        assert result.success
        assert result.result["bytes_written"] == 13

        # Read
        result = await read_tool.execute(path="test.txt")
        assert result.success
        assert "Hello, World!" in result.result["content"]

    @pytest.mark.asyncio
    async def test_read_nonexistent_file(self, temp_dir):
        """Test reading nonexistent file"""
        read_tool = ReadFileTool(temp_dir)
        result = await read_tool.execute(path="nonexistent.txt")
        assert not result.success
        assert "not found" in result.error.lower()

    @pytest.mark.asyncio
    async def test_read_file_with_lines(self, temp_dir):
        """Test reading specific lines"""
        write_tool = WriteFileTool(temp_dir)
        read_tool = ReadFileTool(temp_dir)

        # Write multiline file
        content = "\n".join([f"Line {i}" for i in range(1, 11)])
        await write_tool.execute(path="lines.txt", content=content)

        # Read specific lines
        result = await read_tool.execute(
            path="lines.txt",
            start_line=3,
            end_line=5
        )
        assert result.success
        assert result.result["shown_lines"] == 3
        assert "Line 3" in result.result["content"]
        assert "Line 5" in result.result["content"]

    @pytest.mark.asyncio
    async def test_edit_file(self, temp_dir):
        """Test editing a file"""
        write_tool = WriteFileTool(temp_dir)
        edit_tool = EditFileTool(temp_dir)
        read_tool = ReadFileTool(temp_dir)

        # Write initial content
        await write_tool.execute(
            path="edit.txt",
            content="Hello, World!"
        )

        # Edit
        result = await edit_tool.execute(
            path="edit.txt",
            old_string="World",
            new_string="Universe"
        )
        assert result.success
        assert result.result["replacements"] == 1

        # Verify
        result = await read_tool.execute(path="edit.txt")
        assert "Hello, Universe!" in result.result["content"]

    @pytest.mark.asyncio
    async def test_edit_replace_all(self, temp_dir):
        """Test edit with replace_all"""
        write_tool = WriteFileTool(temp_dir)
        edit_tool = EditFileTool(temp_dir)

        await write_tool.execute(
            path="multi.txt",
            content="foo bar foo baz foo"
        )

        result = await edit_tool.execute(
            path="multi.txt",
            old_string="foo",
            new_string="qux",
            replace_all=True
        )
        assert result.success
        assert result.result["replacements"] == 3

    @pytest.mark.asyncio
    async def test_list_directory(self, temp_dir):
        """Test listing directory"""
        # Create some files
        for name in ["file1.py", "file2.js", "file3.txt"]:
            Path(temp_dir, name).touch()
        Path(temp_dir, "subdir").mkdir()

        list_tool = ListDirectoryTool(temp_dir)
        result = await list_tool.execute(path=".")
        assert result.success
        assert result.result["count"] == 4

    @pytest.mark.asyncio
    async def test_list_directory_recursive(self, temp_dir):
        """Test recursive directory listing"""
        # Create nested structure
        Path(temp_dir, "dir1").mkdir()
        Path(temp_dir, "dir1", "file1.py").touch()
        Path(temp_dir, "dir1", "dir2").mkdir()
        Path(temp_dir, "dir1", "dir2", "file2.py").touch()

        list_tool = ListDirectoryTool(temp_dir)
        result = await list_tool.execute(path=".", recursive=True)
        assert result.success

    @pytest.mark.asyncio
    async def test_search_files(self, temp_dir):
        """Test file search"""
        # Create files
        for name in ["test1.py", "test2.py", "other.js"]:
            Path(temp_dir, name).touch()

        search_tool = SearchFilesTool(temp_dir)
        result = await search_tool.execute(pattern="*.py")
        assert result.success
        assert result.result["count"] == 2


class TestSearchCodeTool:
    """Test code search tool"""

    @pytest.fixture
    def code_dir(self):
        """Create directory with code files"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create Python file
            with open(os.path.join(tmpdir, "main.py"), "w") as f:
                f.write("""
def hello_world():
    print("Hello, World!")

def goodbye_world():
    print("Goodbye, World!")

class MyClass:
    def method(self):
        pass
""")

            # Create JS file
            with open(os.path.join(tmpdir, "app.js"), "w") as f:
                f.write("""
function helloWorld() {
    console.log("Hello, World!");
}

function goodbyeWorld() {
    console.log("Goodbye, World!");
}
""")

            yield tmpdir

    @pytest.mark.asyncio
    async def test_search_text(self, code_dir):
        """Test searching for text"""
        search_tool = SearchCodeTool(code_dir)
        result = await search_tool.execute(query="Hello")
        assert result.success
        assert result.result["count"] >= 2

    @pytest.mark.asyncio
    async def test_search_regex(self, code_dir):
        """Test regex search"""
        search_tool = SearchCodeTool(code_dir)
        result = await search_tool.execute(
            query=r"def \w+\(",
            is_regex=True
        )
        assert result.success
        assert result.result["count"] >= 3

    @pytest.mark.asyncio
    async def test_search_case_sensitive(self, code_dir):
        """Test case sensitive search"""
        search_tool = SearchCodeTool(code_dir)

        # Case insensitive (default)
        result = await search_tool.execute(query="hello")
        count_insensitive = result.result["count"]

        # Case sensitive
        result = await search_tool.execute(query="hello", case_sensitive=True)
        count_sensitive = result.result["count"]

        assert count_insensitive >= count_sensitive

    @pytest.mark.asyncio
    async def test_search_with_file_pattern(self, code_dir):
        """Test search with file pattern filter"""
        search_tool = SearchCodeTool(code_dir)
        result = await search_tool.execute(
            query="Hello",
            file_pattern="*.py"
        )
        assert result.success
        # Should only find in Python file
        for match in result.result["matches"]:
            assert match["file"].endswith(".py")
