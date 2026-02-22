/**
 * Display component for speech-to-text transcriptions.
 */

interface STTDisplayProps {
  currentTranscript: string;
  allTranscripts: string[];
  isActive: boolean;
}

export default function STTDisplay({
  currentTranscript,
  allTranscripts,
  isActive,
}: STTDisplayProps) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        Speech-to-Text
        {isActive && (
          <span className="ml-auto flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-400">Listening</span>
          </span>
        )}
      </h2>

      {/* Current Transcript */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
          Current Transcript
        </div>
        <div className="min-h-[60px] p-3 bg-slate-900/50 rounded-lg border border-slate-700">
          {currentTranscript ? (
            <p className="text-gray-200">{currentTranscript}</p>
          ) : (
            <p className="text-gray-600 italic">No speech detected...</p>
          )}
        </div>
      </div>

      {/* All Transcripts */}
      <div>
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
          Session Transcripts ({allTranscripts.length})
        </div>
        <div className="max-h-[200px] overflow-y-auto space-y-2 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
          {allTranscripts.length > 0 ? (
            allTranscripts.map((transcript, index) => (
              <div
                key={index}
                className="p-2 bg-slate-800 rounded border border-slate-700"
              >
                <p className="text-gray-300 text-sm">{transcript}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-600 italic text-sm">
              Transcripts will appear here as you speak...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
