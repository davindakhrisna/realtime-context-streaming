import { useState } from 'react';
import { useAtom } from 'jotai';
import { ChevronLeft, ChevronRight, RotateCw, Check, X, Sparkles, Loader2 } from 'lucide-react';
import { currentSessionIdAtom } from '../atoms/queryAtoms';
import { useGenerateFlashcards, useReviewFlashcard, type Flashcard } from '../hooks/useStudyQueries';

/**
 * Flashcard View Component with flip animation
 * 
 * Displays generated flashcards with spaced repetition tracking.
 * Users can mark cards as "Know it" or "Don't Know it".
 */
export function FlashcardView() {
  const [sessionId, setSessionId] = useAtom(currentSessionIdAtom);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateMutation = useGenerateFlashcards();
  const reviewMutation = useReviewFlashcard();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await generateMutation.mutateAsync({
        session_id: sessionId,
        count: 10,
      });

      if (response.success && response.flashcards.length > 0) {
        setFlashcards(response.flashcards);
        setCurrentIndex(0);
        setIsFlipped(false);
      }
    } catch (error) {
      console.error('Failed to generate flashcards:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReview = async (wasCorrect: boolean) => {
    const currentCard = flashcards[currentIndex];
    if (!currentCard) return;

    try {
      await reviewMutation.mutateAsync({
        flashcardId: currentCard.id,
        wasCorrect,
      });
    } catch (error) {
      console.error('Failed to update flashcard:', error);
    }

    // Move to next card
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      // Loop back or show completion
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  };

  if (flashcards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="text-center max-w-md">
          <Sparkles className="w-16 h-16 mx-auto mb-4 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Generate Flashcards
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            AI-powered flashcards from your screen content. Test your knowledge and track your progress.
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
                Generate Flashcards
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
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Card {currentIndex + 1} of {flashcards.length}
        </span>
        <button
          onClick={() => {
            setFlashcards([]);
            setCurrentIndex(0);
          }}
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Generate New Cards
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
        />
      </div>

      {/* Flashcard */}
      <div className="relative h-80 perspective-1000 mb-6">
        <div
          className={`relative w-full h-full transition-transform duration-500 transform-style-preserve-3d cursor-pointer ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* Front */}
          <div className="absolute w-full h-full backface-hidden bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  currentCard.difficulty === 'easy'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : currentCard.difficulty === 'medium'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}
              >
                {currentCard.difficulty}
              </span>
              {currentCard.topic && (
                <span className="text-xs text-gray-500 dark:text-gray-400">{currentCard.topic}</span>
              )}
            </div>
            <div className="flex-1 flex items-center justify-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center">
                {currentCard.question}
              </h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Click to reveal answer
            </p>
          </div>

          {/* Back */}
          <div className="absolute w-full h-full backface-hidden bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-lg border border-blue-200 dark:border-blue-800 p-6 flex flex-col rotate-y-180">
            <div className="flex-1 flex items-center justify-center">
              <p className="text-lg text-gray-900 dark:text-white text-center">
                {currentCard.answer}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="flex gap-3">
          <button
            onClick={() => handleReview(false)}
            className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Don't Know
          </button>
          <button
            onClick={() => handleReview(true)}
            className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Know It
          </button>
        </div>

        <button
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
