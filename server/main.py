from fastapi import FastAPI, WebSocket, UploadFile, File, HTTPException, Depends, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from db import collection, query_by_session, get_session_ids
from ws_manager import handle_audio_stream
from vision import load_model, analyze_image
from ingestion_buffer import (
    start_ingestion_service,
    stop_ingestion_service,
    add_to_buffer,
    ingestion_buffer
)
from groq_service import get_groq_service, GroqService
from study_models import (
    init_db,
    get_db,
    get_session_stats,
    get_all_sessions_stats,
    StudySession,
    Flashcard,
    UserPerformance,
    SessionLocal
)
from sqlalchemy.orm import Session
import asyncio
import time
import uuid
import json
import re

# Rate limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Real-Time Context Streaming API")

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://localhost:3001",  # TanStack Start
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    try:
        import traceback
        print("🚀 Starting vision model load...", flush=True)
        load_model()
        print("✅ Vision model + Adapter loaded successfully", flush=True)
    except Exception as e:
        print(f"❌ Vision model failed: {e}", flush=True)
        print(f"📋 Full Traceback:", flush=True)
        print(traceback.format_exc(), flush=True)
    
    # Initialize SQLite database
    try:
        init_db()
        print("✅ SQLite database initialized", flush=True)
    except Exception as e:
        print(f"❌ Database initialization failed: {e}", flush=True)
    
    # Start ingestion service
    try:
        await start_ingestion_service()
        print("✅ Ingestion service started", flush=True)
    except Exception as e:
        print(f"❌ Ingestion service failed: {e}", flush=True)


@app.on_event("shutdown")
async def shutdown_event():
    await stop_ingestion_service()


# ============ Request/Response Models ============

class Item(BaseModel):
    id: str
    text: str


class InquiryRequest(BaseModel):
    query: str = Field(..., description="User's question")
    session_id: Optional[str] = Field(None, description="Optional session ID to limit search")
    n_results: int = Field(default=5, description="Number of context chunks to retrieve")


class InquiryResponse(BaseModel):
    answer: str
    sources: List[dict] = []
    model: str = ""
    used_groq: bool = False
    error: Optional[str] = None


class FlashcardGenerateRequest(BaseModel):
    session_id: Optional[str] = Field(None, description="Session ID to generate flashcards from")
    time_range: Optional[dict] = Field(None, description="Time range {start, end}")
    count: int = Field(default=5, description="Number of flashcards to generate")


class FlashcardResponse(BaseModel):
    flashcards: List[dict]
    success: bool
    error: Optional[str] = None


class FlashcardUpdateRequest(BaseModel):
    flashcard_id: str
    was_correct: bool


class StudyMaterialRequest(BaseModel):
    session_id: Optional[str] = Field(None, description="Session ID to generate materials from")
    time_range: Optional[dict] = Field(None, description="Time range {start, end}")


# ============ Vector DB Endpoints ============

@app.post("/add")
@limiter.limit("20/minute")
def add_item(request: Request, item: Item):
    """Add a single item to the vector store."""
    collection.add(documents=[item.text], ids=[item.id])
    return {"status": "added"}


@app.post("/query")
@limiter.limit("30/minute")
def query_items(request: Request, text: str, n: int = 5):
    """Query the vector store for similar items."""
    return collection.query(query_texts=[text], n_results=n)


# ============ Groq-Powered Inquiry Endpoint ============

