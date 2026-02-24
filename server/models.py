from faster_whisper import WhisperModel
import numpy as np

# Switched to distil-small.en for much better accuracy with numbers and continuous speech
# It is still fast enough for real-time on modern CPUs
model = WhisperModel("distil-small.en", device="cpu", compute_type="int8")


def _convert_audio_to_float(audio_bytes: bytes) -> np.ndarray:
    """Convert Int16 PCM bytes to normalized Float32 array [-1, 1]."""
    audio_int16 = np.frombuffer(audio_bytes, dtype=np.int16)
    return audio_int16.astype(np.float32) / 32768.0


def _transcribe_segments(audio_data: np.ndarray):
    """Common transcription logic for both functions."""
    segments, info = model.transcribe(
        audio_data,
        language="en",
        beam_size=5,
        best_of=5,
        temperature=0.0,
    )
    return list(segments)


def transcribe_audio_buffer(audio_bytes: bytes):
    """
    Expects: Raw 16kHz Mono Int16 PCM bytes.
    Returns: Transcribed text string.
    """
    audio_data = _convert_audio_to_float(audio_bytes)
    segments = _transcribe_segments(audio_data)
    text = " ".join([segment.text for segment in segments]).strip()
    return text


def transcribe_audio_buffer_with_timestamps(audio_bytes: bytes):
    """
    Expects: Raw 16kHz Mono Int16 PCM bytes.
    Returns: Tuple of (full_text, segments_list, end_time)
    """
    audio_data = _convert_audio_to_float(audio_bytes)
    segments = _transcribe_segments(audio_data)

    if not segments:
        return "", [], 0.0

    full_text = " ".join([seg.text.strip() for seg in segments]).strip()
    end_time = segments[-1].end

    return full_text, segments, end_time
