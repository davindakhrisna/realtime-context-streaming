# Real-Time Context Streaming - Study Features Implementation

## Overview

This implementation adds **AI-powered study features** to your real-time context streaming application, including:

- **10-second batched embedding** for efficient context management
- **Groq Cloud LLM integration** for intelligent RAG queries
- **Flashcard generation** with spaced repetition tracking
- **Study statistics dashboard** with performance metrics
- **Study materials generation** from screen content

---

## Architecture

### Backend (FastAPI)

#### New Files Created:

1. **`ingestion_buffer.py`** - Manages 10-second batching window for context aggregation
2. **`groq_service.py`** - Groq API client for cloud LLM queries
3. **`study_models.py`** - SQLAlchemy models for study tracking (Flashcard, StudySession, UserPerformance)

#### Updated Files:

1. **`main.py`** - Added new API endpoints:
   - `POST /api/v1/inquire` - RAG-powered inquiry endpoint
   - `POST /api/v1/generate/flashcards` - Generate flashcards from context
   - `POST /api/v1/generate/materials` - Generate study materials
   - `GET /api/v1/stats` - Get study statistics
   - `POST /api/v1/flashcard/review` - Update flashcard review stats

2. **`db.py`** - Enhanced with helper functions for session queries
3. **`ws_manager.py`** - Integrated with ingestion buffer for automatic batching

### Frontend (React + TanStack)

#### New Files Created:

1. **`src/lib/atoms/queryAtoms.ts`** - Jotai atoms for state management
2. **`src/lib/api/client.ts`** - API client for backend communication
3. **`src/lib/hooks/useStudyQueries.ts`** - React Query hooks
4. **`src/lib/components/StudyAssistantPanel.tsx`** - Chat UI for inquiries
5. **`src/lib/components/FlashcardView.tsx`** - Flip card UI with spaced repetition
6. **`src/lib/components/StatsDashboard.tsx`** - Statistics visualization

#### New Routes:

1. **`/study/flashcards`** - Flashcard review interface
2. **`/study/stats`** - Study statistics dashboard
3. **`/study/materials`** - Study materials generator

---

## Setup Instructions

### 1. Configure Groq API Key

Get your API key from [https://console.groq.com/keys](https://console.groq.com/keys)

```bash
cd server
cp .env.example .env
# Edit .env and add your GROQ_API_KEY
```

### 2. Install Dependencies

**Server:**
```bash
cd server
uv sync
```

**Client:**
```bash
cd client
pnpm install
```

### 3. Run the Application

**Server:**
```bash
cd server
uv run fastapi dev
```

**Client:**
```bash
cd client
pnpm dev
```

---

## API Endpoints Reference

### Inquiry Endpoint

```http
POST /api/v1/inquire
Content-Type: application/json

{
  "query": "What was discussed about React hooks?",
  "session_id": "optional-session-id",
  "n_results": 5
}
```

**Response:**
```json
{
  "answer": "Based on your screen content...",
  "sources": [
    {
      "start_time": "2025-02-25T10:30:00",
      "end_time": "2025-02-25T10:30:10",
      "session_id": "...",
      "relevance_score": 0.95
    }
  ],
  "used_groq": true,
  "model": "llama-3.1-70b-versatile"
}
```

### Flashcard Generation

```http
POST /api/v1/generate/flashcards
Content-Type: application/json

{
  "session_id": "optional-session-id",
  "count": 10
}
```

**Response:**
```json
{
  "flashcards": [
    {
      "id": "...",
      "question": "What is RAG?",
      "answer": "Retrieval-Augmented Generation...",
      "difficulty": "medium",
      "topic": "AI/ML"
    }
  ],
  "success": true
}
```

### Study Materials

```http
POST /api/v1/generate/materials
Content-Type: application/json

{
  "session_id": "optional-session-id"
}
```

**Response:**
```json
{
  "success": true,
  "materials": "# Study Notes\n\n## Key Concepts\n\n...",
  "format": "markdown",
  "model": "llama-3.1-70b-versatile"
}
```

---

## Features

### 1. 10-Second Batching

Instead of embedding every frame instantly, the system:
- Collects screen frames and STT transcripts for 10 seconds
- Combines them into a single context chunk
- Generates one embedding per chunk
- Reduces storage and improves context coherence

### 2. RAG-Powered Inquiry

Users can ask questions about their screen content:
- Retrieves relevant context from ChromaDB
- Sends to Groq LLM with RAG prompt
- Returns intelligent answers with sources
- Falls back to local search if Groq unavailable

### 3. Flashcard Generation

AI-powered flashcard creation:
- Generates Q&A pairs from screen content
- Includes difficulty levels and topic tags
- Tracks spaced repetition (SM-2 algorithm)
- Flip card UI with "Know it" / "Don't Know it" buttons

### 4. Statistics Dashboard

Track your learning progress:
- Time studied
- Flashcard accuracy
- Topic distribution
- Session history

### 5. Study Materials

Generate comprehensive study notes:
- Key concepts and definitions
- Structured markdown format
- Export to PDF/Markdown

---

## Rate Limiting

Endpoints are rate-limited to prevent abuse:

| Endpoint | Limit |
|----------|-------|
| `/api/v1/inquire` | 10/minute |
| `/api/v1/generate/flashcards` | 5/minute |
| `/api/v1/generate/materials` | 5/minute |
| `/api/v1/stats` | 20/minute |

---

## Database Schema

### ChromaDB Collection

```python
{
  "id": "chunk_1234567890",
  "document": "Combined text from frames + transcripts",
  "metadata": {
    "start_time": "2025-02-25T10:30:00",
    "end_time": "2025-02-25T10:30:10",
    "session_id": "...",
    "content_type": "mixed",
    "transcript_count": 3,
    "frame_count": 2,
    "duration_sec": 10.0
  }
}
```

### SQLite Tables

**StudySession:**
- id, start_time, end_time, total_chunks, total_flashcards, is_active

**Flashcard:**
- id, session_id, question, answer, difficulty, topic
- times_reviewed, times_correct, last_reviewed, next_review
- ease_factor, interval_days

**UserPerformance:**
- id, session_id, accuracy_rate, time_spent_minutes
- flashcards_reviewed, topics_covered, difficulty_average

---

## Troubleshooting

### Groq API Errors

If you see "Groq API key not configured":
1. Ensure `.env` file exists in server directory
2. Check `GROQ_API_KEY` is set correctly
3. Restart the server after changing `.env`

### Build Errors

**Client build fails:**
```bash
cd client
rm -rf node_modules .output
pnpm install
pnpm build
```

**Server import errors:**
```bash
cd server
uv sync --force
```

### WebSocket Connection Issues

Ensure:
1. Server is running on port 8000
2. CORS allows your client origin
3. Browser supports `getDisplayMedia` (Chrome/Edge)

---

## Future Improvements

- [ ] Add user authentication
- [ ] Implement cloud sync for flashcards
- [ ] Add more export formats (Anki, Quizlet)
- [ ] Improve VAD for better speech detection
- [ ] Add multi-language support
- [ ] Implement real-time collaboration

---

## Credits

Built with:
- **FastAPI** - Backend framework
- **Groq** - Cloud LLM inference
- **ChromaDB** - Vector database
- **TanStack Router** - Client routing
- **Jotai** - State management
- **Recharts** - Data visualization
