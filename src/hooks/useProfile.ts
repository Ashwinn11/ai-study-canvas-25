import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/api/supabaseWithTimeout';
import { logger } from '@/utils/logger';

interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Hook to fetch user profile using React Query
 * Provides caching and automatic offline support
 * This integrates profile data with React Query's persistence layer
 */
export const useProfile = (userId?: string) => {
  const { user } = useAuth();
  const effectiveUserId = userId || user?.id;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['profile', effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) throw new Error('User ID not provided');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', effectiveUserId)
        .maybeSingle();

      if (profileError) {
        // Treat "no rows" as a normal case in dev; profile may not be created yet
        const isNoRows = (profileError as any)?.details?.includes('0 rows') ||
          (profileError as any)?.code === 'PGRST116';
        if (!isNoRows) {
          logger.error('[useProfile] Failed to load profile:', profileError);
          throw new Error(profileError.message);
        }
        return null;
      }

      return profile;
    },
    enabled: !!effectiveUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - kept in memory
    refetchOnWindowFocus: false,
    retry: 2, // Retry up to 2 times to handle Supabase reconnection delay
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000), // Exponential backoff: 1s, 2s
    placeholderData: keepPreviousData, // Show cached data while loading
  });

  return {
    profile: data || null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
};
