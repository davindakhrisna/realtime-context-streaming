"""Embedding generation and ChromaDB storage."""

import uuid
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings


class EmbeddingStore:
    """Handles embedding generation and ChromaDB storage."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2", persist: bool = False):
        """
        Initialize the embedding store.

        Args:
            model_name: SentenceTransformer model to use for embeddings
            persist: Whether to persist ChromaDB to disk (default: False for in-memory)
        """
        # Initialize sentence transformer for embeddings
        self.model = SentenceTransformer(model_name)
        self.embedding_dim = self.model.get_sentence_embedding_dimension()

        # Initialize ChromaDB client
        if persist:
            self.client = chromadb.PersistentClient(path="./chroma_db")
        else:
            self.client = chromadb.Client(Settings(anonymized_telemetry=False))

        # Get or create collection for stream context
        self.collection = self.client.get_or_create_collection(
            name="stream_context",
            metadata={"description": "Storage for STT and OCR embeddings from stream pipeline"},
        )

    def generate_embedding(self, text: str) -> list[float]:
        """
        Generate embedding for a text string.

        Args:
            text: Input text to embed

        Returns:
            List of floats representing the embedding vector
        """
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    def add_embedding(
        self,
        text: str,
        source_type: str,  # "stt" or "ocr"
        timestamp: float,
        embedding_id: str | None = None,
    ) -> str:
        """
        Add an embedding to the store.

        Args:
            text: The text content
            source_type: Type of source ("stt" or "ocr")
            timestamp: Unix timestamp of when the text was captured
            embedding_id: Optional custom ID (generated if not provided)

        Returns:
            The ID of the added embedding
        """
        if embedding_id is None:
            embedding_id = str(uuid.uuid4())

        # Generate embedding
        embedding = self.generate_embedding(text)

        # Add to ChromaDB
        self.collection.add(
            ids=[embedding_id],
            embeddings=[embedding],
            metadatas=[
                {
                    "text": text,
                    "source_type": source_type,
                    "timestamp": timestamp,
                }
            ],
        )

        return embedding_id

    def get_embeddings(
        self,
        limit: int = 100,
        source_type: str | None = None,
    ) -> list[dict]:
        """
        Retrieve embeddings from the store.

        Args:
            limit: Maximum number of embeddings to return
            source_type: Filter by source type ("stt" or "ocr"), or None for all

        Returns:
            List of embedding records with id, text, embedding, source_type, timestamp
        """
        # Build where clause if filtering by source_type
        where = None
        if source_type:
            where = {"source_type": source_type}

        results = self.collection.get(
            limit=limit,
            where=where,
            include=["embeddings", "metadatas"],
        )

        embeddings = []
        for i, id_ in enumerate(results["ids"]):
            metadata = results["metadatas"][i] if results["metadatas"] else {}
            embedding = results["embeddings"][i] if results["embeddings"] else []

            embeddings.append(
                {
                    "id": id_,
                    "text": metadata.get("text", ""),
                    "embedding": embedding,
                    "source_type": metadata.get("source_type", "unknown"),
                    "timestamp": metadata.get("timestamp", 0),
                }
            )

        # Sort by timestamp descending (newest first)
        embeddings.sort(key=lambda x: x["timestamp"], reverse=True)

        return embeddings

    def search_embeddings(
        self,
        query: str,
        limit: int = 10,
        source_type: str | None = None,
    ) -> list[dict]:
        """
        Search for similar embeddings using a query string.

        Args:
            query: Search query text
            limit: Maximum number of results to return
            source_type: Filter by source type ("stt" or "ocr"), or None for all

        Returns:
            List of search results with id, text, distance, source_type, timestamp
        """
        # Generate query embedding
        query_embedding = self.generate_embedding(query)

        # Build where clause if filtering by source_type
        where = None
        if source_type:
            where = {"source_type": source_type}

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=limit,
            where=where,
            include=["metadatas", "distances"],
        )

        search_results = []
        if results["ids"] and results["ids"][0]:
            for i, id_ in enumerate(results["ids"][0]):
                metadata = results["metadatas"][0][i] if results["metadatas"] else {}
                distance = results["distances"][0][i] if results["distances"] else 0

                search_results.append(
                    {
                        "id": id_,
                        "text": metadata.get("text", ""),
                        "distance": distance,
                        "source_type": metadata.get("source_type", "unknown"),
                        "timestamp": metadata.get("timestamp", 0),
                    }
                )

        return search_results

    def get_stats(self) -> dict:
        """Get statistics about the embedding store."""
        count = self.collection.count()
        return {
            "total_embeddings": count,
            "embedding_dimension": self.embedding_dim,
        }


# Global instance for reuse
_embedding_store: EmbeddingStore | None = None


def get_embedding_store() -> EmbeddingStore:
    """Get or create the global embedding store instance."""
    global _embedding_store
    if _embedding_store is None:
        _embedding_store = EmbeddingStore()
    return _embedding_store
