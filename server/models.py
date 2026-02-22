from faster_whisper import WhisperModel

# Switched to distil-small.en for much better accuracy with numbers and continuous speech
# It is still fast enough for real-time on modern CPUs
model = WhisperModel("distil-small.en", device="cpu", compute_type="int8")

def transcribe_audio_buffer(audio_bytes: bytes):
    """
    Expects: Raw 16kHz Mono Int16 PCM bytes.
    Returns: Transcribed text string.
    """
    import numpy as np
    # Convert Int16 PCM to Float32 normalized [-1, 1]
    audio_int16 = np.frombuffer(audio_bytes, dtype=np.int16)
    audio_data = audio_int16.astype(np.float32) / 32768.0

    # Added beam_size=5 for better coherence, and temperature fallback for stability
    segments, info = model.transcribe(
        audio_data,
        language="en",
        beam_size=5,
        best_of=5,
        temperature=0.0 # Deterministic output
    )

    text = " ".join([segment.text for segment in segments]).strip()
    return text


def transcribe_audio_buffer_with_timestamps(audio_bytes: bytes):
    """
    Expects: Raw 16kHz Mono Int16 PCM bytes.
    Returns: Tuple of (full_text, segments_list, end_time)
    """
    import numpy as np
    # Convert Int16 PCM to Float32 normalized [-1, 1]
    audio_int16 = np.frombuffer(audio_bytes, dtype=np.int16)
    audio_data = audio_int16.astype(np.float32) / 32768.0

    segments, info = model.transcribe(
        audio_data,
        language="en",
        beam_size=5,
        best_of=5,
        temperature=0.0,
        word_timestamps=False  # Segment timestamps only (faster)
    )

    segments_list = list(segments)
    
    if not segments_list:
        return "", [], 0.0
    
    full_text = " ".join([seg.text.strip() for seg in segments_list]).strip()
    end_time = segments_list[-1].end
    
    return full_text, segments_list, end_time
