import { useCallback, useEffect, useRef, useState } from "react";
import { refreshManager } from '@/lib/api/refreshManager';

import { logger } from "@/utils/logger";

export interface UseScreenRefreshOptions {
  screenName: string;
  refreshFn: () => Promise<void>;
  // Minimum interval between refreshes (ms)
  minInterval?: number;
  // Priority level for refresh operations
  priority?: "high" | "medium" | "low";
  // Whether to refresh when screen comes into focus
  refreshOnFocus?: boolean;
  // Whether to refresh on mount
  refreshOnMount?: boolean;
  // Custom focus refresh delay (ms)
  focusRefreshDelay?: number;
}

export const useScreenRefresh = (options: UseScreenRefreshOptions) => {
  const {
    screenName,
    refreshFn,
    minInterval = 30000,
    priority = "medium",
    refreshOnFocus = true,
    refreshOnMount = true,
    focusRefreshDelay = 200,
  } = options;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRegisteredRef = useRef(false);

  // Wrapper function to handle loading state and errors
  const wrappedRefreshFn = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setRefreshError(null);

      await refreshFn();

      setLastRefreshTime(Date.now());
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Refresh failed";
      logger.error(
        `[useScreenRefresh] Refresh error for ${screenName}:`,
        error,
      );
      setRefreshError(errorMessage);
      throw error; // Re-throw so refreshManager can handle it
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshFn, screenName]);

  // Register screen with refresh manager
  useEffect(() => {
    if (!isRegisteredRef.current) {
      refreshManager.registerScreen(screenName, wrappedRefreshFn, {
        minInterval,
        priority,
      });
      isRegisteredRef.current = true;
    }

    return () => {
      if (isRegisteredRef.current) {
        refreshManager.unregisterScreen(screenName);
        isRegisteredRef.current = false;
      }
    };
  }, [screenName, wrappedRefreshFn, minInterval, priority]);

  // Manual refresh function
  const manualRefresh = useCallback(
    async (force = false) => {
      try {
        const success = await refreshManager.refreshScreen(screenName, force);
        return { success, error: success ? null : refreshError };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Refresh failed";
        return { success: false, error: errorMessage };
      }
    },
    [screenName, refreshError],
  );

  const canRefresh = useCallback(() => {
    if (!lastRefreshTime) return true;
    const timeSinceLastRefresh = Date.now() - lastRefreshTime;
    return timeSinceLastRefresh >= minInterval;
  }, [lastRefreshTime, minInterval]);

  // Web-compatible focus effect
  useEffect(() => {
    if (!refreshOnFocus) return;

    const handleFocus = () => {
      // Clear any existing timeout
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }

      focusTimeoutRef.current = setTimeout(async () => {
        // Check if we can refresh (not already refreshing)
        // AND check if there's no global deletion in progress
        const isDeleting = (global as any).__isDeletingSeed || false;
        if (!isRefreshing && canRefresh() && !isDeleting) {
          await manualRefresh();
        }
      }, focusRefreshDelay);
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, [
    refreshOnFocus,
    focusRefreshDelay,
    screenName,
    manualRefresh,
    isRefreshing,
    canRefresh,
  ]);

  // Mount refresh
  useEffect(() => {
    if (refreshOnMount) {
      manualRefresh();
    }
  }, [refreshOnMount, manualRefresh]);

  // Utility functions
  const clearError = useCallback(() => {
    setRefreshError(null);
  }, []);

  const getTimeSinceLastRefresh = useCallback(() => {
    return lastRefreshTime > 0 ? Date.now() - lastRefreshTime : null;
  }, [lastRefreshTime]);

  return {
    // State
    isRefreshing,
    refreshError,
    lastRefreshTime,

    // Actions
    refresh: manualRefresh,
    clearError,

    // Utilities
    getTimeSinceLastRefresh,
    canRefresh,
  };
};