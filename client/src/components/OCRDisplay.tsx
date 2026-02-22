/**
 * Display component for OCR results.
 */

interface OCRDisplayProps {
  ocrText: string;
  isActive: boolean;
}

export default function OCRDisplay({ ocrText, isActive }: OCRDisplayProps) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        OCR Text Extraction
        {isActive && (
          <span className="ml-auto flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-xs text-blue-400">Monitoring</span>
          </span>
        )}
      </h2>

      <div className="min-h-[100px] p-4 bg-slate-900/50 rounded-lg border border-slate-700">
        {ocrText ? (
          <div className="space-y-2">
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              Latest OCR Result
            </div>
            <p className="text-gray-200 text-lg">{ocrText}</p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600 italic">
              {isActive
                ? "Waiting for frame changes..."
                : "Start pipeline to begin OCR"}
            </p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-4 p-3 bg-slate-900/30 rounded-lg border border-slate-700/50">
        <p className="text-xs text-gray-500">
          <span className="text-purple-400 font-medium">Note:</span> Frames are
          captured every 5 seconds when pixel change exceeds 2%. Text is
          extracted using PaddleOCR and stored as embeddings.
        </p>
      </div>
    </div>
  );
}
