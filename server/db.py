import chromadb
from chromadb.utils import embedding_functions

# Handles initialization, embeddings, and persistent storage

client = chromadb.PersistentClient(path="./chroma_db")

embedding_func = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

collection = client.get_or_create_collection(
    name="embedding_storage",
    embedding_function=embedding_func
)
