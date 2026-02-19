"""
Embeddings Service - Generate embeddings for code and text
"""

from typing import List, Optional
import logging
import asyncio

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmbeddingsService:
    """Service for generating embeddings"""

    def __init__(self):
        self.provider = settings.EMBEDDINGS_PROVIDER
        self.model = settings.EMBEDDINGS_MODEL
        self._local_model = None
        self._openai_client = None

    async def _get_local_model(self):
        """Lazy load local embedding model"""
        if self._local_model is None:
            from sentence_transformers import SentenceTransformer

            loop = asyncio.get_event_loop()
            self._local_model = await loop.run_in_executor(
                None,
                lambda: SentenceTransformer(self.model)
            )
        return self._local_model

    async def _get_openai_client(self):
        """Lazy load OpenAI client"""
        if self._openai_client is None:
            from openai import AsyncOpenAI
            self._openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return self._openai_client

    async def embed_text(self, text: str) -> List[float]:
        """Generate embedding for a single text"""
        embeddings = await self.embed_texts([text])
        return embeddings[0]

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        if not texts:
            return []

        if self.provider == "local":
            return await self._embed_local(texts)
        elif self.provider == "openai":
            return await self._embed_openai(texts)
        else:
            raise ValueError(f"Unknown embeddings provider: {self.provider}")

    async def _embed_local(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings using local model"""
        model = await self._get_local_model()

        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(
            None,
            lambda: model.encode(texts, convert_to_numpy=True)
        )

        return [emb.tolist() for emb in embeddings]

    async def _embed_openai(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings using OpenAI"""
        client = await self._get_openai_client()

        # Process in batches
        batch_size = 100
        all_embeddings = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]

            response = await client.embeddings.create(
                model=self.model or "text-embedding-3-small",
                input=batch
            )

            batch_embeddings = [item.embedding for item in response.data]
            all_embeddings.extend(batch_embeddings)

        return all_embeddings

    @property
    def dimension(self) -> int:
        """Get embedding dimension"""
        if self.provider == "local":
            # Common dimensions for sentence-transformers models
            dimensions = {
                "all-MiniLM-L6-v2": 384,
                "all-mpnet-base-v2": 768,
                "paraphrase-MiniLM-L6-v2": 384
            }
            return dimensions.get(self.model, 384)
        elif self.provider == "openai":
            dimensions = {
                "text-embedding-3-small": 1536,
                "text-embedding-3-large": 3072,
                "text-embedding-ada-002": 1536
            }
            return dimensions.get(self.model, 1536)
        return 384
