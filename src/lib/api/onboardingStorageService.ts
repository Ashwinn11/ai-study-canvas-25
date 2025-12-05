import { getSupabaseClient } from '@/lib/supabase/client';

export interface OnboardingData {
  completed: boolean;
  completedAt?: string;
  currentGrade?: string;
  targetGrade?: string;
  targetExamDate?: string;
  dailyCardsGoal?: number;
  focusArea?: 'exam' | 'classes' | 'general' | 'professional';
}

/**
 * Onboarding Storage Service (Web)
 *
 * Handles LocalStorage for fast access + Supabase sync for multi-device support
 * Priority: Local first for speed, then sync to DB for persistence
 */
const ONBOARDING_STORAGE_KEY = 'masterly:onboarding';

export const onboardingStorageService = {
  /**
   * Get onboarding data - checks local storage first, then DB
   */
  async getOnboardingData(userId: string): Promise<OnboardingData | null> {
    try {
      // 1. Try local storage first (fast)
      const localData = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (localData) {
        try {
          const parsed = JSON.parse(localData) as Record<string, unknown>;
          // Verify it's for the current user
          if (parsed && parsed.userId === userId) {
            return {
              completed: (parsed.completed as boolean) || false,
              completedAt: (parsed.completedAt as string | undefined),
              currentGrade: (parsed.currentGrade as string | undefined),
              targetGrade: (parsed.targetGrade as string | undefined),
              targetExamDate: (parsed.targetExamDate as string | undefined),
              dailyCardsGoal: (parsed.dailyCardsGoal as number | undefined),
              focusArea: (parsed.focusArea as 'exam' | 'classes' | 'general' | 'professional' | undefined),
            };
          }
        } catch (parseError) {
          console.warn('[OnboardingStorage] Failed to parse local data:', parseError);
        }
      }

      // 2. Fetch from database (slower, but authoritative)
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'onboarding_completed, onboarding_completed_at, current_grade, target_grade, target_exam_date, daily_cards_goal, focus_area'
        )
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[OnboardingStorage] Error fetching from DB:', error);
        return null;
      }

      // Handle null case (new user without profile record)
      if (!data) {
        return {
          completed: false,
          dailyCardsGoal: 20,
        };
      }

      const dataRecord = data as Record<string, unknown>;
      const dbData: OnboardingData = {
        completed: (dataRecord.onboarding_completed as boolean) || false,
        completedAt: (dataRecord.onboarding_completed_at as string | undefined),
        currentGrade: (dataRecord.current_grade as string | undefined),
        targetGrade: (dataRecord.target_grade as string | undefined),
        targetExamDate: (dataRecord.target_exam_date as string | undefined),
        dailyCardsGoal: (dataRecord.daily_cards_goal as number) || 20,
        focusArea: (dataRecord.focus_area as 'exam' | 'classes' | 'general' | 'professional' | undefined),
      };

      // 3. Cache in local storage for next time
      await this.saveToLocalStorage(userId, dbData);

      return dbData;
    } catch (error) {
      console.error('[OnboardingStorage] Error in getOnboardingData:', error);
      return null;
    }
  },

  /**
   * Save onboarding data - saves to both local storage and DB
   */
  async saveOnboardingData(
    userId: string,
    data: OnboardingData
  ): Promise<boolean> {
    try {
      const completedAt = data.completed
        ? data.completedAt ?? new Date().toISOString()
        : null;

      const normalizedData: OnboardingData = {
        ...data,
        completed: data.completed,
        completedAt: completedAt ?? undefined,
      };

      // 1. Save to local storage immediately (optimistic)
      await this.saveToLocalStorage(userId, normalizedData);

      // 2. Sync to database
      const supabase = getSupabaseClient();

      const payload = {
        id: userId,
        onboarding_completed: data.completed,
        onboarding_completed_at: completedAt,
        current_grade: data.currentGrade ?? null,
        target_grade: data.targetGrade ?? null,
        target_exam_date: data.targetExamDate ?? null,
        daily_cards_goal: data.dailyCardsGoal ?? 20,
        focus_area: data.focusArea ?? null,
      };

      const { error } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('profiles') as any)
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error('[OnboardingStorage] Error saving to DB:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[OnboardingStorage] Error in saveOnboardingData:', error);
      return false;
    }
  },

  /**
   * Save to local storage only
   */
  async saveToLocalStorage(
    userId: string,
    data: OnboardingData
  ): Promise<void> {
    try {
      const storageData = {
        userId,
        ...data,
      };
      localStorage.setItem(
        ONBOARDING_STORAGE_KEY,
        JSON.stringify(storageData)
      );
    } catch (error) {
      console.error('[OnboardingStorage] Error saving to localStorage:', error);
    }
  },

  /**
   * Clear local onboarding cache (useful for logout)
   */
  async clearLocalCache(): Promise<void> {
    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch (error) {
      console.error('[OnboardingStorage] Error clearing cache:', error);
    }
  },

  /**
   * Check if onboarding is completed (fast check)
   */
  async isOnboardingCompleted(userId: string): Promise<boolean> {
    const data = await this.getOnboardingData(userId);
    return data?.completed || false;
  },
};