@app.post("/api/v1/inquire", response_model=InquiryResponse)
@limiter.limit("10/minute")
async def inquire(request: Request, inquiry_req: InquiryRequest):
    """
    Ask a question about your screen content.
    Uses RAG with ChromaDB retrieval + Groq LLM for intelligent answers.
    Falls back to local-only search if Groq is unavailable.
    """
    groq = get_groq_service()
    
    # Retrieve relevant context from ChromaDB
    try:
        if inquiry_req.session_id:
            # Search within specific session
            results = collection.query(
                query_texts=[inquiry_req.query],
                n_results=inquiry_req.n_results,
                where={"session_id": inquiry_req.session_id}
            )
        else:
            # Global search
            results = collection.query(
                query_texts=[inquiry_req.query],
                n_results=inquiry_req.n_results
            )
    except Exception as e:
        return InquiryResponse(
            answer=f"Failed to retrieve context: {str(e)}",
            sources=[],
            used_groq=False,
            error=str(e)
        )
    
    # Format retrieved context
    sources = []
    context_parts = []
    
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0] if "distances" in results else [0] * len(documents)
    
    for i, (doc, meta, dist) in enumerate(zip(documents, metadatas, distances)):
        context_parts.append(f"[Context {i+1}]:\n{doc}")
        sources.append({
            "id": i,
            "start_time": meta.get("start_time", "") if meta else "",
            "end_time": meta.get("end_time", "") if meta else "",
            "session_id": meta.get("session_id", "") if meta else "",
            "relevance_score": 1 - dist if dist else 1.0
        })
    
    combined_context = "\n\n".join(context_parts)
    
    if not combined_context.strip():
        return InquiryResponse(
            answer="No relevant context found in your screen history. Try asking about something you recently viewed or discussed.",
            sources=[],
            used_groq=False
        )
    
    # Try Groq for intelligent response
    if groq.is_available:
        try:
            groq_response = groq.query_groq(
                user_query=inquiry_req.query,
                retrieved_context=combined_context
            )
            
            if groq_response.success:
                return InquiryResponse(
                    answer=groq_response.content,
                    sources=sources,
                    model=groq_response.model,
                    used_groq=True
                )
            else:
                # Groq failed, fall back to local
                print(f"[Inquire] Groq failed: {groq_response.error}, falling back to local")
        except Exception as e:
            print(f"[Inquire] Groq exception: {e}, falling back to local")
    
    # Fallback: Return raw context
    return InquiryResponse(
        answer=f"Here's what I found in your screen history:\n\n{combined_context}",
        sources=sources,
        used_groq=False
    )


# ============ Flashcard Generation Endpoints ============

@app.post("/api/v1/generate/flashcards", response_model=FlashcardResponse)
@limiter.limit("5/minute")
async def generate_flashcards(request: Request, flashcard_req: FlashcardGenerateRequest):
    """
    Generate flashcards from screen content.
    Uses Groq to create high-quality Q&A pairs from your context.
    """
    groq = get_groq_service()
    db = SessionLocal()
    
    try:
        # Retrieve context
        if flashcard_req.session_id:
            results = query_by_session(flashcard_req.session_id, n_results=50)
        else:
            results = collection.query(
                query_texts=["study material, concepts, key points"],
                n_results=50
            )
        
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        
        if not documents:
            return FlashcardResponse(
                flashcards=[],
                success=False,
                error="No context found to generate flashcards from"
            )
        
        # Combine context
        combined_context = "\n\n".join(documents[:10])  # Limit to 10 chunks
        
        # Generate flashcards with Groq
        if not groq.is_available:
            return FlashcardResponse(
                flashcards=[],
                success=False,
                error="Groq API not configured. Please add GROQ_API_KEY to your environment."
            )
        
        groq_response = groq.generate_flashcards(
            context=combined_context,
            count=flashcard_req.count
        )
        
        if not groq_response.success:
            return FlashcardResponse(
                flashcards=[],
                success=False,
                error=f"Groq API error: {groq_response.error}"
            )
        
        # Parse JSON response
        try:
            # Extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', groq_response.content)
            if json_match:
                flashcards_data = json.loads(json_match.group(0))
                flashcards_list = flashcards_data.get("flashcards", [])
            else:
                flashcards_list = []
        except json.JSONDecodeError as e:
            return FlashcardResponse(
                flashcards=[],
                success=False,
                error=f"Failed to parse flashcards: {str(e)}"
            )
        
        # Create session if needed
        session_id = flashcard_req.session_id or str(uuid.uuid4())
        session = db.query(StudySession).filter(StudySession.id == session_id).first()
        if not session:
            session = StudySession(
                id=session_id,
                start_time=results["metadatas"][0][0].get("start_time") if results["metadatas"] and results["metadatas"][0] else None,
                total_chunks=len(documents)
            )
            db.add(session)
        
        # Save flashcards to database
        created_flashcards = []
        for fc in flashcards_list:
            flashcard = Flashcard(
                id=str(uuid.uuid4()),
                session_id=session_id,
                question=fc.get("question", ""),
                answer=fc.get("answer", ""),
                difficulty=fc.get("difficulty", "medium"),
                topic=fc.get("topic", "")
            )
            db.add(flashcard)
            created_flashcards.append({
                "id": flashcard.id,
                "question": flashcard.question,
                "answer": flashcard.answer,
                "difficulty": flashcard.difficulty,
                "topic": flashcard.topic
            })
        
        session.total_flashcards = len(created_flashcards)
        db.commit()
        
        return FlashcardResponse(
            flashcards=created_flashcards,
            success=True
        )
        
    except Exception as e:
        db.rollback()
        return FlashcardResponse(
            flashcards=[],
            success=False,
            error=str(e)
        )
    finally:
        db.close()


