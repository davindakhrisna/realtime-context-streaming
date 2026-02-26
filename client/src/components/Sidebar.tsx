
import { Link } from '@tanstack/react-router';
import { 
  LayoutDashboard, 
  Layers, 
  BarChart3, 
  Library, 
  Calendar, 
  Settings, 
  Bell,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Layers, label: 'Flashcards', path: '/study/flashcards' },
  { icon: BarChart3, label: 'Statistics', path: '/study/stats' },
  { icon: Library, label: 'Library', path: '/study/materials' },
  { icon: Calendar, label: 'Schedule', path: '/Schedule' },
];

const bottomItems = [
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
];

export function Sidebar() {
  return (
    <aside className="w-64 border-r border-slate-200 flex flex-col bg-white h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="size-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
          <Sparkles className="size-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight text-slate-900">StudyAI</h1>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              activeProps={{
                className: 'bg-blue-600 text-white shadow-lg shadow-blue-100',
              }}
              inactiveProps={{
                className: 'text-slate-600 hover:bg-slate-50 hover:text-blue-600',
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group"
            >
              <Icon className={cn("size-5", "group-hover:scale-110 transition-transform")} />
              <span className="font-semibold text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto space-y-1 border-t border-slate-100">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              activeProps={{
                className: 'bg-slate-100 text-blue-600',
              }}
              inactiveProps={{
                className: 'text-slate-600 hover:bg-slate-50 hover:text-blue-600',
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
            >
              <Icon className="size-5" />
              <span className="font-semibold text-sm">{item.label}</span>
            </Link>
          );
        })}
        
        <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-xs font-bold text-slate-900 mb-2">Weekly Goal</p>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full w-0 rounded-full" />
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-medium">0/16 hours completed</p>
        </div>
      </div>
    </aside>
  );
}
