import { useState, useRef, useEffect } from 'react';
import {
  History,
  Plus,
  ScreenShare,
  Mic,
  Sparkles,
  Lightbulb,
  Zap,
  StopCircle,
  Video,
} from 'lucide-react';
// lightweight: remove dependency on motion/react (not installed)
import { PageLayout } from '../components/PageLayout';

export default function Dashboard() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCapture = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      }).catch(async (err) => {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          throw err;
        }
        console.warn('Retrying without audio...');
        return await navigator.mediaDevices.getDisplayMedia({ video: true });
      });

      setStream(mediaStream as MediaStream);
      setIsCapturing(true);

      (mediaStream as MediaStream).getVideoTracks()[0].onended = () => {
        stopCapture();
      };
    } catch (err: any) {
      console.error('Error starting screen capture:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Permission denied. Please allow screen sharing when prompted.');
      } else if (err.message?.includes('permissions policy')) {
        setError("Screen capture is blocked by the browser's security policy. Please ensure the app has 'display-capture' permissions enabled.");
      } else {
        setError('Failed to start screen capture. Please try again.');
      }
    }
  };

  const stopCapture = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsCapturing(false);
    }
  };

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <PageLayout title="Live Study Session" searchPlaceholder="search for subject, notes, or tools...">
      <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Live Study Session</h1>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-all">
              <History className="size-4" />
              History
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">
              <Plus className="size-4" />
              New Session
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Capture Area */}
          <div className="lg:col-span-2 space-y-6">
            {
              !isCapturing ? (
                <div
                  key="ready"
                  className="bg-white border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-16 text-center min-h-[450px] shadow-sm"
                >
                  <div className="size-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-8">
                    <ScreenShare className="size-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Ready to start?</h3>
                  <p className="text-slate-500 max-w-md mb-6 leading-relaxed">
                    Share your screen to begin capturing live notes, generating summaries, and tracking your focus during your lecture.
                  </p>

                  {error && (
                    <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium max-w-md">
                      <div className="size-2 rounded-full bg-red-500 shrink-0" />
                      {error}
                    </div>
                  )}

                  <button
                    onClick={startCapture}
                    className="flex items-center gap-3 px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:shadow-xl hover:shadow-blue-200 transition-all hover:-translate-y-0.5"
                  >
                    <ScreenShare className="size-5" />
                    Start Screen Capture
                  </button>
                </div>
              ) : (
                <div
                  key="capturing"
                  className="bg-slate-900 rounded-3xl overflow-hidden min-h-[450px] shadow-2xl relative group"
                >
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain bg-black" />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold animate-pulse">
                          <div className="size-2 rounded-full bg-white" />
                          LIVE CAPTURING
                        </div>
                        <div className="text-white/80 text-sm font-medium flex items-center gap-2">
                          <Video className="size-4" />
                          Screen Stream Active
                        </div>
                      </div>

                      <button
                        onClick={stopCapture}
                        className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-red-50 hover:text-red-600 transition-all shadow-lg"
                      >
                        <StopCircle className="size-4" />
                        Stop Capture
                      </button>
                    </div>
                  </div>
                </div>
              )
            }

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Sparkles className="size-4 text-blue-600" />
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Live Summary</h4>
              </div>
              <div className="p-8">
                {isCapturing ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full bg-blue-600 animate-bounce" />
                      <p className="text-sm text-slate-600 font-medium">Analyzing screen content in real-time...</p>
                    </div>
                    <div className="h-4 bg-slate-50 rounded-full w-3/4 animate-pulse" />
                    <div className="h-4 bg-slate-50 rounded-full w-1/2 animate-pulse" />
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic font-medium">
                    Summary will appear here once the session begins...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Transcript */}
          <div className="bg-white rounded-3xl border border-slate-200 flex flex-col shadow-sm h-full min-h-[600px]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                  <Mic className="size-4" />
                </div>
                <h4 className="font-bold text-slate-900">Live Transcript</h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-slate-300 animate-pulse" />
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
              <div className="size-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
                <Mic className="size-8" />
              </div>
              <p className="text-sm font-bold text-slate-900 mb-2">Waiting for speech...</p>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[200px]">Audio transcription will appear here once the session starts.</p>
            </div>

            <div className="p-6 border-t border-slate-100">
              <button className="w-full py-3 bg-slate-50 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors border border-slate-100">Configure Microphones</button>
            </div>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl p-8 flex gap-8 items-start shadow-sm border border-slate-100 group cursor-pointer hover:-translate-y-1 transition-transform">
            <div className="size-28 rounded-2xl bg-orange-50 flex-shrink-0 overflow-hidden relative">
              <img src="https://picsum.photos/seed/tomato/200/200" alt="Pomodoro" className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-orange-500/10" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="size-4 text-orange-500" />
                <p className="text-orange-500 text-[10px] font-bold uppercase tracking-widest">Learning Tip</p>
              </div>
              <h5 className="text-xl font-bold text-slate-900 mb-3">The Pomodoro Technique</h5>
              <p className="text-slate-500 text-sm leading-relaxed">Boost your focus by studying for 25 minutes followed by a 5-minute break. This keeps your mind fresh and engaged.</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 flex gap-8 items-start shadow-sm border border-slate-100 group cursor-pointer hover:-translate-y-1 transition-transform">
            <div className="size-28 rounded-2xl bg-blue-50 flex-shrink-0 overflow-hidden relative">
              <img src="https://picsum.photos/seed/focus/200/200" alt="Focus Mode" className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-blue-500/10" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="size-4 text-blue-600" />
                <p className="text-blue-600 text-[10px] font-bold uppercase tracking-widest">Status</p>
              </div>
              <h5 className="text-xl font-bold text-slate-900 mb-3">Focus Mode</h5>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">Deep Work Enabled. Notifications from non-essential apps are currently silenced.</p>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-green-500" />
                <span className="text-xs font-bold text-green-600">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
