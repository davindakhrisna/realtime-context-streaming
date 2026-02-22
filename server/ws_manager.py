import asyncio
import numpy as np
from fastapi import WebSocket
from models import transcribe_audio_buffer_with_timestamps

# --- Configuration ---
SAMPLE_RATE = 16000
BYTES_PER_SAMPLE = 2  # Int16 PCM (changed from 4 for Float32)
BUFFER_DURATION_SEC = 4.0  # Increased for better context with slower speech
SLIDE_DURATION_SEC = 2.5  # ~38% overlap (balance between continuity and dedup)

BYTES_PER_CHUNK = int(SAMPLE_RATE * BYTES_PER_SAMPLE * SLIDE_DURATION_SEC)
MAX_BUFFER_SIZE = int(SAMPLE_RATE * BYTES_PER_SAMPLE * BUFFER_DURATION_SEC)

# Minimum audio before processing (2 seconds = shorter sentences work)
MIN_BUFFER_SIZE = int(SAMPLE_RATE * BYTES_PER_SAMPLE * 2.0)

# VAD Configuration - tuned for natural speech with pauses
SILENCE_THRESHOLD = 0.015  # Lower = more sensitive (was 0.02)
SILENCE_WINDOW_SEC = 2.5  # Longer window before considering it a pause (was 1.5s)
SILENCE_CHUNKS_BEFORE_RESET = int(SILENCE_WINDOW_SEC / SLIDE_DURATION_SEC)

# Energy smoothing for VAD - higher = more smoothing, less jitter
ENERGY_SMOOTHING_FACTOR = 0.2  # Reduced from 0.3 for faster response

# Debug logging
DEBUG = False


def calculate_energy(audio_bytes: bytes) -> float:
    """Calculate RMS energy of audio data (expects Int16 PCM)."""
    audio_data = np.frombuffer(audio_bytes, dtype=np.int16)
    # Normalize to [-1, 1] range for consistent threshold
    audio_normalized = audio_data.astype(np.float32) / 32768.0
    return float(np.sqrt(np.mean(audio_normalized**2)))


def normalize_text_for_comparison(text: str) -> str:
    """
    Normalize text for better comparison:
    - Convert numbers to words (5 -> five)
    - Remove punctuation
    - Lowercase
    - Normalize whitespace
    """
    import re
    
    # Common number to word mappings
    number_map = {
        '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
        '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
        '10': 'ten', '11': 'eleven', '12': 'twelve', '13': 'thirteen',
        '14': 'fourteen', '15': 'fifteen', '16': 'sixteen', '17': 'seventeen',
        '18': 'eighteen', '19': 'nineteen', '20': 'twenty'
    }
    
    # Convert standalone numbers to words
    def replace_number(match):
        num_str = match.group(0)
        return number_map.get(num_str, num_str)
    
    text = re.sub(r'\b(\d{1,2})\b', replace_number, text)
    
    # Remove punctuation and lowercase
    text = re.sub(r'[^\w\s]', '', text.lower())
    
    # Normalize whitespace
    text = ' '.join(text.split())
    
    return text


def extract_new_text_with_timestamps(
    prev_end_time: float,
    segments: list
) -> tuple[str, float]:
    """
    Uses Whisper segment timestamps to extract only NEW text.
    
    Args:
        prev_end_time: End timestamp of last transcribed segment
        segments: List of segments with start/end times and text
    
    Returns:
        Tuple of (new_text, new_end_time)
    """
    new_text_parts = []
    new_end_time = prev_end_time
    
    for segment in segments:
        # Use larger tolerance for slower speech (0.3s instead of 0.1s)
        # This prevents duplication when words span across buffer boundaries
        if segment.start >= prev_end_time - 0.3:
            new_text_parts.append(segment.text.strip())
            new_end_time = max(new_end_time, segment.end)
    
    new_text = ' '.join(new_text_parts)
    return new_text, new_end_time


def extract_new_text_fallback(prev_text: str, new_text: str) -> str:
    """
    Fallback word-based deduplication when timestamps aren't available.
    Uses normalized text for more robust comparison.
    Uses fuzzy matching to handle variations in transcription.
    """
    if not prev_text or not new_text:
        return new_text

    prev_normalized = normalize_text_for_comparison(prev_text)
    new_normalized = normalize_text_for_comparison(new_text)

    prev_words = prev_normalized.split()
    new_words = new_normalized.split()
    
    original_new_words = new_text.split()

    # If new text is shorter or same length, it's likely a re-transcription
    if len(new_words) <= len(prev_words) * 0.8:
        # Check if new text is mostly contained in prev text
        prev_text_normalized = ' '.join(prev_words)
        new_text_normalized = ' '.join(new_words)
        if new_text_normalized in prev_text_normalized:
            return ""  # Skip, already sent
    
    # Find overlap - check last 20 words for better matching
    max_check = min(20, len(prev_words), len(new_words))
    best_overlap_end = 0
    best_overlap_len = 0

    for i in range(1, max_check + 1):
        if prev_words[-i:] == new_words[:i]:
            best_overlap_end = len(new_words) - i
            best_overlap_len = i
    
    # If we found a significant overlap (>3 words), use it
    if best_overlap_len >= 3:
        return ' '.join(original_new_words[best_overlap_end:])
    
    # If new text starts with prev text's ending (partial sentence match)
    # Check if first 5 words of new match last 5 words of prev
    if len(prev_words) >= 5 and len(new_words) >= 5:
        for overlap_size in range(5, 2, -1):
            if prev_words[-overlap_size:] == new_words[:overlap_size]:
                return ' '.join(original_new_words[overlap_size:])
    
    # No good overlap found, return as-is (might cause some duplication)
    return new_text


