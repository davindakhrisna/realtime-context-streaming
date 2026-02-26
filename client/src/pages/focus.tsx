import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronLeft, 
  Coffee, 
  Brain, 
  Settings2,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

const MODE_CONFIG = {
  work: { label: 'Focus', color: 'text-blue-600', bg: 'bg-blue-50', accent: 'bg-blue-600', icon: Brain },
  shortBreak: { label: 'Short Break', color: 'text-emerald-600', bg: 'bg-emerald-50', accent: 'bg-emerald-600', icon: Coffee },
  longBreak: { label: 'Long Break', color: 'text-purple-600', bg: 'bg-purple-50', accent: 'bg-purple-600', icon: Coffee },
};

export function FocusMode() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<TimerMode>('work');
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Durations State (in minutes)
  const [durations, setDurations] = useState(() => {
    if (typeof window === 'undefined') return { work: 25, shortBreak: 5, longBreak: 15 };
    const saved = localStorage.getItem('studyai_focus_durations');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return { work: 25, shortBreak: 5, longBreak: 15 };
      }
    }
    return { work: 25, shortBreak: 5, longBreak: 15 };
  });

  const [timeLeft, setTimeLeft] = useState(durations.work * 60);

  // Persist durations
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('studyai_focus_durations', JSON.stringify(durations));
    }
  }, [durations]);

  // Stats State
  const [stats, setStats] = useState(() => {
    if (typeof window === 'undefined') return { sessionsToday: 0, focusTimeToday: 0, streak: 0, lastDate: '' };
    const saved = localStorage.getItem('studyai_focus_stats');
    const defaultStats = { sessionsToday: 0, focusTimeToday: 0, streak: 0, lastDate: '' };
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const today = new Date().toDateString();
        // Reset daily stats if it's a new day
        if (parsed.lastDate !== today) {
          // Check for streak
          const lastDate = parsed.lastDate ? new Date(parsed.lastDate) : null;
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          
          let newStreak = parsed.streak;
          if (parsed.lastDate === yesterday.toDateString()) {
            // Streak continues (will be incremented on first session of the day)
          } else if (parsed.lastDate !== today) {
            // Streak broken if more than 1 day gap
            newStreak = 0;
          }
          
          return { ...parsed, sessionsToday: 0, focusTimeToday: 0, streak: newStreak, lastDate: today };
        }
        return parsed;
      } catch (e) {
        return defaultStats;
      }
    }
    return defaultStats;
  });

  // Persist stats
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('studyai_focus_stats', JSON.stringify(stats));
    }
  }, [stats]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setTimeLeft(durations[mode] * 60);
  }, [mode, durations]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          // Track focus time in real-time
          if (mode === 'work') {
            setStats(prevStats => ({
              ...prevStats,
              focusTimeToday: prevStats.focusTimeToday + 1,
              lastDate: new Date().toDateString()
            }));
          }
          return newTime;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      
      // Handle session completion
      if (mode === 'work') {
        setStats(prevStats => {
          const today = new Date().toDateString();
          let newStreak = prevStats.streak;
          
          // Increment streak if it's the first session of the day
          if (prevStats.lastDate !== today || prevStats.sessionsToday === 0) {
            newStreak = (prevStats.streak || 0) + 1;
          }

          return {
            ...prevStats,
            sessionsToday: prevStats.sessionsToday + 1,
            streak: newStreak,
            lastDate: today
          };
        });
      }

      // Play sound notification if not muted
      if (!isMuted) {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(() => {});
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, isMuted, mode]);

  useEffect(() => {
    resetTimer();
  }, [mode, resetTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFocusTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const progress = ((durations[mode] * 60 - timeLeft) / (durations[mode] * 60)) * 100;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleSaveSettings = (newDurations: typeof durations) => {
    setDurations(newDurations);
    setIsSettingsOpen(false);
    if (!isActive) {
      setTimeLeft(newDurations[mode] * 60);
    }
  };

  return (
    <div className={cn(
      "flex-1 flex flex-col transition-colors duration-700",
      mode === 'work' ? "bg-slate-50" : mode === 'shortBreak' ? "bg-emerald-50/30" : "bg-purple-50/30"
    )}>
      {/* Header */}
      <div className="px-8 py-6 flex items-center justify-between">
        <button 
          onClick={() => navigate('/schedule')}
          className="p-3 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-slate-200 text-slate-400 hover:text-slate-900"
        >
          <ChevronLeft className="size-6" />
        </button>

        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          {(Object.keys(MODE_CONFIG) as TimerMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                mode === m 
                  ? cn(MODE_CONFIG[m].bg, MODE_CONFIG[m].color) 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              {MODE_CONFIG[m].label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="p-3 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-slate-200 text-slate-400"
          >
            {isMuted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
          <button 
            onClick={toggleFullscreen}
            className="p-3 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-slate-200 text-slate-400"
          >
            {isFullscreen ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="relative size-[450px] flex items-center justify-center">
          {/* Progress Ring */}
          <svg className="absolute inset-0 size-full -rotate-90">
            <circle
              cx="225"
              cy="225"
              r="210"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-slate-200"
            />
            <motion.circle
              cx="225"
              cy="225"
              r="210"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray="1319.47"
              initial={{ strokeDashoffset: 1319.47 }}
              animate={{ strokeDashoffset: 1319.47 - (1319.47 * progress) / 100 }}
              transition={{ duration: 0.5, ease: "linear" }}
              className={MODE_CONFIG[mode].color}
              strokeLinecap="round"
            />
          </svg>

          {/* Timer Content */}
          <div className="relative text-center">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-3 mb-4"
            >
              {mode === 'work' ? <Brain className="size-6 text-blue-600" /> : <Coffee className="size-6 text-emerald-600" />}
              <span className={cn("font-bold uppercase tracking-[0.3em] text-xs", MODE_CONFIG[mode].color)}>
                {MODE_CONFIG[mode].label} Mode
              </span>
            </motion.div>
            
            <h2 className="text-[120px] font-black text-slate-900 leading-none tracking-tighter tabular-nums">
              {formatTime(timeLeft)}
            </h2>

            <div className="flex items-center justify-center gap-6 mt-12">
              <button 
                onClick={resetTimer}
                className="size-16 flex items-center justify-center bg-white border border-slate-200 rounded-3xl text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all active:scale-95"
              >
                <RotateCcw className="size-6" />
              </button>
              
              <button 
                onClick={toggleTimer}
                className={cn(
                  "size-24 flex items-center justify-center rounded-[32px] text-white shadow-2xl transition-all active:scale-95",
                  MODE_CONFIG[mode].accent,
                  mode === 'work' ? "shadow-blue-200" : mode === 'shortBreak' ? "shadow-emerald-200" : "shadow-purple-200"
                )}
              >
                {isActive ? <Pause className="size-10 fill-current" /> : <Play className="size-10 fill-current ml-1" />}
              </button>

              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="size-16 flex items-center justify-center bg-white border border-slate-200 rounded-3xl text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all active:scale-95"
              >
                <Settings2 className="size-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Motivational Text */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-16 text-slate-400 font-medium italic text-center max-w-sm"
        >
          {mode === 'work' 
            ? "Stay focused. Your future self will thank you for the effort you put in today."
            : "Take a deep breath. A short rest will help you maintain peak performance."}
        </motion.p>
      </div>

      {/* Bottom Stats */}
      <div className="p-12 flex items-center justify-center gap-12">
        <div className="text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sessions Today</p>
          <p className="text-xl font-bold text-slate-900">{stats.sessionsToday} / 8</p>
        </div>
        <div className="size-1 bg-slate-300 rounded-full" />
        <div className="text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Focus Time</p>
          <p className="text-xl font-bold text-slate-900">{formatFocusTime(stats.focusTimeToday)}</p>
        </div>
        <div className="size-1 bg-slate-300 rounded-full" />
        <div className="text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Daily Streak</p>
          <p className="text-xl font-bold text-slate-900">{stats.streak} Days</p>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-slate-900">Timer Settings</h3>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="size-6 text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                {(Object.keys(durations) as TimerMode[]).map((m) => (
                  <div key={m} className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
                      {MODE_CONFIG[m].label} Duration (minutes)
                    </label>
                    <input 
                      type="number" 
                      min="1"
                      max="120"
                      value={durations[m]}
                      onChange={(e) => setDurations({ ...durations, [m]: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-slate-900"
                    />
                  </div>
                ))}

                <button 
                  onClick={() => handleSaveSettings(durations)}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all mt-4"
                >
                  Save Settings
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
