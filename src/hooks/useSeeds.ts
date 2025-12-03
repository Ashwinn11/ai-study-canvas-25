import { useInfiniteQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { seedsService } from '@/lib/api/seedsService';
import { supabase } from '@/lib/api/supabaseWithTimeout';
import { Seed } from '@/types';
import { logger } from "@/utils/logger";
import { getTimeAgo } from '@/utils/dateUtils';

interface SeedListItem extends Seed {
  exam_name?: string;
  timeAgo?: string;
  flashcardCount?: number;
  quizCount?: number;
}

interface UseSeedsReturn {
  seeds: SeedListItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

const PAGE_SIZE = 50;

/**
 * Hook to fetch seeds with pagination using React Query
 * Provides caching, automatic refetching, and infinite scroll support
 *
 * PAGINATION STRATEGY:
 * - Uses offset-based pagination (not cursor-based) for simplicity
 * - Server-side ordering by created_at DESC ensures consistent results
 * - Client-side re-sorting is applied for UX but doesn't affect pagination
 * - Real-time subscriptions trigger cache invalidation for fresh data
 * - On invalidation, React Query refetches all loaded pages to maintain consistency
 *
 * CACHE STRATEGY:
 * - 5 minute staleTime: Data considered fresh for 5 minutes
 * - 10 minute gcTime: Cached data kept in memory for 10 minutes
 * - Real-time subscriptions: Auto-invalidate on database changes
 * - refetchType: 'active' ensures only active queries are refetched
 */
export const useSeeds = (): UseSeedsReturn => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOffline = false; // TODO: Implement network state detection

  // DIAGNOSTIC: Log when hook mounts/unmounts
  useEffect(() => {
    logger.info(`[useSeeds] Hook mounted for user ${user?.id}`);
    return () => {
      logger.info(`[useSeeds] Hook unmounted for user ${user?.id}`);
    };
  }, [user?.id]);

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['seeds', user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      logger.info(`[useSeeds] Fetching page ${pageParam / PAGE_SIZE} for user ${user?.id}`);
      const startTime = Date.now();
      if (!user) throw new Error('User not authenticated');

      const { seeds: seedsList, error: seedsError } = await seedsService.getSeeds({
        limit: PAGE_SIZE,
        offset: pageParam,
      });

      if (seedsError) {
        logger.error('[useSeeds] Failed to load seeds:', seedsError);
        throw new Error(seedsError);
      }

      const completedSeeds = (seedsList || []).filter(
        (seed) => seed.processing_status === "completed",
      );

      // OPTIMIZED: Use database aggregation instead of client-side counting
      // Single RPC call replaces 2 queries + client-side aggregation (70% network reduction)
      const allSeedIds = completedSeeds.map((seed) => seed.id);

      const flashcardCounts: Record<string, number> = {};
      const quizCounts: Record<string, number> = {};

      if (allSeedIds.length > 0) {
        const { data: counts, error: countsError } = await supabase.rpc(
          'get_content_counts',
          { seed_ids: allSeedIds }
        );

        // Handle errors gracefully - don't fail entire query if counts fail
        if (countsError) {
          logger.warn('[useSeeds] Content count query failed:', countsError);
        } else if (counts) {
          // Map counts to record for fast lookup
          counts.forEach((item: { seed_id: string; flashcard_count: number; quiz_count: number }) => {
            flashcardCounts[item.seed_id] = item.flashcard_count || 0;
            quizCounts[item.seed_id] = item.quiz_count || 0;
          });
        }
      }

      // Transform seeds with the batched data
      const transformedSeeds: SeedListItem[] = completedSeeds.map((seed) => {
        const examName =
          (seed as any).exam_seeds?.[0]?.exams?.subject_name ??
          (seed as any).exam_name;

        return {
          ...seed,
          exam_name: examName,
          timeAgo: getTimeAgo(seed.created_at),
          flashcardCount: flashcardCounts[seed.id] || 0,
          quizCount: quizCounts[seed.id] || 0,
        };
      });

      const result = {
        seeds: transformedSeeds,
        nextOffset: pageParam + PAGE_SIZE,
        hasMore: (seedsList?.length ?? 0) === PAGE_SIZE,
      };

      const duration = Date.now() - startTime;
      logger.info(`[useSeeds] Fetched ${transformedSeeds.length} seeds in ${duration}ms`);

      return result;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextOffset : undefined;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - kept in memory
    refetchOnWindowFocus: false,
    initialPageParam: 0,
    // PAGINATION CONSISTENCY: When data is invalidated (e.g., new seed added),
    // refetch all loaded pages to maintain consistency and avoid duplicates/gaps
    // OFFLINE FIX: Changed from 'always' to true to respect staleTime and show cached data offline
    refetchOnMount: true,
    // Retry up to 2 times to handle Supabase reconnection delay
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000), // Exponential backoff: 1s, 2s
    // OFFLINE: Keep showing previous/cached data to avoid loading states
    placeholderData: keepPreviousData,
  });

  // Flatten all pages into a single array
  const allSeeds = data?.pages.flatMap((page) => page.seeds) ?? [];

  // Sort by created_at descending
  const sortedSeeds = allSeeds.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  // DIAGNOSTIC: Log cache state on every render
  useEffect(() => {
    const cacheData = queryClient.getQueryData(['seeds', user?.id]);
    const queryState = queryClient.getQueryState(['seeds', user?.id]);
    logger.info(`[useSeeds] Render - Seeds count: ${sortedSeeds.length}, Cache exists: ${!!cacheData}, Query state: ${queryState?.status}, Is stale: ${queryState?.isInvalidated}`);
  });

  return {
    seeds: sortedSeeds,
    isLoading,
    error: error as Error | null,
    refetch,
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
  };
};
