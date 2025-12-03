import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { flashcardsService } from '@/lib/api/flashcardsService';
import { supabase } from '@/lib/api/supabaseWithTimeout';
import { Flashcard } from '@/types';
import { logger } from '@/utils/logger';

/**
 * Hook to fetch flashcards for a seed using React Query
 * Provides caching and automatic offline support
 */
export const useFlashcards = (seedId: string, enabled: boolean = true) => {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['flashcards', seedId, user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Ensure service has supabase client
      flashcardsService.setSupabase(supabase);

      const { data: flashcards, error: flashcardsError } =
        await flashcardsService.getFlashcardsBySeed(seedId, user.id);

      if (flashcardsError) {
        logger.error('[useFlashcards] Failed to load flashcards:', flashcardsError);
        throw new Error(flashcardsError);
      }

      return flashcards || [];
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
    flashcards: data || [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
};
