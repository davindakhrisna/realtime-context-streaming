"""FastAPI server for stream context pipeline."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import (
    STTRequest,
    STTResponse,
    OCRRequest,
    OCRResponse,
    EmbeddingsResponse,
    EmbeddingItem,
    SearchRequest,
    SearchResponse,
    SearchResult,
)
from ocr import get_ocr_processor
from embeddings import get_embedding_store

app = FastAPI(title="Stream Context Pipeline API")

# Enable CORS for client access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    """Root endpoint with API information."""
    return {
        "message": "Stream Context Pipeline API",
        "endpoints": {
            "POST /api/stt": "Process speech-to-text and store embedding",
            "POST /api/ocr": "Process image OCR and store embedding",
            "GET /api/embeddings": "Retrieve stored embeddings",
            "POST /api/embeddings/search": "Search embeddings by query",
            "GET /api/stats": "Get embedding store statistics",
        },
    }


@app.post("/api/stt", response_model=STTResponse)
def process_stt(request: STTRequest):
    """
    Process speech-to-text transcription.

    Receives transcribed text from client, generates embedding,
    and stores it in ChromaDB.

    Args:
        request: STTRequest with text and timestamp

    Returns:
        STTResponse with success status and embedding ID
    """
    try:
        if not request.text.strip():
            return STTResponse(
                success=False,
                message="Empty transcription text",
            )

        # Store embedding
        embedding_store = get_embedding_store()
        embedding_id = embedding_store.add_embedding(
            text=request.text.strip(),
            source_type="stt",
            timestamp=request.timestamp,
        )

        return STTResponse(
            success=True,
            embedding_id=embedding_id,
            message="STT text processed and stored successfully",
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing STT: {str(e)}")


@app.post("/api/ocr", response_model=OCRResponse)
def process_ocr(request: OCRRequest):
    """
    Process OCR on an image frame.

    Receives base64-encoded image, extracts text using PaddleOCR,
    generates embedding, and stores it in ChromaDB.

    Args:
        request: OCRRequest with base64 image and timestamp

    Returns:
        OCRResponse with extracted text and embedding ID
    """
    try:
        if not request.image:
            return OCRResponse(
                success=False,
                text="",
                message="No image provided",
            )

        # Extract text from image
        ocr_processor = get_ocr_processor()
        extracted_text = ocr_processor.process_base64_image(request.image)

        if not extracted_text.strip():
            return OCRResponse(
                success=True,
                text="",
                message="No text detected in image",
            )

        # Store embedding
        embedding_store = get_embedding_store()
        embedding_id = embedding_store.add_embedding(
            text=extracted_text.strip(),
            source_type="ocr",
            timestamp=request.timestamp,
        )

        return OCRResponse(
            success=True,
            text=extracted_text.strip(),
            embedding_id=embedding_id,
            message="OCR processed and stored successfully",
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing OCR: {str(e)}")


@app.get("/api/embeddings", response_model=EmbeddingsResponse)
def get_embeddings(
    limit: int = 100,
    source_type: str | None = None,
):
    """
    Retrieve stored embeddings.

    Args:
        limit: Maximum number of embeddings to return
        source_type: Filter by "stt" or "ocr"

    Returns:
        EmbeddingsResponse with list of embeddings
    """
    try:
        embedding_store = get_embedding_store()
        embeddings_data = embedding_store.get_embeddings(
            limit=limit,
            source_type=source_type,
        )

        embeddings = [
            EmbeddingItem(
                id=item["id"],
                text=item["text"],
                embedding=item["embedding"],
                source_type=item["source_type"],
                timestamp=item["timestamp"],
            )
            for item in embeddings_data
        ]

        return EmbeddingsResponse(embeddings=embeddings)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving embeddings: {str(e)}")


@app.post("/api/embeddings/search", response_model=SearchResponse)
def search_embeddings(request: SearchRequest):
    """
    Search for similar embeddings.

    Args:
        request: SearchRequest with query text and limit

    Returns:
        SearchResponse with list of search results
    """
    try:
        embedding_store = get_embedding_store()
        results_data = embedding_store.search_embeddings(
            query=request.query,
            limit=request.limit,
        )

        results = [
            SearchResult(
                id=item["id"],
                text=item["text"],
                distance=item["distance"],
                source_type=item["source_type"],
                timestamp=item["timestamp"],
            )
            for item in results_data
        ]

        return SearchResponse(results=results)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching embeddings: {str(e)}")


@app.get("/api/stats")
def get_stats():
    """Get statistics about the embedding store."""
    try:
        embedding_store = get_embedding_store()
        return embedding_store.get_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting stats: {str(e)}")
