"""
Vector Store - ChromaDB integration for storing and searching embeddings
"""

from typing import List, Optional, Dict, Any
import logging
import asyncio
import chromadb
from chromadb.config import Settings

from app.core.config import settings

logger = logging.getLogger(__name__)


class VectorStore:
    """ChromaDB-based vector store for RAG"""

    def __init__(self, collection_name: str = "code_embeddings"):
        self.collection_name = collection_name
        self._client = None
        self._collection = None

    def _get_client(self):
        """Get or create ChromaDB client"""
        if self._client is None:
            self._client = chromadb.PersistentClient(
                path=settings.CHROMA_PERSIST_DIRECTORY,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
        return self._client

    def _get_collection(self):
        """Get or create collection"""
        if self._collection is None:
            client = self._get_client()
            self._collection = client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
        return self._collection

    async def add(
        self,
        ids: List[str],
        embeddings: List[List[float]],
        documents: List[str],
        metadatas: Optional[List[Dict[str, Any]]] = None
    ):
        """Add documents to the vector store"""
        collection = self._get_collection()

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas or [{}] * len(ids)
            )
        )

        logger.debug(f"Added {len(ids)} documents to collection {self.collection_name}")

    async def update(
        self,
        ids: List[str],
        embeddings: Optional[List[List[float]]] = None,
        documents: Optional[List[str]] = None,
        metadatas: Optional[List[Dict[str, Any]]] = None
    ):
        """Update documents in the vector store"""
        collection = self._get_collection()

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: collection.update(
                ids=ids,
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas
            )
        )

    async def delete(self, ids: List[str]):
        """Delete documents from the vector store"""
        collection = self._get_collection()

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: collection.delete(ids=ids)
        )

        logger.debug(f"Deleted {len(ids)} documents from collection {self.collection_name}")

    async def query(
        self,
        query_embedding: List[float],
        n_results: int = 10,
        where: Optional[Dict[str, Any]] = None,
        where_document: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Query the vector store"""
        collection = self._get_collection()

        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(
            None,
            lambda: collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=where,
                where_document=where_document,
                include=["documents", "metadatas", "distances"]
            )
        )

        return {
            "ids": results["ids"][0] if results["ids"] else [],
            "documents": results["documents"][0] if results["documents"] else [],
            "metadatas": results["metadatas"][0] if results["metadatas"] else [],
            "distances": results["distances"][0] if results["distances"] else []
        }

    async def search_by_text(
        self,
        query_text: str,
        embeddings_service,
        n_results: int = 10,
        where: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Search using text query (generates embedding automatically)"""
        query_embedding = await embeddings_service.embed_text(query_text)
        return await self.query(
            query_embedding=query_embedding,
            n_results=n_results,
            where=where
        )

    async def get(
        self,
        ids: Optional[List[str]] = None,
        where: Optional[Dict[str, Any]] = None,
        limit: int = 100
    ) -> Dict[str, Any]:
        """Get documents by IDs or filter"""
        collection = self._get_collection()

        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(
            None,
            lambda: collection.get(
                ids=ids,
                where=where,
                limit=limit,
                include=["documents", "metadatas", "embeddings"]
            )
        )

        return results

    async def count(self) -> int:
        """Get total document count"""
        collection = self._get_collection()
        return collection.count()

    async def clear(self):
        """Clear all documents from collection"""
        client = self._get_client()
        try:
            client.delete_collection(self.collection_name)
        except ValueError:
            pass
        self._collection = None

    async def delete_by_metadata(self, where: Dict[str, Any]):
        """Delete documents matching metadata filter"""
        collection = self._get_collection()

        # Get matching IDs first
        results = await self.get(where=where, limit=10000)
        if results["ids"]:
            await self.delete(results["ids"])
            logger.debug(f"Deleted {len(results['ids'])} documents matching filter")
