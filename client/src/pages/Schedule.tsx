import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  History, 
  Brain, 
  Lightbulb, 
  Timer, 
  Target,
  FlaskConical,
  BookOpen,
  BrainCircuit,
  Settings2,
  X,
  Clock,
  MapPin,
  Tag as TagIcon,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  format, 
  addDays, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  addMonths,
  subMonths,
  getDay
} from 'date-fns';
import { PageLayout } from '../components/PageLayout';
import { cn } from '../lib/utils';

type Session = {
  id: number;
  title: string;
  time: string;
  location: string;
  category: keyof typeof iconMap;
  color: 'blue' | 'orange' | 'purple' | 'green';
  tag: string;
  date: string; // ISO string
};

const iconMap = {
  science: FlaskConical,
  history: BookOpen,
  neuro: BrainCircuit,
  general: Brain
};

const DEFAULT_SESSIONS: Session[] = [];

export function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Initialize from localStorage or defaults
  const [sessions, setSessions] = useState<Session[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_SESSIONS;
    const saved = localStorage.getItem('studyai_sessions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_SESSIONS;
      }
    }
    return DEFAULT_SESSIONS;
  });

  // keep currentDate in sync with real-world time (updates once a minute)
  React.useEffect(() => {
    const t = setInterval(() => {
      setCurrentDate(new Date());
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  // Persist to localStorage whenever sessions change
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('studyai_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  const [formData, setFormData] = useState({
    title: '',
    time: '',
    location: '',
    category: 'general' as keyof typeof iconMap,
    color: 'blue' as Session['color'],
    tag: 'Upcoming'
  });

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    const newSession: Session = {
      id: Date.now(),
      title: formData.title,
      time: formData.time,
      location: formData.location,
      category: formData.category,
      color: formData.color,
      tag: formData.tag,
      date: currentDate.toISOString()
    };
    setSessions([newSession, ...sessions]);
    setIsModalOpen(false);
    setFormData({
      title: '',
      time: '',
      location: '',
      category: 'general',
      color: 'blue',
      tag: 'Upcoming'
    });
  };

  const removeSession = (id: number) => {
    setSessions(sessions.filter(s => s.id !== id));
  };

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({
    start: monthStart,
    end: monthEnd
  });

  const startDay = getDay(monthStart); // 0 (Sun) to 6 (Sat)

  const handleStartFocusSession = () => {
    // You can replace this with your navigation logic
    // For now, we'll just show an alert or use window.location
    window.location.href = '/focus';
    // Or if you want to show a message instead:
    // alert('Focus session feature coming soon!');
  };

  return (
    <PageLayout title="Study Schedule" searchPlaceholder="search for subject, notes, or tools...">
      <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePrevMonth}
                  className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <ChevronLeft className="size-5 text-slate-400" />
                </button>
                <button 
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Today
                </button>
              </div>
              <h3 className="font-bold text-slate-900">{format(currentDate, 'MMMM yyyy')}</h3>
              <button 
                onClick={handleNextMonth}
                className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <ChevronRight className="size-5 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-y-4 text-center text-sm mb-4">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <div key={`${day}-${idx}`} className="text-slate-400 font-bold text-xs uppercase tracking-widest">{day}</div>
              ))}
              {/* Padding for start of month */}
              {Array.from({ length: startDay }).map((_, i) => (
                <div key={`pad-${i}`} className="py-2 text-slate-200 opacity-0">0</div>
              ))}
              {days.map((day) => {
                const isSelected = isSameDay(day, currentDate);
                const isTodayDate = isToday(day);
                const dateKey = day.toISOString();
                const hasSessions = sessions.some(s => isSameDay(new Date(s.date), day));
                
                return (
                  <div key={dateKey} className="relative py-2 flex items-center justify-center">
                    <div 
                      onClick={() => setCurrentDate(day)}
                      className={cn(
                        "size-9 flex items-center justify-center rounded-full font-bold transition-all cursor-pointer relative",
                        isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : 
                        isTodayDate ? "text-blue-600 bg-blue-50" : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {format(day, 'd')}
                      {hasSessions && !isSelected && (
                        <span className="size-1 bg-slate-300 rounded-full absolute -bottom-1 left-1/2 -translate-x-1/2" />
                      )}
                      {isTodayDate && !isSelected && (
                        <span className="size-1 bg-blue-600 rounded-full absolute -bottom-1 left-1/2 -translate-x-1/2" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Sessions List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Upcoming Sessions</h3>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="text-blue-600 text-sm font-bold hover:underline flex items-center gap-1"
              >
                <Plus className="size-4" />
                Add Session
              </button>
            </div>

            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {sessions.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white p-12 rounded-3xl border border-slate-200 flex flex-col items-center justify-center text-center"
                  >
                    <div className="size-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-4">
                      <Plus className="size-8 text-blue-600" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-2">No sessions yet</h4>
                    <p className="text-slate-500 font-medium mb-6 max-w-sm">
                      Add your first study session to start organizing your schedule
                    </p>
                    <button 
                      onClick={() => setIsModalOpen(true)}
                      className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                    >
                      Add New Session
                    </button>
                  </motion.div>
                ) : (
                  sessions.map((session, idx) => {
                    const Icon = iconMap[session.category] || Brain;
                    return (
                      <motion.div 
                        key={session.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ x: 8 }}
                        className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className={cn(
                          "size-14 rounded-2xl flex items-center justify-center transition-colors",
                          session.color === 'blue' ? "bg-blue-50 text-blue-600 group-hover:bg-blue-100" : 
                          session.color === 'orange' ? "bg-orange-50 text-orange-600 group-hover:bg-orange-100" :
                          session.color === 'purple' ? "bg-purple-50 text-purple-600 group-hover:bg-purple-100" :
                          "bg-green-50 text-green-600 group-hover:bg-green-100"
                        )}>
                          <Icon className="size-6" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900">{session.title}</h4>
                          <p className="text-sm text-slate-500 font-medium mt-1">{session.time} • {session.location}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
                            session.tag === 'Today' ? "bg-blue-100 text-blue-700" :
                            session.tag === 'Urgent' ? "bg-red-100 text-red-700" :
                            "bg-slate-100 text-slate-600"
                          )}>
                            {session.tag}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSession(session.id);
                            }}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Bottom Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="bg-blue-600 p-10 rounded-3xl text-white relative overflow-hidden group cursor-pointer shadow-xl shadow-blue-200"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Lightbulb className="size-5" />
                </div>
                <span className="font-bold uppercase text-[10px] tracking-[0.2em] opacity-80">Daily Learning Tip</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Spaced Repetition</h3>
              <p className="text-blue-50/80 leading-relaxed mb-8 max-w-md font-medium">
                Reviewing information at increasing intervals improves long-term retention. Try setting reminders for 1, 3, and 7 days after learning something new.
              </p>
              <button className="bg-white text-blue-600 px-8 py-3 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all shadow-lg shadow-blue-900/20">
                Learn More
              </button>
            </div>
            <div className="absolute -bottom-12 -right-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Brain className="size-[240px]" />
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="bg-white p-10 rounded-3xl border border-slate-200 relative overflow-hidden group cursor-pointer shadow-sm"
          >
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-6 text-blue-600">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Timer className="size-5" />
                </div>
                <span className="font-bold uppercase text-[10px] tracking-[0.2em]">Focus Session</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Ready to focus?</h3>
              <p className="text-slate-500 leading-relaxed mb-10 max-w-md font-medium">
                Enter focus mode to block distractions and use the Pomodoro timer for your next study session.
              </p>
              <div className="mt-auto flex gap-4">
                <button 
                  onClick={handleStartFocusSession}
                  className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                >
                  Start Session
                </button>
                <button className="px-5 py-4 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors text-slate-400">
                  <Settings2 className="size-5" />
                </button>
              </div>
            </div>
            <div className="absolute -top-12 -right-12 text-slate-50 group-hover:text-blue-50 transition-colors duration-700">
              <Target className="size-[280px]" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Add Session Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-slate-900">Add New Session</h3>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X className="size-6 text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleAddSession} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Session Title</label>
                    <div className="relative">
                      <Brain className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                      <input 
                        required
                        type="text" 
                        placeholder="e.g. Advanced Calculus Review"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Time</label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                        <input 
                          required
                          type="text" 
                          placeholder="10:00 - 12:00"
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-sm"
                          value={formData.time}
                          onChange={e => setFormData({...formData, time: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                        <input 
                          required
                          type="text" 
                          placeholder="Room 302 / Online"
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-sm"
                          value={formData.location}
                          onChange={e => setFormData({...formData, location: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Category</label>
                      <select 
                        className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-sm appearance-none"
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value as any})}
                      >
                        <option value="general">General Study</option>
                        <option value="science">Science / Lab</option>
                        <option value="history">History / Arts</option>
                        <option value="neuro">Neuroscience</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Tag</label>
                      <div className="relative">
                        <TagIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Upcoming / Urgent"
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-sm"
                          value={formData.tag}
                          onChange={e => setFormData({...formData, tag: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Color Theme</label>
                    <div className="flex gap-3">
                      {(['blue', 'orange', 'purple', 'green'] as const).map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setFormData({...formData, color: c})}
                          className={cn(
                            "size-10 rounded-full transition-all border-4",
                            c === 'blue' ? "bg-blue-500" : 
                            c === 'orange' ? "bg-orange-500" : 
                            c === 'purple' ? "bg-purple-500" : "bg-green-500",
                            formData.color === c ? "border-slate-200 scale-110" : "border-transparent opacity-60"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all mt-4"
                  >
                    Create Session
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
}