import { createFileRoute } from '@tanstack/react-router';
import { StudyAssistantPanel } from '#/lib/components/StudyAssistantPanel';
import { StatsDashboard } from '#/lib/components/StatsDashboard';

export const Route = createFileRoute('/study/stats')({
  component: StatsPage,
});

function StatsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Study Statistics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your learning progress and performance
          </p>
        </header>

        <StatsDashboard />
      </div>

      <StudyAssistantPanel />
    </div>
  );
}
