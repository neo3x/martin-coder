"""
RAG Retriever - Retrieve relevant code context
"""

from typing import List, Dict, Any, Optional
import logging

from app.services.rag.embeddings import EmbeddingsService
from app.services.rag.vector_store import VectorStore
from app.services.rag.chunker import CodeChunker, CodeChunk

logger = logging.getLogger(__name__)


class RAGRetriever:
    """Retrieval-Augmented Generation for code"""

    def __init__(
        self,
        project_id: str,
        embeddings_service: Optional[EmbeddingsService] = None
    ):
        self.project_id = project_id
        self.embeddings = embeddings_service or EmbeddingsService()
        self.vector_store = VectorStore(collection_name=f"project_{project_id}")
        self.chunker = CodeChunker()

    async def index_file(self, file_path: str, content: str) -> int:
        """Index a single file"""
        # Chunk the file
        chunks = self.chunker.chunk_file(content, file_path)

        if not chunks:
            return 0

        # Generate embeddings
        texts = [chunk.content for chunk in chunks]
        embeddings = await self.embeddings.embed_texts(texts)

        # Prepare data for vector store
        ids = [chunk.id for chunk in chunks]
        documents = texts
        metadatas = [{
            "file_path": chunk.file_path,
            "chunk_type": chunk.chunk_type.value,
            "start_line": chunk.start_line,
            "end_line": chunk.end_line,
            "name": chunk.name or "",
            "language": chunk.language or "",
            "project_id": self.project_id
        } for chunk in chunks]

        # Delete existing chunks for this file
        await self.vector_store.delete_by_metadata({
            "file_path": file_path,
            "project_id": self.project_id
        })

        # Add new chunks
        await self.vector_store.add(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )

        return len(chunks)

    async def index_files(self, files: List[Dict[str, str]]) -> int:
        """Index multiple files"""
        total_indexed = 0

        for file_data in files:
            try:
                count = await self.index_file(
                    file_data["path"],
                    file_data["content"]
                )
                total_indexed += count
            except Exception as e:
                logger.error(f"Error indexing {file_data['path']}: {e}")

        return total_indexed

    async def search(
        self,
        query: str,
        n_results: int = 10,
        file_filter: Optional[str] = None,
        language_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Search for relevant code chunks"""
        # Build filter - ChromaDB supports $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin
        where = {"project_id": self.project_id}

        # For file_filter, we do post-filtering since ChromaDB doesn't support $contains
        # Only add exact match filters here
        if language_filter:
            where["language"] = language_filter

        # Search with more results if we need to post-filter
        search_limit = n_results * 3 if file_filter else n_results

        # Search
        results = await self.vector_store.search_by_text(
            query_text=query,
            embeddings_service=self.embeddings,
            n_results=search_limit,
            where=where if len(where) > 1 else None
        )

        # Format results with optional post-filtering
        formatted = []
        for i, doc in enumerate(results["documents"]):
            metadata = results["metadatas"][i] if results["metadatas"] else {}

            # Apply file_filter as post-filter (substring match)
            if file_filter:
                file_path = metadata.get("file_path", "")
                if file_filter.lower() not in file_path.lower():
                    continue

            formatted.append({
                "content": doc,
                "file_path": metadata.get("file_path", ""),
                "start_line": metadata.get("start_line", 0),
                "end_line": metadata.get("end_line", 0),
                "chunk_type": metadata.get("chunk_type", ""),
                "name": metadata.get("name", ""),
                "language": metadata.get("language", ""),
                "score": 1 - results["distances"][i] if results["distances"] else 0
            })

            # Stop once we have enough results
            if len(formatted) >= n_results:
                break

        return formatted

    async def get_context_for_query(
        self,
        query: str,
        max_tokens: int = 8000,
        include_file_structure: bool = True
    ) -> str:
        """Get relevant context for an AI query"""
        results = await self.search(query, n_results=20)

        context_parts = []
        current_tokens = 0

        # Estimate 4 chars per token
        chars_per_token = 4
        max_chars = max_tokens * chars_per_token

        for result in results:
            chunk_text = f"\n--- {result['file_path']} (lines {result['start_line']}-{result['end_line']}) ---\n"
            chunk_text += result["content"]
            chunk_text += "\n"

            chunk_size = len(chunk_text)

            if current_tokens + (chunk_size // chars_per_token) > max_tokens:
                break

            context_parts.append(chunk_text)
            current_tokens += chunk_size // chars_per_token

        return "\n".join(context_parts)

    async def remove_file(self, file_path: str):
        """Remove a file from the index"""
        await self.vector_store.delete_by_metadata({
            "file_path": file_path,
            "project_id": self.project_id
        })

    async def clear_index(self):
        """Clear all indexed data for this project"""
        await self.vector_store.clear()

    async def get_stats(self) -> Dict[str, Any]:
        """Get indexing statistics"""
        count = await self.vector_store.count()
        return {
            "project_id": self.project_id,
            "total_chunks": count
        }
