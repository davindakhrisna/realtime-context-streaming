/**
 * Hook for speech-to-text using Web Speech API.
 * Buffers transcriptions and sends to server every 10 seconds.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { sendSTT } from "#/lib/api";

export interface UseSTTOptions {
  /** Interval in milliseconds to send buffered transcriptions to server (default: 10000) */
  sendInterval?: number;
  /** Callback when transcription is received */
  onTranscription?: (text: string) => void;
  /** Callback when transcription is sent to server */
  onSent?: (text: string, success: boolean) => void;
  /** Callback when error occurs */
  onError?: (error: Error) => void;
}

export interface UseSTTReturn {
  /** Whether STT is currently active */
  isActive: boolean;
  /** Current live transcription text */
  currentTranscript: string;
  /** All transcriptions collected in current session */
  allTranscripts: string[];
  /** Buffer of text waiting to be sent to server */
  bufferText: string;
  /** Start STT */
  start: () => Promise<void>;
  /** Stop STT */
  stop: () => void;
  /** Clear all transcriptions */
  clear: () => void;
  /** Error state */
  error: string | null;
}

export function useSTT(options: UseSTTOptions = {}): UseSTTReturn {
  const {
    sendInterval = 10000,
    onTranscription,
    onSent,
    onError,
  } = options;

  const [isActive, setIsActive] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [allTranscripts, setAllTranscripts] = useState<string[]>([]);
  const [bufferText, setBufferText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const sendTimerRef = useRef<NodeJS.Timeout | null>(null);
  const interimTranscriptRef = useRef("");

  // Initialize SpeechRecognition
  useEffect(() => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition })
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Web Speech API is not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + " ";
        } else {
          interim += transcript;
        }
      }

      // Update interim transcript
      interimTranscriptRef.current = interim;
      setCurrentTranscript(final + interim);

      // Handle final results
      if (final) {
        const trimmedFinal = final.trim();
        if (trimmedFinal) {
          // Add to all transcripts
          setAllTranscripts((prev) => [...prev, trimmedFinal]);

          // Add to buffer
          setBufferText((prev) => {
            const newBuffer = prev ? `${prev} ${trimmedFinal}` : trimmedFinal;
            return newBuffer;
          });

          // Call callback
          onTranscription?.(trimmedFinal);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMsg = `Speech recognition error: ${event.error}`;
      setError(errorMsg);
      onError?.(new Error(errorMsg));

      // Restart on non-fatal errors
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setIsActive(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still active
      if (isActive && recognitionRef.current) {
        try {
          recognition.start();
        } catch {
          // Ignore if already started
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [isActive, onTranscription, onError]);

  // Send buffered text to server at intervals
  useEffect(() => {
    if (isActive) {
      sendTimerRef.current = setInterval(async () => {
        if (bufferText.trim()) {
          try {
            const response = await sendSTT({
              text: bufferText.trim(),
              timestamp: Date.now() / 1000,
            });

            onSent?.(bufferText.trim(), response.success);

            if (response.success) {
              setBufferText("");
            }
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Failed to send STT";
            setError(errorMsg);
            onError?.(err instanceof Error ? err : new Error(errorMsg));
          }
        }
      }, sendInterval);
    }

    return () => {
      if (sendTimerRef.current) {
        clearInterval(sendTimerRef.current);
      }
    };
  }, [isActive, bufferText, sendInterval, onSent, onError]);

  const start = useCallback(async () => {
    if (!recognitionRef.current) {
      setError("Speech recognition not initialized");
      return;
    }

    try {
      recognitionRef.current.start();
      setIsActive(true);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to start STT";
      setError(errorMsg);
      onError?.(err instanceof Error ? err : new Error(errorMsg));
    }
  }, [onError]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsActive(false);

    // Send any remaining buffer
    if (bufferText.trim()) {
      sendSTT({
        text: bufferText.trim(),
        timestamp: Date.now() / 1000,
      })
        .then((response) => {
          onSent?.(bufferText.trim(), response.success);
          if (response.success) {
            setBufferText("");
          }
        })
        .catch((err) => {
          onError?.(err instanceof Error ? err : new Error("Failed to send remaining STT"));
        });
    }
  }, [bufferText, onSent, onError]);

  const clear = useCallback(() => {
    setCurrentTranscript("");
    setAllTranscripts([]);
    setBufferText("");
    setError(null);
  }, []);

  return {
    isActive,
    currentTranscript,
    allTranscripts,
    bufferText,
    start,
    stop,
    clear,
    error,
  };
}
