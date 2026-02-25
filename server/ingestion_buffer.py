"""
Batched Embedding Ingestion Pipeline

Aggregates screen frames and STT transcripts into 10-second windows
before embedding to ChromaDB for efficient context management.
"""

import asyncio
import time
import uuid
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime
import threading

from db import collection


@dataclass
class ContextChunk:
    """Represents a 10-second aggregated context window."""
    start_time: float
    end_time: float
    transcripts: list[str] = field(default_factory=list)
    frame_descriptions: list[str] = field(default_factory=list)
    session_id: str = ""
    
    def get_combined_text(self) -> str:
        """Combine all content into a single text for embedding."""
        parts = []
        
        if self.frame_descriptions:
            parts.append("Visual Context:")
            parts.append(" ".join(self.frame_descriptions))
        
        if self.transcripts:
            parts.append("Audio Transcript:")
            parts.append(" ".join(self.transcripts))
        
        return "\n".join(parts)
    
    def get_duration(self) -> float:
        """Get duration of this chunk in seconds."""
        return self.end_time - self.start_time


class IngestionBuffer:
    """
    Manages a 10-second batching window for context aggregation.
    
    Collects screen frame descriptions and STT transcripts,
    then embeds them as a single chunk every 10 seconds.
    """
    
    def __init__(self, batch_duration_sec: float = 10.0):
        self.batch_duration_sec = batch_duration_sec
        self.current_chunk: Optional[ContextChunk] = None
        self.session_id = str(uuid.uuid4())
        self._lock = threading.Lock()
        self._batch_task: Optional[asyncio.Task] = None
        self._is_running = False
        
    def start(self):
        """Start the background batching task."""
        if self._is_running:
            return
        
        self._is_running = True
        self._start_new_chunk()
        
    def stop(self):
        """Stop the background batching task."""
        self._is_running = False
        if self._batch_task:
            self._batch_task.cancel()
            
    def _start_new_chunk(self):
        """Initialize a new 10-second chunk."""
        current_time = time.time()
        with self._lock:
            self.current_chunk = ContextChunk(
                start_time=current_time,
                end_time=current_time + self.batch_duration_sec,
                session_id=self.session_id
            )
    
    def add_transcript(self, text: str, timestamp: Optional[float] = None):
        """Add a transcript segment to the current batch."""
        if not self.current_chunk:
            self._start_new_chunk()
            
        with self._lock:
            self.current_chunk.transcripts.append(text)
    
    def add_frame_description(self, description: str, timestamp: Optional[float] = None):
        """Add a frame description to the current batch."""
        if not self.current_chunk:
            self._start_new_chunk()
            
        with self._lock:
            self.current_chunk.frame_descriptions.append(description)
    
    async def process_current_batch(self):
        """Process the current batch and embed to ChromaDB."""
        with self._lock:
            if not self.current_chunk:
                return
            
            chunk = self.current_chunk
            self._start_new_chunk()
        
        # Skip empty batches
        if not chunk.transcripts and not chunk.frame_descriptions:
            return
        
        combined_text = chunk.get_combined_text()
        
        # Generate metadata for the chunk
        metadata = {
            "start_time": datetime.fromtimestamp(chunk.start_time).isoformat(),
            "end_time": datetime.fromtimestamp(chunk.end_time).isoformat(),
            "session_id": chunk.session_id,
            "content_type": "mixed",
            "transcript_count": len(chunk.transcripts),
            "frame_count": len(chunk.frame_descriptions),
            "duration_sec": chunk.get_duration()
        }
        
        # Store in ChromaDB with unique ID
        chunk_id = f"chunk_{chunk.start_time}"
        
        try:
            collection.add(
                documents=[combined_text],
                ids=[chunk_id],
                metadatas=[metadata]
            )
            print(f"[Ingestion] Embedded chunk: {chunk_id} ({len(combined_text)} chars)")
        except Exception as e:
            print(f"[Ingestion] Failed to embed chunk: {e}")
    
    async def run_batch_loop(self):
        """Background task that processes batches every 10 seconds."""
        while self._is_running:
            await asyncio.sleep(self.batch_duration_sec)
            await self.process_current_batch()


# Global ingestion buffer instance
ingestion_buffer = IngestionBuffer(batch_duration_sec=10.0)


async def start_ingestion_service():
    """Start the ingestion background service."""
    ingestion_buffer.start()
    ingestion_buffer._batch_task = asyncio.create_task(
        ingestion_buffer.run_batch_loop()
    )
    print(f"[Ingestion] Service started with {ingestion_buffer.batch_duration_sec}s batching")


async def stop_ingestion_service():
    """Stop the ingestion background service."""
    # Process any remaining content
    await ingestion_buffer.process_current_batch()
    ingestion_buffer.stop()
    print("[Ingestion] Service stopped")


def add_to_buffer(transcript: Optional[str] = None, frame_description: Optional[str] = None):
    """
    Convenience function to add content to the ingestion buffer.
    Can be called from synchronous code (e.g., WebSocket handlers).
    """
    if transcript:
        ingestion_buffer.add_transcript(transcript)
    if frame_description:
        ingestion_buffer.add_frame_description(frame_description)