@app.post("/api/v1/flashcard/review")
@limiter.limit("30/minute")
async def review_flashcard(request: Request, update_req: FlashcardUpdateRequest):
    """Update flashcard statistics after a review."""
    db = SessionLocal()
    try:
        flashcard = db.query(Flashcard).filter(Flashcard.id == update_req.flashcard_id).first()
        if not flashcard:
            raise HTTPException(status_code=404, detail="Flashcard not found")
        
        flashcard.update_review(update_req.was_correct)
        db.commit()
        
        return {
            "success": True,
            "times_reviewed": flashcard.times_reviewed,
            "times_correct": flashcard.times_correct,
            "next_review": flashcard.next_review.isoformat() if flashcard.next_review else None
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


# ============ Study Materials Endpoint ============

@app.post("/api/v1/generate/materials")
@limiter.limit("5/minute")
async def generate_study_materials(request: Request, materials_req: StudyMaterialRequest):
    """Generate comprehensive study materials from screen content."""
    groq = get_groq_service()
    
    try:
        # Retrieve context
        if materials_req.session_id:
            results = query_by_session(materials_req.session_id, n_results=50)
        else:
            results = collection.query(
                query_texts=["study material, concepts, key points"],
                n_results=50
            )
        
        documents = results.get("documents", [[]])[0]
        
        if not documents:
            raise HTTPException(status_code=404, detail="No context found")
        
        combined_context = "\n\n".join(documents[:15])
        
        if not groq.is_available:
            raise HTTPException(status_code=503, detail="Groq API not configured")
        
        groq_response = groq.generate_study_materials(context=combined_context)
        
        if not groq_response.success:
            raise HTTPException(status_code=500, detail=f"Groq error: {groq_response.error}")
        
        return {
            "success": True,
            "materials": groq_response.content,
            "format": "markdown",
            "model": groq_response.model
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Statistics Endpoints ============

@app.get("/api/v1/stats")
@limiter.limit("20/minute")
async def get_stats(request: Request, session_id: Optional[str] = Query(None)):
    """Get study statistics."""
    try:
        if session_id:
            stats = get_session_stats(session_id)
            if not stats:
                raise HTTPException(status_code=404, detail="Session not found")
            return stats
        else:
            return {"sessions": get_all_sessions_stats()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/sessions")
@limiter.limit("20/minute")
async def get_sessions(request: Request):
    """Get all session IDs."""
    try:
        session_ids = get_session_ids()
        return {"sessions": session_ids}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Screen Analysis Endpoint (with buffering) ============

@app.post("/analyze")
@limiter.limit("30/minute")
async def analyze_endpoint(request: Request, file: UploadFile = File(...), prompt: str = "Describe this image."):
    """Analyze a screen frame and add to ingestion buffer."""
    try:
        contents = await file.read()
        loop = asyncio.get_event_loop()
        text = await loop.run_in_executor(None, analyze_image, contents, prompt)
        
        # Add to ingestion buffer for batched embedding
        add_to_buffer(frame_description=text)
        
        return {"result": text, "buffered": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ WebSocket STT (with buffering) ============

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await handle_audio_stream(websocket)


# ============ Manual Flush Endpoint ============

@app.post("/api/v1/ingestion/flush")
@limiter.limit("5/minute")
async def flush_ingestion_buffer(request: Request):
    """Manually flush the ingestion buffer (for testing)."""
    try:
        await ingestion_buffer.process_current_batch()
        return {"success": True, "message": "Buffer flushed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
