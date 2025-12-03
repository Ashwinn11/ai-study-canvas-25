import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { seedsService } from '@/lib/api/seedsService';
import { supabase } from '@/lib/api/supabaseWithTimeout';
import { logger } from "@/utils/logger";

export const useSeedDetail = (seedId: string, enabled: boolean = true) => {
  const queryClient = useQueryClient();
  const { data: seed, isLoading, error, refetch } = useQuery({
    queryKey: ['seed', seedId],
    queryFn: async () => {
      const { seed: fetchedSeed, error: seedError } = await seedsService.getSeed(seedId);

      if (seedError) {
        logger.error("Failed to load seed:", seedError);
        throw new Error(seedError);
      }

      if (!fetchedSeed) {
        throw new Error("Seed not found");
      }

      return fetchedSeed;
    },
    enabled: enabled && !!seedId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
    placeholderData: keepPreviousData,
  });

  // OPTIMIZED: Realtime subscription instead of polling
  // Automatically updates cache when seed status changes
  useEffect(() => {
    if (!enabled || !seedId || seed?.processing_status === 'completed') {
      return; // No need to listen once processing is complete
    }

    const channel = supabase
      .channel(`seed:${seedId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'seeds',
          filter: `id=eq.${seedId}`,
        },
        (payload: any) => {
          logger.info(`[Realtime] Seed ${seedId} updated:`, payload.new?.processing_status);
          // Update cache with new seed data
          queryClient.setQueryData(['seed', seedId], payload.new);
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          logger.debug(`[Realtime] Subscribed to seed ${seedId} updates`);
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('[Realtime] Subscription error:', err);
          // Attempt to refetch data on subscription error
          refetch();
        } else if (status === 'TIMED_OUT') {
          logger.warn('[Realtime] Subscription timed out, attempting manual refetch');
          refetch();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [seedId, enabled, seed?.processing_status, queryClient]);

  return {
    seed: seed || null,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
};
