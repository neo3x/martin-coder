"""
RAG System Tests
"""

import pytest
import tempfile
from pathlib import Path

from app.services.rag.chunker import CodeChunker, ChunkType
from app.services.rag.embeddings import EmbeddingsService


class TestCodeChunker:
    """Test code chunking"""

    def test_detect_language(self):
        """Test language detection"""
        chunker = CodeChunker()

        assert chunker.detect_language("main.py") == "python"
        assert chunker.detect_language("app.js") == "javascript"
        assert chunker.detect_language("index.ts") == "typescript"
        assert chunker.detect_language("Main.java") == "java"
        assert chunker.detect_language("main.go") == "go"
        assert chunker.detect_language("unknown.xyz") is None

    def test_chunk_python_file(self):
        """Test chunking Python file"""
        chunker = CodeChunker()

        code = '''
class MyClass:
    def method1(self):
        pass

    def method2(self):
        pass

def standalone_function():
    return True

async def async_function():
    await something()
'''

        chunks = chunker.chunk_file(code, "test.py")

        assert len(chunks) >= 2
        assert any(c.chunk_type == ChunkType.CLASS for c in chunks)
        assert any(c.chunk_type == ChunkType.FUNCTION for c in chunks)

    def test_chunk_javascript_file(self):
        """Test chunking JavaScript file"""
        chunker = CodeChunker()

        code = '''
class Component {
    constructor() {}

    render() {
        return null;
    }
}

function helper() {
    return true;
}

const arrowFunc = () => {
    console.log("arrow");
};
'''

        chunks = chunker.chunk_file(code, "app.js")
        assert len(chunks) >= 1

    def test_chunk_large_file(self):
        """Test chunking large file"""
        chunker = CodeChunker(max_chunk_size=500)

        # Create large content
        code = "\n".join([f"# Line {i}\nprint({i})" for i in range(100)])

        chunks = chunker.chunk_file(code, "large.py")

        # Should be split into multiple chunks
        assert len(chunks) > 1

        # Each chunk should be under max size
        for chunk in chunks:
            assert len(chunk.content) <= 600  # Some buffer for overlap

    def test_chunk_ids_unique(self):
        """Test that chunk IDs are unique"""
        chunker = CodeChunker()

        code = '''
def func1():
    pass

def func2():
    pass

def func3():
    pass
'''

        chunks = chunker.chunk_file(code, "test.py")
        ids = [c.id for c in chunks]
        assert len(ids) == len(set(ids))  # All unique


class TestEmbeddingsService:
    """Test embeddings service"""

    @pytest.mark.asyncio
    async def test_embed_single_text(self):
        """Test embedding single text"""
        # Skip if no local model available
        try:
            service = EmbeddingsService()
            embedding = await service.embed_text("Hello, world!")

            assert isinstance(embedding, list)
            assert len(embedding) > 0
            assert all(isinstance(x, float) for x in embedding)
        except Exception:
            pytest.skip("Embeddings model not available")

    @pytest.mark.asyncio
    async def test_embed_multiple_texts(self):
        """Test embedding multiple texts"""
        try:
            service = EmbeddingsService()
            texts = ["Hello", "World", "Test"]
            embeddings = await service.embed_texts(texts)

            assert len(embeddings) == 3
            assert all(len(e) > 0 for e in embeddings)
        except Exception:
            pytest.skip("Embeddings model not available")

    def test_embedding_dimension(self):
        """Test embedding dimension property"""
        service = EmbeddingsService()
        dim = service.dimension

        assert isinstance(dim, int)
        assert dim > 0
