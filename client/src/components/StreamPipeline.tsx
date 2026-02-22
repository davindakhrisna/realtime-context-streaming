/**
 * Main pipeline controller component.
 * Manages STT and frame capture workflows.
 */

import { useRef, useState, useCallback } from "react";
import { useSTT } from "#/hooks/useSTT";
import { useFrameCapture } from "#/hooks/useFrameCapture";
import { getEmbeddings, type EmbeddingItem } from "#/lib/api";
import STTDisplay from "./STTDisplay";
import OCRDisplay from "./OCRDisplay";
import EmbeddingsView from "./EmbeddingsView";

export default function StreamPipeline() {
  const [isRunning, setIsRunning] = useState(false);
  const [embeddings, setEmbeddings] = useState<EmbeddingItem[]>([]);
  const [stats, setStats] = useState({ total: 0, stt: 0, ocr: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    isActive: sttActive,
    currentTranscript,
    allTranscripts,
    start: startSTT,
    stop: stopSTT,
    clear: clearSTT,
    error: sttError,
  } = useSTT({
    sendInterval: 10000,
    onTranscription: (text) => {
      console.log("STT transcription:", text);
    },
    onSent: (text, success) => {
      console.log("STT sent:", success, text);
      refreshEmbeddings();
    },
  });

  const {
    isActive: captureActive,
    canvasRef,
    lastOCRText,
    pixelChangePercent,
    start: startCapture,
    stop: stopCapture,
    error: captureError,
  } = useFrameCapture({
    checkInterval: 5000,
    pixelChangeThreshold: 0.02,
    videoRef,
    onFrameCaptured: (text, success) => {
      console.log("OCR result:", success, text);
      refreshEmbeddings();
    },
  });

  const refreshEmbeddings = useCallback(async () => {
    try {
      const response = await getEmbeddings(100);
      setEmbeddings(response.embeddings);

      const sttCount = response.embeddings.filter(
        (e) => e.source_type === "stt",
      ).length;
      const ocrCount = response.embeddings.filter(
        (e) => e.source_type === "ocr",
      ).length;

      setStats({
        total: response.embeddings.length,
        stt: sttCount,
        ocr: ocrCount,
      });
    } catch (error) {
      console.error("Failed to refresh embeddings:", error);
    }
  }, []);

  const handleStart = useCallback(async () => {
    await startSTT();
    await startCapture();
    setIsRunning(true);
    refreshEmbeddings();
  }, [startSTT, startCapture, refreshEmbeddings]);

  const handleStop = useCallback(() => {
    stopSTT();
    stopCapture();
    setIsRunning(false);
  }, [stopSTT, stopCapture]);

  const handleClear = useCallback(() => {
    clearSTT();
    setEmbeddings([]);
    setStats({ total: 0, stt: 0, ocr: 0 });
  }, [clearSTT]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Stream Context Pipeline
          </h1>
          <p className="text-gray-400">
            Real-time STT and OCR with embedding storage
          </p>
        </div>

        {/* Control Panel */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {!isRunning ? (
                <button
                  onClick={handleStart}
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-green-500/30 flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Start Pipeline
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-red-500/30 flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Stop Pipeline
                </button>
              )}

              <button
                onClick={handleClear}
                className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
              >
                Clear All
              </button>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${sttActive ? "bg-green-500 animate-pulse" : "bg-gray-500"}`}
                />
                <span className="text-gray-300 text-sm">
                  STT: {sttActive ? "Active" : "Stopped"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${captureActive ? "bg-blue-500 animate-pulse" : "bg-gray-500"}`}
                />
                <span className="text-gray-300 text-sm">
                  OCR: {captureActive ? "Active" : "Stopped"}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>
                  Embeddings: <span className="text-white">{stats.total}</span>
                </span>
                <span className="text-gray-600">|</span>
                <span>
                  STT: <span className="text-cyan-400">{stats.stt}</span>
                </span>
                <span className="text-gray-600">|</span>
                <span>
                  OCR: <span className="text-purple-400">{stats.ocr}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {(sttError || captureError) && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">
                {sttError || captureError}
              </p>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Feed */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Video Feed
            </h2>
            <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
              <canvas
                ref={canvasRef}
                className="hidden"
              />
              {!captureActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-gray-500">Camera inactive</p>
                </div>
              )}
              {captureActive && (
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-gray-300">
                  Pixel change: {(pixelChangePercent * 100).toFixed(1)}%
                </div>
              )}
            </div>
          </div>

          {/* STT Display */}
          <STTDisplay
            currentTranscript={currentTranscript}
            allTranscripts={allTranscripts}
            isActive={sttActive}
          />
        </div>

        {/* OCR Display */}
        <OCRDisplay
          ocrText={lastOCRText}
          isActive={captureActive}
        />

        {/* Embeddings View */}
        <EmbeddingsView embeddings={embeddings} />
      </div>
    </div>
  );
}
