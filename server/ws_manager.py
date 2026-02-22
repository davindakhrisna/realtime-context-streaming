import asyncio
import numpy as np
from fastapi import WebSocket
from models import transcribe_audio_buffer

# --- Configuration ---
SAMPLE_RATE = 16000
BYTES_PER_SAMPLE = 4 
BUFFER_DURATION_SEC = 2.0
SLIDE_DURATION_SEC = 1.0

BYTES_PER_CHUNK = int(SAMPLE_RATE * BYTES_PER_SAMPLE * SLIDE_DURATION_SEC)
MAX_BUFFER_SIZE = int(SAMPLE_RATE * BYTES_PER_SAMPLE * BUFFER_DURATION_SEC)

# VAD Threshold: Adjust based on mic sensitivity. 
# 0.01 is usually good for quiet rooms. 0.03 for noisy environments.
SILENCE_THRESHOLD = 0.015 

def calculate_energy(audio_bytes: bytes) -> float:
    """Calculates RMS energy of the audio chunk."""
    audio_data = np.frombuffer(audio_bytes, dtype=np.float32)
    # RMS = sqrt(mean(samples^2))
    return np.sqrt(np.mean(audio_data**2))

async def handle_audio_stream(websocket: WebSocket):
    await websocket.accept()
    audio_buffer = bytearray()
    silence_counter = 0
    
    try:
        while True:
            data = await websocket.receive_bytes()
            
            # 1. VAD CHECK (The Battery Saver)
            energy = calculate_energy(data)
            
            if energy < SILENCE_THRESHOLD:
                # It's silence. 
                # Optional: Clear buffer if silence persists too long to reset context
                silence_counter += 1
                if silence_counter > 5: # ~5 seconds of continuous silence
                    audio_buffer = bytearray() 
                    silence_counter = 0
                continue
            
            # It's speech! Reset silence counter
            silence_counter = 0
            audio_buffer.extend(data)
            
            # 2. Buffer Logic (Same as Phase 2)
            if len(audio_buffer) >= MAX_BUFFER_SIZE:
                process_chunk = bytes(audio_buffer[-MAX_BUFFER_SIZE:])
                
                loop = asyncio.get_event_loop()
                text = await loop.run_in_executor(
                    None, 
                    transcribe_audio_buffer, 
                    process_chunk
                )
                
                if text:
                    # Only send if we got actual text
                    await websocket.send_json({"type": "result", "text": text})
                
                # Slide window
                keep_bytes = MAX_BUFFER_SIZE - BYTES_PER_CHUNK
                if keep_bytes > 0:
                    audio_buffer = audio_buffer[-keep_bytes:]
                else:
                    audio_buffer = bytearray()

    except Exception as e:
        print(f"Connection closed: {e}")
