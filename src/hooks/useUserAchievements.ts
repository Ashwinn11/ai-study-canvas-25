import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { achievementEngine, type Achievement } from '@/lib/api/achievementEngine';
import { profileStatsService } from '@/lib/api/profileStatsService';
import { supabase } from '@/lib/api/supabaseWithTimeout';
import { logger } from "@/utils/logger";

/**
 * Hook to fetch user achievements and stats using React Query
 * Provides caching and automatic refetching for badges/achievements
 */
export const useUserAchievements = (userId?: string) => {
  const { user } = useAuth();
  const effectiveUserId = userId || user?.id;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['userAchievements', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) throw new Error('User ID not provided');

      // Initialize Supabase client for profileStatsService
      profileStatsService.setSupabase(supabase);

      // Fetch achievements
      const achievements = await achievementEngine.getUserAchievements(effectiveUserId);

      // Fetch user stats
      const { data: statsData } = await profileStatsService.getUserStats(effectiveUserId);

      if (!statsData) {
        logger.warn('[useUserAchievements] Unable to load stats');
      }

      return {
        achievements,
        stats: statsData,
      };
    },
    enabled: !!effectiveUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - kept in memory
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: 2, // Retry up to 2 times to handle Supabase reconnection delay
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000), // Exponential backoff: 1s, 2s
    placeholderData: keepPreviousData, // Show cached data while loading
  });

  return {
    achievements: data?.achievements || [],
    stats: data?.stats || null,
    isLoading,
    error: error as Error | null,
    refetch
  };
};
