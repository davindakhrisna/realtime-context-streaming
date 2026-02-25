/**
 * API client for communicating with the FastAPI backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface InquiryRequest {
  query: string;
  session_id?: string | null;
  n_results?: number;
}

export interface InquiryResponse {
  answer: string;
  sources: Array<{
    id: number;
    start_time: string;
    end_time: string;
    session_id: string;
    relevance_score: number;
  }>;
  model: string;
  used_groq: boolean;
  error?: string | null;
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic?: string;
}

export interface FlashcardGenerateRequest {
  session_id?: string | null;
  time_range?: { start: string; end: string };
  count?: number;
}

export interface FlashcardResponse {
  flashcards: Flashcard[];
  success: boolean;
  error?: string | null;
}

export interface StudyMaterialResponse {
  success: boolean;
  materials: string;
  format: string;
  model: string;
}

export interface SessionStats {
  session_id: string;
  duration_minutes: number;
  total_flashcards: number;
  flashcards_reviewed: number;
  accuracy_rate: number;
  topics_covered: string[];
  difficulty_distribution: {
    easy: number;
    medium: number;
    hard: number;
  };
}

/**
 * Send an inquiry to the AI assistant
 */
export async function inquire(request: InquiryRequest): Promise<InquiryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/inquire`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to send inquiry');
  }

  return response.json();
}

/**
 * Generate flashcards from session content
 */
export async function generateFlashcards(
  request: FlashcardGenerateRequest,
): Promise<FlashcardResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/generate/flashcards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to generate flashcards');
  }

  return response.json();
}

/**
 * Generate study materials from session content
 */
export async function generateStudyMaterials(
  request: { session_id?: string | null; time_range?: { start: string; end: string } },
): Promise<StudyMaterialResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/generate/materials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to generate study materials');
  }

  return response.json();
}

/**
 * Get session statistics
 */
export async function getSessionStats(sessionId?: string): Promise<SessionStats | { sessions: SessionStats[] }> {
  const url = sessionId
    ? `${API_BASE_URL}/api/v1/stats?session_id=${encodeURIComponent(sessionId)}`
    : `${API_BASE_URL}/api/v1/stats`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to get stats');
  }

  return response.json();
}

/**
 * Get all session IDs
 */
export async function getSessions(): Promise<{ sessions: string[] }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/sessions`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to get sessions');
  }

  return response.json();
}

/**
 * Update flashcard review statistics
 */
export async function reviewFlashcard(flashcardId: string, wasCorrect: boolean): Promise<{
  success: boolean;
  times_reviewed: number;
  times_correct: number;
  next_review: string | null;
}> {
  const response = await fetch(`${API_BASE_URL}/api/v1/flashcard/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      flashcard_id: flashcardId,
      was_correct: wasCorrect,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to update flashcard');
  }

  return response.json();
}
