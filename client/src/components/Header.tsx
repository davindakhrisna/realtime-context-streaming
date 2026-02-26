import { Search, Bell, HelpCircle } from 'lucide-react';

interface HeaderProps {
  title: string;
  searchPlaceholder?: string;
}

export function Header({ title, searchPlaceholder = "Search for subjects, notes, or tools..." }: HeaderProps) {
  return (
    <header className="h-20 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 px-8 flex items-center justify-between">
      <div className="flex items-center gap-8 flex-1">
        <h2 className="text-xl font-bold text-slate-900 whitespace-nowrap">{title}</h2>
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input 
            type="text" 
            placeholder={searchPlaceholder}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium placeholder:text-slate-400"
          />
        </div>
      </div>

        <div className="flex items-center gap-3 ml-8">
          <button className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
            <Bell className="size-5" />
          </button>
          <button className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
            <HelpCircle className="size-5" />
          </button>
        </div>
    </header>
  );
}
