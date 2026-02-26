import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { StudyAssistantPanel } from '#/lib/components/StudyAssistantPanel';
import { useAtom } from 'jotai';
import { currentSessionIdAtom } from '#/lib/atoms/queryAtoms';
import { PageLayout } from '#/components/PageLayout';
import {
  Plus,
  Lightbulb,
  Zap,
  ArrowRight,
  Maximize2,
  Loader2,
} from 'lucide-react';
import { useState } from 'react';
import { useGenerateFlashcards } from '#/lib/hooks/useStudyQueries';
// animations removed to avoid extra runtime dependency

export const Route = createFileRoute('/study/flashcards')({
  component: FlashcardsPage,
});

function FlashcardsPage() {
  const [sessionId] = useAtom(currentSessionIdAtom);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateMutation = useGenerateFlashcards();

  const handleGenerate = async () => {
    if (!sessionId) return;
    setIsGenerating(true);
    try {
      await generateMutation.mutateAsync({ session_id: sessionId, count: 10 });
    } catch (err) {
      console.error('Failed to generate flashcards:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <PageLayout title="Flashcards" searchPlaceholder="search for subject, notes, or tools...">
      <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Flashcards Overview</h1>
          <p className="text-slate-500 font-medium">Manage and create your study materials here.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-[32px] flex flex-col items-center justify-center p-20 text-center shadow-sm min-h-[500px]">
          <div className="relative mb-12">
            <div className="size-48 bg-slate-50 rounded-3xl rotate-6 absolute -inset-2 border border-slate-100" />
            <div className="size-48 bg-white rounded-3xl -rotate-3 relative border border-slate-200 flex items-center justify-center shadow-sm">
              <div className="size-12 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <Plus className="size-6" />
              </div>
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-slate-900 mb-4">No flashcards available yet</h3>
          <p className="text-slate-500 max-w-md mb-4 leading-relaxed font-medium">
            Start your learning journey by creating your first set of study materials or generating them from your notes.
          </p>

          <button
            onClick={handleGenerate}
            disabled={!sessionId || isGenerating}
            className="flex items-center gap-3 px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:shadow-xl hover:shadow-blue-200 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? <Loader2 className="size-5 animate-spin" /> : <Zap className="size-5 fill-current" />}
            {isGenerating ? 'Generating...' : 'Generate Flashcards'}
          </button>

          {!sessionId && (
            <p className="text-sm text-red-500 mt-3">No active session. Start screen capture first.</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl p-8 flex gap-8 items-start shadow-sm border border-slate-100 group cursor-pointer">
            <div className="size-16 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
              <div className="size-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                <Lightbulb className="size-5" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h5 className="text-lg font-bold text-slate-900">Learning Tip</h5>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-widest rounded-full">Spaced Repetition</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed mb-6 font-medium">
                Review your cards at increasing intervals (1 day, 3 days, 1 week) to move information from short-term to long-term memory more effectively.
              </p>
              <button className="flex items-center gap-2 text-blue-600 text-sm font-bold group-hover:gap-3 transition-all">
                Learn more about SRS
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 flex gap-8 items-start shadow-sm border border-slate-100 group cursor-pointer">
            <div className="size-16 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <div className="size-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                <Maximize2 className="size-5" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h5 className="text-lg font-bold text-slate-900">Focus Mode</h5>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-widest rounded-full">Efficiency</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed mb-6 font-medium">
                Minimize distractions by enabling full-screen mode during study sessions. Focus on one card at a time to increase your retention rate by up to 40%.
              </p>
              <button className="flex items-center gap-2 text-blue-600 text-sm font-bold group-hover:gap-3 transition-all">
                Configure focus settings
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <StudyAssistantPanel />
    </PageLayout>
  );
}
