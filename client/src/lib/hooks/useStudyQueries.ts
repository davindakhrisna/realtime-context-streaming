import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  inquire,
  generateFlashcards,
  generateStudyMaterials,
  getSessionStats,
  getSessions,
  reviewFlashcard,
  type InquiryRequest,
  type FlashcardGenerateRequest,
} from '../api/client';

/**
 * Hook for sending inquiries to the AI assistant
 */
export function useInquire() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: InquiryRequest) => inquire(request),
    onSuccess: () => {
      // Invalidate any relevant queries
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
    },
  });
}

/**
 * Hook for generating flashcards
 */
export function useGenerateFlashcards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: FlashcardGenerateRequest) => generateFlashcards(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

/**
 * Hook for generating study materials
 */
export function useGenerateStudyMaterials() {
  return useMutation({
    mutationFn: (request: { session_id?: string | null; time_range?: { start: string; end: string } }) =>
      generateStudyMaterials(request),
  });
}

/**
 * Hook for getting session statistics
 */
export function useSessionStats(sessionId?: string) {
  return useQuery({
    queryKey: ['stats', sessionId],
    queryFn: () => getSessionStats(sessionId),
    enabled: true,
  });
}

/**
 * Hook for getting all sessions
 */
export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: getSessions,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Hook for reviewing flashcards
 */
export function useReviewFlashcard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ flashcardId, wasCorrect }: { flashcardId: string; wasCorrect: boolean }) =>
      reviewFlashcard(flashcardId, wasCorrect),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
