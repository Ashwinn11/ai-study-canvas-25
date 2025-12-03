import { useState, useEffect, useCallback } from 'react';
import { onboardingStorageService, OnboardingData } from '@/lib/api/onboardingStorageService';
import { analytics } from '@/lib/api/analytics';

import { logger } from "@/utils/logger";
// --- Lightweight cross-instance signal so App.tsx updates immediately ---
// Each module import shares this Set; all hook instances subscribe here.
// This avoids adding new deps or refactoring to Context for a single flag.
declare global {
  // eslint-disable-next-line no-var
  var __onboardingEmitter:
    | Set<(completed: boolean) => void>
    | undefined;
  // Flag to indicate onboarding just finished so Paywall can adjust behavior once
  var __onboardingJustCompleted: boolean | undefined;
}

interface UseOnboardingReturn {
  isOnboardingCompleted: boolean;
  onboardingData: OnboardingData | null;
  isLoading: boolean;
  saveOnboarding: (data: Partial<OnboardingData>) => Promise<boolean>;
  completeOnboarding: (data: Partial<OnboardingData>) => Promise<boolean>;
  refetchOnboarding: () => Promise<void>;
}

/**
 * useOnboarding Hook
 *
 * Manages onboarding state with:
 * - Direct profile data from useAuth (already loaded)
 * - Database sync for multi-device support
 * - Optimistic updates for smooth UX
 *
 * OPTIMIZATION: No longer makes separate database query for onboarding status.
 * Uses profile data already loaded by useAuth to avoid redundant queries.
 */
export const useOnboarding = (userId?: string): UseOnboardingReturn => {
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  if (!globalThis.__onboardingEmitter) {
    globalThis.__onboardingEmitter = new Set<(completed: boolean) => void>();
  }
  const onboardingEmitter: Set<(completed: boolean) => void> =
    globalThis.__onboardingEmitter!;

  // Fetch onboarding data on mount (from cache or DB)
  const fetchOnboardingData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // Get data from local storage cache (fast path)
      const data = await onboardingStorageService.getOnboardingData(userId);

      if (data) {
        setOnboardingData(data);
        setIsOnboardingCompleted(data.completed);
      } else {
        // No data means not completed
        setIsOnboardingCompleted(false);
        setOnboardingData(null);
      }
    } catch (error) {
      logger.error('[useOnboarding] Error fetching data:', error);
      setIsOnboardingCompleted(false);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchOnboardingData();
  }, [fetchOnboardingData]);

  // Subscribe to cross-instance completion events
  useEffect(() => {
    const listener = (completed: boolean) => {
      setIsOnboardingCompleted(completed);
      // Refresh local copy to keep data in sync (e.g., completedAt)
      if (completed && userId) {
        fetchOnboardingData();
      }
    };
    onboardingEmitter.add(listener);
    return () => {
      onboardingEmitter.delete(listener);
    };
  }, [fetchOnboardingData, onboardingEmitter, userId]);

  /**
   * Save partial onboarding data (for step-by-step progress)
   */
  const saveOnboarding = useCallback(async (data: Partial<OnboardingData>): Promise<boolean> => {
    if (!userId) return false;

    try {
      const updatedData: OnboardingData = {
        ...onboardingData,
        ...data,
        completed: false, // Not completed yet
      };

      // Optimistic update
      setOnboardingData(updatedData);

      // Save to storage + DB
      const { success } = await onboardingStorageService.saveOnboardingData(userId, updatedData);

      if (success) {
        analytics.trackEvent('onboarding_step_saved', {
          userId,
          step: Object.keys(data)[0],
        });
      }

      return success;
    } catch (error) {
      logger.error('[useOnboarding] Error saving onboarding:', error);
      return false;
    }
  }, [userId, onboardingData]);

  /**
   * Complete onboarding with final data
   * NOTE: Does NOT optimistically update state - waits for DB confirmation
   * Triggers profile refresh to sync onboarding_completed flag from DB
   */
  const completeOnboarding = useCallback(async (data: Partial<OnboardingData>): Promise<boolean> => {
    if (!userId) return false;

    try {
      const completedData: OnboardingData = {
        ...onboardingData,
        ...data,
        completed: true,
        completedAt: new Date().toISOString(),
      };

      // Save to storage + DB first (no optimistic update)
      const { success } = await onboardingStorageService.saveOnboardingData(userId, completedData);

      if (success) {
        // Only update state after DB confirms success
        setOnboardingData(completedData);
        setIsOnboardingCompleted(true);

        // Mark that onboarding just completed for downstream navigation logic
        globalThis.__onboardingJustCompleted = true;

        // Notify all hook instances (e.g., App.tsx) to update immediately
        onboardingEmitter.forEach((cb) => {
          try {
            cb(true);
          } catch (e) {
            // Best-effort notifications; keep going
            logger.error('[useOnboarding] Emitter listener error:', e);
          }
        });

        // Emit event to trigger profile refresh in listeners (OnboardingScreen)
        globalThis.__triggerProfileRefresh = true;

        analytics.trackEvent('onboarding_completed', {
          userId,
          currentGrade: completedData.currentGrade,
          targetGrade: completedData.targetGrade,
          dailyCardsGoal: completedData.dailyCardsGoal,
          hasExamDate: !!completedData.targetExamDate,
        });
      } else {
        logger.error('[useOnboarding] DB save failed - not updating state');
      }

      return success;
    } catch (error) {
      logger.error('[useOnboarding] Error completing onboarding:', error);
      return false;
    }
  }, [userId, onboardingData]);

  /**
   * Refetch onboarding data (useful after login or app resume)
   */
  const refetchOnboarding = useCallback(async () => {
    await fetchOnboardingData();
  }, [fetchOnboardingData]);

  return {
    isOnboardingCompleted,
    onboardingData,
    isLoading,
    saveOnboarding,
    completeOnboarding,
    refetchOnboarding,
  };
};
