"""
SQLAlchemy Database Models

Stores study sessions, flashcards, and user performance data.
Uses SQLite for lightweight local storage.
"""

from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from datetime import datetime
import os

# Database setup
current_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(current_dir, "study_data.db")

engine = create_engine(f"sqlite:///{db_path}", echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class StudySession(Base):
    """Represents a study session with aggregated context chunks."""
    __tablename__ = "study_sessions"
    
    id = Column(String, primary_key=True, index=True)
    start_time = Column(DateTime, nullable=False, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    total_chunks = Column(Integer, default=0)
    total_flashcards = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    flashcards = relationship("Flashcard", back_populates="session", cascade="all, delete-orphan")
    performance = relationship("UserPerformance", back_populates="session", uselist=False, cascade="all, delete-orphan")
    
    @property
    def duration_minutes(self) -> float:
        """Calculate session duration in minutes."""
        if not self.end_time:
            end = datetime.utcnow()
        else:
            end = self.end_time
        return (end - self.start_time).total_seconds() / 60.0


class Flashcard(Base):
    """Individual flashcard with spaced repetition tracking."""
    __tablename__ = "flashcards"
    
    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("study_sessions.id"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    difficulty = Column(String, default="medium")  # easy, medium, hard
    topic = Column(String, nullable=True)
    
    # Spaced repetition tracking
    times_reviewed = Column(Integer, default=0)
    times_correct = Column(Integer, default=0)
    last_reviewed = Column(DateTime, nullable=True)
    next_review = Column(DateTime, nullable=True)
    ease_factor = Column(Float, default=2.5)  # SM-2 algorithm ease factor
    interval_days = Column(Integer, default=0)  # Days until next review
    
    # Relationships
    session = relationship("StudySession", back_populates="flashcards")
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate as percentage."""
        if self.times_reviewed == 0:
            return 0.0
        return (self.times_correct / self.times_reviewed) * 100.0
    
    def update_review(self, was_correct: bool):
        """Update flashcard stats after a review (SM-2 algorithm simplified)."""
        self.times_reviewed += 1
        if was_correct:
            self.times_correct += 1
            # Increase interval for correct answers
            if self.interval_days == 0:
                self.interval_days = 1
            elif self.interval_days == 1:
                self.interval_days = 3
            else:
                self.interval_days = int(self.interval_days * self.ease_factor)
        else:
            # Reset interval for incorrect answers
            self.interval_days = 1
            self.ease_factor = max(1.3, self.ease_factor - 0.2)
        
        self.last_reviewed = datetime.utcnow()
        if self.next_review is None:
            self.next_review = datetime.utcnow()
        # Recalculate next review date based on interval


class UserPerformance(Base):
    """Aggregated performance metrics for a study session."""
    __tablename__ = "user_performance"
    
    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("study_sessions.id"), unique=True, nullable=False)
    accuracy_rate = Column(Float, default=0.0)  # Percentage of correct answers
    time_spent_minutes = Column(Float, default=0.0)
    flashcards_reviewed = Column(Integer, default=0)
    topics_covered = Column(Text, nullable=True)  # Comma-separated topic tags
    difficulty_average = Column(Float, default=5.0)  # Average difficulty 1-10
    
    # Relationships
    session = relationship("StudySession", back_populates="performance")
    
    def calculate_accuracy(self):
        """Calculate accuracy from session flashcards."""
        if self.flashcards_reviewed == 0:
            self.accuracy_rate = 0.0
        else:
            # This would need flashcard data passed in
            pass


# Helper functions
def get_db():
    """Get database session (for FastAPI dependency injection)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)
    print("[Database] SQLite tables created")


def get_session_stats(session_id: str) -> dict:
    """Get statistics for a specific session."""
    db = SessionLocal()
    try:
        session = db.query(StudySession).filter(StudySession.id == session_id).first()
        if not session:
            return {}
        
        flashcards = db.query(Flashcard).filter(Flashcard.session_id == session_id).all()
        performance = db.query(UserPerformance).filter(UserPerformance.session_id == session_id).first()
        
        total_reviewed = sum(fc.times_reviewed for fc in flashcards)
        total_correct = sum(fc.times_correct for fc in flashcards)
        
        return {
            "session_id": session_id,
            "duration_minutes": round(session.duration_minutes, 2),
            "total_flashcards": len(flashcards),
            "flashcards_reviewed": total_reviewed,
            "accuracy_rate": round((total_correct / total_reviewed * 100) if total_reviewed > 0 else 0, 2),
            "topics_covered": list(set(fc.topic for fc in flashcards if fc.topic)),
            "difficulty_distribution": {
                "easy": sum(1 for fc in flashcards if fc.difficulty == "easy"),
                "medium": sum(1 for fc in flashcards if fc.difficulty == "medium"),
                "hard": sum(1 for fc in flashcards if fc.difficulty == "hard")
            }
        }
    finally:
        db.close()


def get_all_sessions_stats() -> list:
    """Get statistics for all sessions."""
    db = SessionLocal()
    try:
        sessions = db.query(StudySession).order_by(StudySession.start_time.desc()).all()
        return [get_session_stats(session.id) for session in sessions]
    finally:
        db.close()
