"""Pydantic models for API requests and responses."""

from pydantic import BaseModel
from typing import Literal


class STTRequest(BaseModel):
    """Request model for speech-to-text processing."""

    text: str
    timestamp: float


class STTResponse(BaseModel):
    """Response model for speech-to-text processing."""

    success: bool
    embedding_id: str | None = None
    message: str


class OCRRequest(BaseModel):
    """Request model for OCR processing."""

    image: str  # base64 encoded image
    timestamp: float


class OCRResponse(BaseModel):
    """Response model for OCR processing."""

    success: bool
    text: str
    embedding_id: str | None = None
    message: str


class EmbeddingItem(BaseModel):
    """Single embedding item."""

    id: str
    text: str
    embedding: list[float]
    source_type: Literal["stt", "ocr"]
    timestamp: float


class EmbeddingsResponse(BaseModel):
    """Response model for retrieving embeddings."""

    embeddings: list[EmbeddingItem]


class SearchRequest(BaseModel):
    """Request model for searching embeddings."""

    query: str
    limit: int = 10


class SearchResult(BaseModel):
    """Single search result."""

    id: str
    text: str
    distance: float
    source_type: Literal["stt", "ocr"]
    timestamp: float


class SearchResponse(BaseModel):
    """Response model for search results."""

    results: list[SearchResult]
