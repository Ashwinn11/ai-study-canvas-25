import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { examsService } from '@/lib/api/examsService';
import { ExamWithSeeds } from '@/types';
import { logger } from "@/utils/logger";

interface UseExamsReturn {
  exams: ExamWithSeeds[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch exams with seed counts using React Query
 * Provides caching and automatic refetching
 */
export const useExams = (): UseExamsReturn => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['exams', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { exams: examsList, error: examsError } =
        await examsService.getExamsWithSeedCounts();

      if (examsError) {
        logger.error('[useExams] Failed to load exams:', examsError);
        throw new Error(examsError);
      }

      const transformedExams: ExamWithSeeds[] = (examsList || []).map((exam) => ({
        ...exam,
        seeds: [],
        seedCount: exam.seedCount,
      }));

      return transformedExams;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - kept in memory
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: 2, // Retry up to 2 times to handle Supabase reconnection delay
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000), // Exponential backoff: 1s, 2s
    placeholderData: keepPreviousData, // Show cached data while loading
  });

  return {
    exams: data || [],
    isLoading,
    error: error as Error | null,
    refetch
  };
};
