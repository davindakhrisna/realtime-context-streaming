/**
 * Hook for webcam frame capture with pixel difference detection.
 * Captures frames every 5 seconds if pixel change exceeds 2%.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { sendOCR } from "#/lib/api";

export interface UseFrameCaptureOptions {
  /** Interval in milliseconds to check for frame changes (default: 5000) */
  checkInterval?: number;
  /** Minimum pixel change percentage to trigger capture (default: 0.02 = 2%) */
  pixelChangeThreshold?: number;
  /** Video element ref to capture frames from */
  videoRef: React.RefObject<HTMLVideoElement>;
  /** Callback when frame is captured and sent */
  onFrameCaptured?: (ocrText: string, success: boolean) => void;
  /** Callback when error occurs */
  onError?: (error: Error) => void;
}

export interface UseFrameCaptureReturn {
  /** Whether frame capture is currently active */
  isActive: boolean;
  /** Current canvas element for frame preview */
  canvasRef: React.RefObject<HTMLCanvasElement>;
  /** Last captured frame as base64 */
  lastFrame: string | null;
  /** Last OCR result */
  lastOCRText: string;
  /** Pixel change percentage from last frame */
  pixelChangePercent: number;
  /** Start frame capture */
  start: () => Promise<void>;
  /** Stop frame capture */
  stop: () => void;
  /** Error state */
  error: string | null;
}

/**
 * Calculate pixel difference between two image data arrays.
 * Returns percentage of pixels that changed.
 */
function calculatePixelDifference(
  data1: Uint8ClampedArray,
  data2: Uint8ClampedArray,
): number {
  if (data1.length !== data2.length) {
    return 1; // 100% difference if sizes don't match
  }

  let diffCount = 0;
  const totalPixels = data1.length / 4; // RGBA = 4 channels per pixel

  // Sample every 10th pixel for performance
  const sampleRate = 10;

  for (let i = 0; i < data1.length; i += 4 * sampleRate) {
    const r1 = data1[i];
    const g1 = data1[i + 1];
    const b1 = data1[i + 2];

    const r2 = data2[i];
    const g2 = data2[i + 1];
    const b2 = data2[i + 2];

    // Calculate color difference
    const diff =
      Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);

    // Consider pixel changed if difference is significant
    if (diff > 30) {
      diffCount++;
    }
  }

  const sampledPixels = totalPixels / sampleRate;
  return diffCount / sampledPixels;
}

/**
 * Convert canvas to base64 image.
 */
function canvasToBase64(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
}

export function useFrameCapture(
  options: UseFrameCaptureOptions,
): UseFrameCaptureReturn {
  const {
    checkInterval = 5000,
    pixelChangeThreshold = 0.02,
    videoRef,
    onFrameCaptured,
    onError,
  } = options;

  const [isActive, setIsActive] = useState(false);
  const [lastFrame, setLastFrame] = useState<string | null>(null);
  const [lastOCRText, setLastOCRText] = useState("");
  const [pixelChangePercent, setPixelChangePercent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const checkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastImageDataRef = useRef<ImageData | null>(null);
  const isProcessingRef = useRef(false);

  const captureAndSend = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isProcessingRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    // Set canvas size to match video
    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get current frame image data
    const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Calculate pixel difference from last frame
    let pixelDiff = 0;
    if (lastImageDataRef.current) {
      pixelDiff = calculatePixelDifference(
        lastImageDataRef.current.data,
        currentImageData.data,
      );
      setPixelChangePercent(pixelDiff);
    }

    // Update last image data
    lastImageDataRef.current = currentImageData;

    // Only send if pixel change exceeds threshold
    if (pixelDiff < pixelChangeThreshold) {
      return;
    }

    isProcessingRef.current = true;

    try {
      // Convert to base64
      const base64Image = canvasToBase64(canvas);
      setLastFrame(base64Image);

      // Send to server for OCR
      const response = await sendOCR({
        image: base64Image,
        timestamp: Date.now() / 1000,
      });

      if (response.success) {
        setLastOCRText(response.text);
        onFrameCaptured?.(response.text, response.success);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to send OCR";
      setError(errorMsg);
      onError?.(err instanceof Error ? err : new Error(errorMsg));
    } finally {
      isProcessingRef.current = false;
    }
  }, [videoRef, pixelChangeThreshold, onFrameCaptured, onError]);

  const start = useCallback(async () => {
    if (!videoRef.current) {
      setError("Video element not available");
      return;
    }

    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      videoRef.current.srcObject = stream;
      await new Promise<void>((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            resolve();
          };
        }
      });

      setIsActive(true);
      setError(null);

      // Start periodic frame checking
      checkTimerRef.current = setInterval(captureAndSend, checkInterval);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to access camera";
      setError(errorMsg);
      onError?.(err instanceof Error ? err : new Error(errorMsg));
    }
  }, [videoRef, checkInterval, captureAndSend, onError]);

  const stop = useCallback(() => {
    if (checkTimerRef.current) {
      clearInterval(checkTimerRef.current);
      checkTimerRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
    lastImageDataRef.current = null;
  }, [videoRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isActive,
    canvasRef,
    lastFrame,
    lastOCRText,
    pixelChangePercent,
    start,
    stop,
    error,
  };
}
