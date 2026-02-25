import chromadb
from chromadb.utils import embedding_functions

# Handles initialization, embeddings, and persistent storage

client = chromadb.PersistentClient(path="./chroma_db")

embedding_func = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

collection = client.get_or_create_collection(
    name="embedding_storage",
    embedding_function=embedding_func,
    metadata={
        "hnsw:space": "cosine",
        "description": "Real-time context streaming storage with 10-second batched embeddings"
    }
)


def query_by_session(session_id: str, n_results: int = 10):
    """Query all chunks from a specific session."""
    return collection.get(
        where={"session_id": session_id},
        limit=n_results
    )


def query_by_time_range(start_time: str, end_time: str, n_results: int = 50):
    """Query chunks within a time range."""
    return collection.get(
        where={
            "start_time": {"$gte": start_time},
            "end_time": {"$lte": end_time}
        },
        limit=n_results
    )


def get_session_ids():
    """Get all unique session IDs in the collection."""
    try:
        all_data = collection.get(include=["metadatas"])
        session_ids = set()
        for metadata in all_data.get("metadatas", []):
            if metadata and "session_id" in metadata:
                session_ids.add(metadata["session_id"])
        return list(session_ids)
    except Exception as e:
        print(f"Error getting session IDs: {e}")
        return []
