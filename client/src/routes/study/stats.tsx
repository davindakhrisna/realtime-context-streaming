import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { StudyAssistantPanel } from '#/lib/components/StudyAssistantPanel';
import { PageLayout } from '#/components/PageLayout';
import {
  BarChart3,
  Play,
  Lightbulb,
  CircleMinus,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { useAtom } from 'jotai';
import { currentSessionIdAtom } from '#/lib/atoms/queryAtoms';
// removed motion/react to avoid adding a new dependency

export const Route = createFileRoute('/study/stats')({
  component: StatsPage,
});

function StatsPage() {
  const [sessionId] = useAtom(currentSessionIdAtom);

  return (
    <PageLayout title="Statistics" searchPlaceholder="search sessions...">
      <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-blue-600 mb-1">
            <Activity className="size-5" />
            <span className="font-bold text-sm">Statistics</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Statistics Overview</h1>
          <p className="text-slate-500 font-medium">Track your learning progress and performance across all courses.</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-[32px] flex flex-col items-center justify-center p-20 text-center shadow-sm min-h-[500px]">
          <div className="size-48 bg-slate-50 rounded-3xl flex items-center justify-center mb-12 relative">
            <div className="absolute inset-4 border-2 border-slate-100 rounded-2xl border-dashed" />
            <BarChart3 className="size-24 text-slate-200" />
          </div>
          
          <h3 className="text-2xl font-bold text-slate-900 mb-4">No statistics available yet</h3>
          <p className="text-slate-500 max-w-md mb-12 leading-relaxed font-medium">
            Start your first study session to see your progress data, focus metrics, and learning velocity here.
          </p>
          
          <button
            disabled={!sessionId}
            className="flex items-center gap-3 px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:shadow-xl hover:shadow-blue-200 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="size-5 fill-current" />
            Start Studying
          </button>
          {!sessionId && (
            <p className="text-sm text-red-500 mt-3">No active session. Start screen capture first.</p>
          )}
        </div>

        <div className="space-y-6">
          <h4 className="text-xl font-bold text-slate-900">Quick Tips</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl p-8 flex gap-8 items-start shadow-sm border border-slate-100 group cursor-pointer">
              <div className="size-16 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="size-8 text-orange-400" />
              </div>
              <div className="flex-1">
                <h5 className="text-lg font-bold text-slate-900 mb-2">Learning Tip</h5>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">
                  Use the <span className="text-blue-600 italic">Pomodoro Technique</span>: study for 25 minutes followed by a 5-minute break to maintain high concentration levels.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 flex gap-8 items-start shadow-sm border border-slate-100 group cursor-pointer">
              <div className="size-16 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <CircleMinus className="size-8 text-blue-500" />
              </div>
              <div className="flex-1">
                <h5 className="text-lg font-bold text-slate-900 mb-2">Focus Mode</h5>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">
                  Minimize distractions by silencing notifications and creating a dedicated workspace to improve information retention by up to 40%.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <StudyAssistantPanel />
    </PageLayout>
  );
}
