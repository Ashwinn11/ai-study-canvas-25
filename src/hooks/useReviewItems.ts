import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { spacedRepetitionService } from '@/lib/api/spacedRepetitionService';
import { supabase } from '@/lib/api/supabaseWithTimeout';
import { QuizQuestion, Flashcard } from '@/types';
import { logger } from '@/utils/logger';

export type ReviewItem = {
  id: string;
  type: 'quiz' | 'flashcard';
  seed_id: string;
  seed_title: string;
  content: QuizQuestion | Flashcard;
  next_due_date?: string;
  interval?: number;
  repetitions?: number;
  easiness_factor?: number;
};

/**
 * Hook to fetch review items (flashcards + quiz questions) for an exam using React Query
 * Provides caching and automatic offline support for review sessions
 */
export const useReviewItems = (examId: string, enabled: boolean = true) => {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['reviewItems', examId, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Ensure service has supabase client
      spacedRepetitionService.setSupabase(supabase);

      const { flashcards, quizQuestions, error: fetchError } =
        await spacedRepetitionService.getExamReviewItems(user.id, examId);

      if (fetchError) {
        logger.error('[useReviewItems] Failed to load review items:', fetchError);
        throw new Error(fetchError);
      }

      // Convert to unified ReviewItem format
      const quizItems: ReviewItem[] = quizQuestions.map((qq: any) => ({
        id: qq.id,
        type: 'quiz' as const,
        seed_id: qq.seed_id,
        seed_title: 'Quiz Question',
        content: qq,
        next_due_date: qq.next_due_date,
        interval: qq.interval,
        repetitions: qq.repetitions,
        easiness_factor: qq.easiness_factor,
      }));

      const flashcardItems: ReviewItem[] = flashcards.map((fc: any) => ({
        id: fc.id,
        type: 'flashcard' as const,
        seed_id: fc.seed_id,
        seed_title: fc.seeds?.title || 'Flashcard',
        content: fc,
        next_due_date: fc.next_due_date,
        interval: fc.interval,
        repetitions: fc.repetitions,
        easiness_factor: fc.easiness_factor,
      }));

      const allReviewItems = [...quizItems, ...flashcardItems];

      // Shuffle items for variety
      const shuffled = allReviewItems.sort(() => Math.random() - 0.5);

      return {
        reviewItems: shuffled,
        totalQuizzes: quizQuestions.length,
        totalFlashcards: flashcards.length,
      };
    },
    enabled: enabled && !!user && !!examId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2, // Retry up to 2 times to handle Supabase reconnection delay
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000), // Exponential backoff: 1s, 2s
    placeholderData: keepPreviousData, // Show cached data while loading
  });

  return {
    reviewItems: data?.reviewItems || [],
    totalQuizzes: data?.totalQuizzes || 0,
    totalFlashcards: data?.totalFlashcards || 0,
    isLoading,
    error: error as Error | null,
    refetch,
  };
};
