import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { quizService } from '@/lib/api/quizService';
import { supabase } from '@/lib/api/supabaseWithTimeout';
import { QuizQuestion } from '@/types';
import { logger } from '@/utils/logger';

/**
 * Hook to fetch quiz questions for a seed using React Query
 * Provides caching and automatic offline support
 */
export const useQuizQuestions = (seedId: string, enabled: boolean = true) => {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['quizQuestions', seedId, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Ensure service has supabase client
      quizService.setSupabase(supabase);

      const { data: quizQuestions, error: quizError } =
        await quizService.getQuizQuestionsBySeed(seedId, user.id);

      if (quizError) {
        logger.error('[useQuizQuestions] Failed to load quiz questions:', quizError);
        throw new Error(quizError);
      }

      return quizQuestions || [];
    },
    enabled: enabled && !!user && !!seedId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2, // Retry up to 2 times to handle Supabase reconnection delay
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000), // Exponential backoff: 1s, 2s
    placeholderData: keepPreviousData, // Show cached data while loading
  });

  return {
    quizQuestions: data || [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
};
