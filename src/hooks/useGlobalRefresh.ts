import { useCallback, useEffect, useRef } from 'react';
import { refreshManager } from '@/lib/api/refreshManager';

import { logger } from "@/utils/logger";
export interface UseGlobalRefreshOptions {
  // Whether to refresh all screens or just high-priority ones
  refreshAll?: boolean;
  // Force refresh even if within rate limit
  force?: boolean;
}

export const useGlobalRefresh = () => {
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const refreshGlobal = useCallback(async (options: UseGlobalRefreshOptions = {}) => {
    const { refreshAll = false, force = false } = options;

    try {
      // Use the updated refreshManager API
      const refreshedScreens = await refreshManager.refreshAll({ force, refreshAll });

      return { success: true, refreshedScreens };
    } catch (error) {
      logger.error('[useGlobalRefresh] Error during global refresh:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, []);

  const debouncedRefresh = useCallback(async (options: UseGlobalRefreshOptions = {}, delay = 500) => {
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Increased delay to reduce unnecessary refreshes
    return new Promise<Awaited<ReturnType<typeof refreshGlobal>>>(resolve => {
      refreshTimeoutRef.current = setTimeout(async () => {
        const result = await refreshGlobal(options);
        resolve(result);
      }, delay);
    });
  }, [refreshGlobal]);

  const checkConnectivity = useCallback(async () => {
    return refreshManager.checkConnectivity();
  }, []);

  const getRefreshStats = useCallback(() => {
    return refreshManager.getRefreshStats();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    refreshGlobal,
    debouncedRefresh,
    checkConnectivity,
    getRefreshStats,
  };
};