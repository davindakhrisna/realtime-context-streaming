import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useAtom } from 'jotai';
import { 
  Library, 
  Plus, 
  Sparkles, 
  Lightbulb, 
  Zap,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  CircleMinus,
  Download,
  Loader2
} from 'lucide-react';
import { StudyAssistantPanel } from '#/lib/components/StudyAssistantPanel';
import { PageLayout } from '#/components/PageLayout';
import { currentSessionIdAtom } from '#/lib/atoms/queryAtoms';
import { useGenerateStudyMaterials } from '#/lib/hooks/useStudyQueries';

export const Route = createFileRoute('/study/materials')({
  component: MaterialsPage,
});

function MaterialsPage() {
  const [sessionId] = useAtom(currentSessionIdAtom);
  const [materials, setMaterials] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generateMutation = useGenerateStudyMaterials();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await generateMutation.mutateAsync({
        session_id: sessionId,
      });

      if (response.success) {
        setMaterials(response.materials);
      }
    } catch (error) {
      console.error('Failed to generate materials:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    if (!materials) return;

    const blob = new Blob([materials], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-materials-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <PageLayout title="Study Materials" searchPlaceholder="Search materials...">
      <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-blue-600 mb-1">
            <Sparkles className="size-5" />
            <span className="font-bold text-sm">Study Materials</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Study Materials</h1>
          <p className="text-slate-500 font-medium">Manage and create your personalized learning resources.</p>
        </div>

        {!materials ? (
          <div className="bg-white border border-slate-100 rounded-[40px] flex flex-col items-center justify-center p-20 text-center shadow-sm min-h-[550px] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-transparent pointer-events-none" />
            
            <div className="relative mb-12 group">
              <div className="size-64 bg-slate-100 rounded-[48px] opacity-20 group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="size-40 bg-white rounded-[32px] shadow-2xl shadow-slate-200 flex items-center justify-center border border-slate-100">
                  <FolderOpen className="size-20 text-blue-100" />
                </div>
              </div>
            </div>
            
            <h3 className="text-3xl font-bold text-slate-900 mb-4">Generate Study Materials</h3>
            <p className="text-slate-500 max-w-md mb-12 leading-relaxed font-medium">
              Ready to start learning? Create customized materials for your subjects in seconds using our AI study assistant.
            </p>
            
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !sessionId}
              className="flex items-center gap-3 px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:shadow-xl hover:shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="size-5" />
              {isGenerating ? 'Generating...' : 'Generate Materials'}
            </button>
            {!sessionId && (
              <p className="text-sm text-red-500 mt-4">No active session. Start screen capture first.</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Generated Study Notes</h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setMaterials('')}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Generate New
                </button>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>

            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-slate-900">{materials}</div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <h4 className="text-xl font-bold text-slate-900">Recommended for You</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl p-8 flex gap-8 items-start shadow-sm border border-slate-100 group cursor-pointer">
              <div className="size-16 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="size-8 text-orange-400" />
              </div>
              <div className="flex-1">
                <h5 className="text-lg font-bold text-slate-900 mb-2">Learning Tip</h5>
                <p className="text-slate-500 text-sm leading-relaxed mb-4 font-medium">
                  Regular study sessions are more effective than cramming. Aim for 25-minute intervals with 5-minute breaks.
                </p>
                <button className="text-blue-600 text-sm font-bold hover:underline">Learn more</button>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 flex gap-8 items-start shadow-sm border border-slate-100 group cursor-pointer">
              <div className="size-16 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <CircleMinus className="size-8 text-blue-500" />
              </div>
              <div className="flex-1">
                <h5 className="text-lg font-bold text-slate-900 mb-2">Focus Mode</h5>
                <p className="text-slate-500 text-sm leading-relaxed mb-4 font-medium">
                  Block distractions and silence notifications while you work on your study materials to increase retention.
                </p>
                <button className="text-blue-600 text-sm font-bold hover:underline">Enable now</button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 mt-auto">
        </div>
      </div>

      <StudyAssistantPanel />
    </PageLayout>
  );
}
