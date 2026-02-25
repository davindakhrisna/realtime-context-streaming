"""
Groq API Service

Provides cloud LLM integration for RAG queries and study material generation.
Uses Groq's fast inference API with Llama3 or other available models.
"""

import os
import json
from typing import Optional
from dataclasses import dataclass
from groq import Groq


@dataclass
class GroqResponse:
    """Structured response from Groq API."""
    content: str
    model: str
    usage: dict
    success: bool
    error: Optional[str] = None


class GroqService:
    """
    Service for interacting with Groq Cloud API.
    
    Supports:
    - RAG-augmented queries
    - Flashcard generation
    - Study material synthesis
    - Content analysis and tagging
    """
    
    # Available models on Groq
    DEFAULT_MODEL = "llama-3.1-70b-versatile"
    FAST_MODEL = "llama-3.1-8b-instant"
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        self.client: Optional[Groq] = None
        self.is_available = bool(self.api_key)
        
        if self.is_available:
            self.client = Groq(api_key=self.api_key)
        else:
            print("[Groq] API key not configured, running in local-only mode")
    
    def query_groq(
        self,
        user_query: str,
        retrieved_context: str,
        model: Optional[str] = None,
        system_prompt: Optional[str] = None
    ) -> GroqResponse:
        """
        Send a RAG-augmented query to Groq.
        
        Args:
            user_query: The user's question
            retrieved_context: Relevant context from ChromaDB
            model: Optional model override
            system_prompt: Optional system prompt override
            
        Returns:
            GroqResponse with the AI's answer
        """
        if not self.client:
            return GroqResponse(
                content="",
                model="",
                usage={},
                success=False,
                error="Groq API key not configured"
            )
        
        # Default system prompt for RAG queries
        if system_prompt is None:
            system_prompt = """You are an intelligent study assistant helping users understand their screen content and learning materials.

You have access to retrieved context from the user's recent screen activity and audio transcripts. Use this context to provide accurate, helpful answers.

Guidelines:
- Base your answers primarily on the retrieved context
- If the context doesn't contain relevant information, say so clearly
- Provide clear, concise explanations
- Use examples when helpful
- If asked about something outside the context, acknowledge the limitation"""

        # Build the user message with context
        user_message = f"""Retrieved Context:
{retrieved_context}

---
User Question: {user_query}

Please answer based on the context above. If the context doesn't contain relevant information, let me know."""

        try:
            response = self.client.chat.completions.create(
                model=model or self.DEFAULT_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7,
                max_tokens=1024
            )
            
            return GroqResponse(
                content=response.choices[0].message.content,
                model=response.model,
                usage={
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                },
                success=True
            )
            
        except Exception as e:
            return GroqResponse(
                content="",
                model="",
                usage={},
                success=False,
                error=str(e)
            )
    
    def generate_flashcards(
        self,
        context: str,
        count: int = 5,
        model: Optional[str] = None
    ) -> GroqResponse:
        """
        Generate flashcards from context.
        
        Args:
            context: The content to generate flashcards from
            count: Number of flashcards to generate
            model: Optional model override
            
        Returns:
            GroqResponse with flashcards in JSON format
        """
        if not self.client:
            return GroqResponse(
                content="",
                model="",
                usage={},
                success=False,
                error="Groq API key not configured"
            )
        
        system_prompt = """You are an expert educational content creator. Generate high-quality flashcards from the provided content.

Output ONLY valid JSON in this exact format:
{
    "flashcards": [
        {
            "question": "Clear, specific question",
            "answer": "Concise, accurate answer",
            "difficulty": "easy|medium|hard",
            "topic": "Brief topic tag"
        }
    ]
}

Guidelines:
- Questions should be clear and unambiguous
- Answers should be concise but complete
- Vary difficulty levels appropriately
- Include relevant topic tags"""

        user_message = f"""Generate {count} flashcards from the following content:

{context}

Output ONLY the JSON, no additional text."""

        try:
            response = self.client.chat.completions.create(
                model=model or self.DEFAULT_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7,
                max_tokens=2048
            )
            
            content = response.choices[0].message.content
            
            # Try to extract JSON from the response
            try:
                # Find JSON in the response (handle markdown code blocks)
                import re
                json_match = re.search(r'\{[\s\S]*\}', content)
                if json_match:
                    content = json_match.group(0)
            except:
                pass
            
            return GroqResponse(
                content=content,
                model=response.model,
                usage={
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                },
                success=True
            )
            
        except Exception as e:
            return GroqResponse(
                content="",
                model="",
                usage={},
                success=False,
                error=str(e)
            )
    
    def analyze_content(
        self,
        context: str,
        model: Optional[str] = None
    ) -> GroqResponse:
        """
        Analyze content to extract topics, difficulty, and key concepts.
        
        Args:
            context: The content to analyze
            model: Optional model override
            
        Returns:
            GroqResponse with analysis in JSON format
        """
        if not self.client:
            return GroqResponse(
                content="",
                model="",
                usage={},
                success=False,
                error="Groq API key not configured"
            )
        
        system_prompt = """Analyze the provided content and extract structured information.

Output ONLY valid JSON in this exact format:
{
    "topics": ["topic1", "topic2"],
    "difficulty_score": 1-10,
    "key_concepts": ["concept1", "concept2"],
    "summary": "Brief 1-2 sentence summary"
}

Guidelines:
- Topics should be broad categories
- Difficulty: 1 (very easy) to 10 (expert level)
- Key concepts are specific ideas/terms
- Summary captures the main point"""

        user_message = f"""Analyze this content:

{context}

Output ONLY the JSON, no additional text."""

        try:
            response = self.client.chat.completions.create(
                model=model or self.FAST_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.3,
                max_tokens=512
            )
            
            content = response.choices[0].message.content
            
            # Try to extract JSON
            try:
                import re
                json_match = re.search(r'\{[\s\S]*\}', content)
                if json_match:
                    content = json_match.group(0)
            except:
                pass
            
            return GroqResponse(
                content=content,
                model=response.model,
                usage={
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                },
                success=True
            )
            
        except Exception as e:
            return GroqResponse(
                content="",
                model="",
                usage={},
                success=False,
                error=str(e)
            )
    
    def generate_study_materials(
        self,
        context: str,
        model: Optional[str] = None
    ) -> GroqResponse:
        """
        Generate comprehensive study materials from context.
        
        Args:
            context: The content to generate materials from
            model: Optional model override
            
        Returns:
            GroqResponse with study materials in markdown format
        """
        if not self.client:
            return GroqResponse(
                content="",
                model="",
                usage={},
                success=False,
                error="Groq API key not configured"
            )
        
        system_prompt = """You are an expert educator creating comprehensive study materials.

Generate well-structured study notes in Markdown format including:
- Key concepts with clear explanations
- Important definitions
- Examples where applicable
- Common pitfalls or misconceptions
- Summary section

Format with proper Markdown headers, bullet points, and code blocks where appropriate."""

        user_message = f"""Create comprehensive study materials from this content:

{context}"""

        try:
            response = self.client.chat.completions.create(
                model=model or self.DEFAULT_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7,
                max_tokens=4096
            )
            
            return GroqResponse(
                content=response.choices[0].message.content,
                model=response.model,
                usage={
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                },
                success=True
            )
            
        except Exception as e:
            return GroqResponse(
                content="",
                model="",
                usage={},
                success=False,
                error=str(e)
            )


# Global Groq service instance
groq_service = GroqService()


def get_groq_service() -> GroqService:
    """Get the global Groq service instance."""
    return groq_service
