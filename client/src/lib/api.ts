/**
 * API client for Stream Context Pipeline server.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface STTRequest {
  text: string;
  timestamp: number;
}

export interface STTResponse {
  success: boolean;
  embedding_id?: string;
  message: string;
}

export interface OCRRequest {
  image: string;
  timestamp: number;
}

export interface OCRResponse {
  success: boolean;
  text: string;
  embedding_id?: string;
  message: string;
}

export interface EmbeddingItem {
  id: string;
  text: string;
  embedding: number[];
  source_type: "stt" | "ocr";
  timestamp: number;
}

export interface EmbeddingsResponse {
  embeddings: EmbeddingItem[];
}

export interface SearchResult {
  id: string;
  text: string;
  distance: number;
  source_type: "stt" | "ocr";
  timestamp: number;
}

export interface SearchResponse {
  results: SearchResult[];
}

export interface StatsResponse {
  total_embeddings: number;
  embedding_dimension: number;
}

/**
 * Send STT transcription to server for embedding storage.
 */
export async function sendSTT(request: STTRequest): Promise<STTResponse> {
  const response = await fetch(`${API_BASE_URL}/api/stt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to send STT");
  }

  return response.json();
}

/**
 * Send image frame to server for OCR processing.
 */
export async function sendOCR(request: OCRRequest): Promise<OCRResponse> {
  const response = await fetch(`${API_BASE_URL}/api/ocr`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to send OCR");
  }

  return response.json();
}

/**
 * Retrieve stored embeddings from server.
 */
export async function getEmbeddings(
  limit = 100,
  sourceType?: "stt" | "ocr",
): Promise<EmbeddingsResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    ...(sourceType && { source_type: sourceType }),
  });

  const response = await fetch(`${API_BASE_URL}/api/embeddings?${params}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get embeddings");
  }

  return response.json();
}

/**
 * Search embeddings by query.
 */
export async function searchEmbeddings(
  query: string,
  limit = 10,
): Promise<SearchResponse> {
  const response = await fetch(`${API_BASE_URL}/api/embeddings/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, limit }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to search embeddings");
  }

  return response.json();
}

/**
 * Get embedding store statistics.
 */
export async function getStats(): Promise<StatsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/stats`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get stats");
  }

  return response.json();
}
