import { createFileRoute } from '@tanstack/react-router';
import { StudyAssistantPanel } from '#/lib/components/StudyAssistantPanel';
import { FlashcardView } from '#/lib/components/FlashcardView';

export const Route = createFileRoute('/study/flashcards')({
  component: FlashcardsPage,
});

function FlashcardsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Flashcards
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Review AI-generated flashcards from your study sessions
          </p>
        </header>

        <FlashcardView />
      </div>

      <StudyAssistantPanel />
    </div>
  );
}
