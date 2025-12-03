/**
 * Streak Service
 * Handles streak calculation and updates based on daily goal completion
 * Streak only increments when user meets their daily card goal
 */

import { getSupabaseClient } from '@/lib/supabase/client';

interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  justBrokeStreak: boolean;
  newRecord: boolean;
}

class StreakService {
  /**
   * Update streak after session completion
   * Checks if user met daily goal today and updates streak accordingly
   */
  async updateStreakAfterSession(
    userId: string,
    dailyCardsGoal: number
  ): Promise<StreakResult> {
    const today = this.getLocalDateString();
    const yesterday = this.getYesterdayDateString();

    // Check if user met daily goal TODAY
    const metGoalToday = await this.metDailyGoalOn(userId, today, dailyCardsGoal);

    console.info('[StreakService] updateStreakAfterSession:', {
      userId,
      today,
      yesterday,
      dailyCardsGoal,
      metGoalToday,
    });

    const supabase = getSupabaseClient();

    // Get current streak from DB
    const { data: stats, error } = await supabase
      .from('user_stats_historical')
      .select('current_streak, longest_streak, last_study_date')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[StreakService] Error fetching streak data:', error);
      return {
        currentStreak: 0,
        longestStreak: 0,
        justBrokeStreak: false,
        newRecord: false,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statsData = stats as any;
    let currentStreak = statsData?.current_streak || 0;
    let longestStreak = statsData?.longest_streak || 0;
    const lastStudyDate = statsData?.last_study_date;

    let justBrokeStreak = false;
    let newRecord = false;

    console.info('[StreakService] Current state from DB:', {
      currentStreak,
      longestStreak,
      lastStudyDate,
    });

    // Streak logic:
    // - If met goal today AND (no last study OR last study was yesterday) → increment
    // - If met goal today BUT last study was 2+ days ago → reset to 1 (broke streak)
    // - If didn't meet goal today → keep current (will reset at midnight if gap detected)

    if (metGoalToday) {
      if (!lastStudyDate) {
        // First time studying
        currentStreak = 1;
        console.info(
          '[StreakService] First time studying, starting streak at 1'
        );
      } else if (lastStudyDate === today) {
        // Already counted today, no change
        console.info(
          '[StreakService] Already studied today, keeping streak at:',
          currentStreak
        );
      } else if (lastStudyDate === yesterday) {
        // Continue streak
        currentStreak += 1;
        console.info(
          '[StreakService] Continuing streak from yesterday, incrementing to:',
          currentStreak
        );
      } else {
        // SAFETY CHECK: Validate date comparison is working
        const lastDate = new Date(lastStudyDate as string);
        const yesterdayDate = new Date(yesterday);
        const daysDiff = Math.floor(
          (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        console.info('[StreakService] Date gap detected:', {
          lastStudyDate,
          today,
          yesterday,
          daysDiff,
          lastDateObj: lastDate.toISOString(),
        });

        // Gap detected (last study was 2+ days ago), reset to 1
        justBrokeStreak = currentStreak > 0;
        const oldStreak = currentStreak;
        currentStreak = 1;

        console.info(
          '[StreakService] Streak broken - reset from',
          oldStreak,
          'to 1 (gap of',
          daysDiff,
          'days)'
        );
      }

      // Update longest streak if new record
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        newRecord = true;
      }

      console.info('[StreakService] About to update with:', {
        currentStreak,
        longestStreak,
        lastStudyDate,
        newLastStudyDate: today,
      });

      // Update DB
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase
        .from('user_stats_historical') as any)
        .update({
          current_streak: currentStreak,
          longest_streak: longestStreak,
          last_study_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('[StreakService] Error updating streak:', updateError);
      } else {
        console.info(
          '[StreakService] Successfully updated streak to:',
          currentStreak
        );
      }
    } else {
      console.info(
        '[StreakService] Goal not met today, skipping streak update'
      );
    }

    console.info('[StreakService] Returning:', {
      currentStreak,
      longestStreak,
      justBrokeStreak,
      newRecord,
    });

    return { currentStreak, longestStreak, justBrokeStreak, newRecord };
  }

  /**
   * Check if user has studied (met daily goal) on a specific date
   */
  private async metDailyGoalOn(
    userId: string,
    dateString: string,
    goal: number
  ): Promise<boolean> {
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

      console.info('[StreakService] metDailyGoalOn checking:', {
        dateString,
        goal,
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString(),
      });

      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('learning_sessions')
        .select('total_items, metadata')
        .eq('user_id', userId)
        .eq('metadata->>source', 'exam-review')
        .gte('completed_at', startOfDay.toISOString())
        .lte('completed_at', endOfDay.toISOString())
        .not('completed_at', 'is', null);

      if (error) {
        console.error('[StreakService] Error fetching sessions:', error);
        return false;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalCards =
        data?.reduce((sum, session) => sum + (((session as any).total_items as number) || 0), 0) ||
        0;
      const metGoal = totalCards >= goal;

      console.info('[StreakService] metDailyGoalOn result:', {
        sessionCount: data?.length,
        totalCards,
        goal,
        metGoal,
      });

      return metGoal;
    } catch (err) {
      console.error('[StreakService] Error checking daily goal:', err);
      return false;
    }
  }

  /**
   * Get current streak for display
   */
  async getCurrentStreak(userId: string): Promise<number> {
    try {
      const supabase = getSupabaseClient();

      const { data } = await supabase
        .from('user_stats_historical')
        .select('current_streak')
        .eq('user_id', userId)
        .maybeSingle();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((data as any)?.current_streak as number) || 0;
    } catch (err) {
      console.error('[StreakService] Error getting current streak:', err);
      return 0;
    }
  }

  /**
   * Get longest streak for display
   */
  async getLongestStreak(userId: string): Promise<number> {
    try {
      const supabase = getSupabaseClient();

      const { data } = await supabase
        .from('user_stats_historical')
        .select('longest_streak')
        .eq('user_id', userId)
        .maybeSingle();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((data as any)?.longest_streak as number) || 0;
    } catch (err) {
      console.error('[StreakService] Error getting longest streak:', err);
      return 0;
    }
  }

  /**
   * Helper: Get today's date as YYYY-MM-DD in user's local timezone
   */
  private getLocalDateString(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Helper: Get yesterday's date as YYYY-MM-DD in user's local timezone
   */
  private getYesterdayDateString(): string {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export const streakService = new StreakService();
