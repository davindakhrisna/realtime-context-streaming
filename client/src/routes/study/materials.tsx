import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useAtom } from 'jotai';
import { FileText, Download, Loader2, Sparkles } from 'lucide-react';
import { StudyAssistantPanel } from '#/lib/components/StudyAssistantPanel';
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Study Materials
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            AI-generated study notes from your screen content
          </p>
        </header>

        {!materials ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
            <div className="text-center max-w-md">
              <FileText className="w-16 h-16 mx-auto mb-4 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Generate Study Materials
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Create comprehensive study notes with key concepts, definitions, and summaries.
              </p>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !sessionId}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 mx-auto"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Materials
                  </>
                )}
              </button>
              {!sessionId && (
                <p className="text-sm text-red-500 mt-3">
                  No active session. Start screen capture first.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Generated Study Notes
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setMaterials('')}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Generate New
                </button>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>
              </div>
            </div>

            <div className="prose dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-gray-900 dark:text-white">
                {materials}
              </div>
            </div>
          </div>
        )}
      </div>

      <StudyAssistantPanel />
    </div>
  );
}