class AudioState:
    """Tracks audio processing state for a WebSocket connection."""
    def __init__(self):
        self.buffer = bytearray()
        self.smoothed_energy = 0.0
        self.silence_counter = 0
        self.last_end_time = 0.0  # For timestamp-based dedup
        self.last_full_text = ""  # For fallback dedup
        self.is_speaking = False
        self.last_process_time = 0.0  # Track when we last processed
        self.speech_end_time = 0.0  # When speech stopped (for timeout)


async def handle_audio_stream(websocket: WebSocket):
    await websocket.accept()
    state = AudioState()
    process_count = 0
    import time

    try:
        while True:
            data = await websocket.receive_bytes()
            current_time = time.time()

            # Calculate energy with smoothing for stable VAD
            current_energy = calculate_energy(data)
            state.smoothed_energy = (
                ENERGY_SMOOTHING_FACTOR * current_energy +
                (1 - ENERGY_SMOOTHING_FACTOR) * state.smoothed_energy
            )

            # Always buffer the audio data (don't skip during pauses)
            state.buffer.extend(data)

            # VAD: Track silence vs speech
            if state.smoothed_energy < SILENCE_THRESHOLD:
                # Silence detected
                if state.is_speaking:
                    # Just transitioned from speech to silence - mark the time
                    state.speech_end_time = current_time
                    state.is_speaking = False
                
                state.silence_counter += 1
                
                # Long silence (3+ seconds) - reset everything for new sentence
                if state.silence_counter > SILENCE_CHUNKS_BEFORE_RESET * 2:
                    if DEBUG:
                        print(f"[DEBUG] Long silence detected, resetting buffer. last_end_time={state.last_end_time:.2f}s")
                    state.buffer = bytearray()
                    state.silence_counter = 0
                    state.last_end_time = 0.0
                    state.last_full_text = ""
                    state.speech_end_time = 0.0
                continue

            # Voice detected
            state.silence_counter = 0
            state.is_speaking = True
            state.speech_end_time = 0.0  # Reset speech end timer

            # Check if we should process:
            # 1. Buffer is full (original trigger)
            # 2. Speech ended + minimum audio + 1s pause (new trigger for short sentences)
            should_process = False
            
            if len(state.buffer) >= MAX_BUFFER_SIZE:
                should_process = True
                if DEBUG:
                    print(f"[DEBUG] Processing: buffer full ({len(state.buffer)} bytes)")
            
            elif (len(state.buffer) >= MIN_BUFFER_SIZE and 
                  state.speech_end_time > 0 and 
                  current_time - state.speech_end_time >= 1.0):
                # Speech paused for 1+ second with at least 2s of audio
                should_process = True
                if DEBUG:
                    print(f"[DEBUG] Processing: speech pause ({len(state.buffer)} bytes, {current_time - state.speech_end_time:.1f}s pause)")

            if should_process:
                process_count += 1
                process_chunk = bytes(state.buffer[-MAX_BUFFER_SIZE:])

                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(
                    None,
                    transcribe_audio_buffer_with_timestamps,
                    process_chunk
                )

                if result:
                    full_text, segments, end_time = result
                    
                    if DEBUG:
                        print(f"[DEBUG] Process #{process_count}: full='{full_text}', end_time={end_time:.2f}s, prev_end={state.last_end_time:.2f}s")
                    
                    if segments:
                        # Use timestamp-based deduplication (preferred)
                        new_portion, _ = extract_new_text_with_timestamps(
                            state.last_end_time,
                            segments
                        )
                        state.last_end_time = end_time
                    else:
                        # Fallback to word-based dedup
                        new_portion = extract_new_text_fallback(
                            state.last_full_text,
                            full_text
                        )
                    
                    state.last_full_text = full_text

                    if new_portion.strip():
                        if DEBUG:
                            print(f"[DEBUG] Sending: '{new_portion}'")
                        await websocket.send_json({
                            "type": "result",
                            "text": new_portion.strip()
                        })

                # Keep overlap for continuity (~1.5 seconds)
                keep_bytes = int(MAX_BUFFER_SIZE * 0.38)
                state.buffer = state.buffer[-keep_bytes:] if keep_bytes > 0 else bytearray()

    except Exception as e:
        print(f"Connection closed: {e}")
