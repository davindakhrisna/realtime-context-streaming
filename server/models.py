import numpy as np
from faster_whisper import WhisperModel

# Load model globally
model = WhisperModel("tiny", device="cpu", compute_type="int8")

def transcribe_audio_buffer(audio_bytes: bytes):
    """
    Expects: Raw 16kHz Mono Float32 PCM bytes.
    Returns: Transcribed text string.
    """
    # Convert bytes to numpy array (Float32)
    audio_data = np.frombuffer(audio_bytes, dtype=np.float32)
    
    # Run inference
    # language="en" forces English for speed/accuracy in this demo
    segments, info = model.transcribe(audio_data, language="en", beam_size=1)
    
    text = " ".join([segment.text for segment in segments]).strip()
    return text
