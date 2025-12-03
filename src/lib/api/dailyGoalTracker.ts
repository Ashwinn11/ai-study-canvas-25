/**
 * Daily Goal Tracker Service
 *
 * Tracks whether a user has already celebrated completing their daily goal today.
 * Uses localStorage to persist the celebration state, keyed by date.
 * Automatically resets at midnight.
 *
 * MIDNIGHT PROTECTION: Stores the session date to prevent celebrating twice
 * if a user crosses midnight during their session.
 */

export class DailyGoalTrackerService {
  private readonly STORAGE_KEY = 'daily_goal_celebrations';
  private sessionDateRef = new Map<string, string>(); // userId -> sessionDate for preventing midnight boundary issues

  /**
   * Set the session date for a user (call at session start)
   * This prevents celebrating twice if crossing midnight
   */
  setSessionDate(userId: string, date: string): void {
    this.sessionDateRef.set(userId, date);
  }

  /**
   * Check if the user has already been celebrated for completing today's goal
   * Includes midnight boundary protection
   */
  async hasAlreadyCelebratedToday(userId: string): Promise<boolean> {
    try {
      const today = this.getTodayDateString();
      const celebrations = await this.getAllCelebrations();

      // Check celebration for today
      const todayKey = `${userId}_${today}`;
      const alreadyCelebratedToday = todayKey in celebrations;

      // MIDNIGHT PROTECTION: Also check if we already celebrated in THIS session
      // (session date is different from today, meaning we crossed midnight)
      const sessionDate = this.sessionDateRef.get(userId);
      if (sessionDate && sessionDate !== today) {
        const sessionKey = `${userId}_${sessionDate}`;
        const alreadyCelebratedInSession = sessionKey in celebrations;

        // If we celebrated in the previous date (session date), don't celebrate again
        if (alreadyCelebratedInSession) {
          return true;
        }
      }

      return alreadyCelebratedToday;
    } catch (error) {
      console.error('[DailyGoalTracker] Error checking celebration:', error);
      return false;
    }
  }

  /**
   * Mark that the user has been celebrated for today's goal
   * Uses the date when celebration actually occurred (not session start date)
   * This ensures correct behavior across midnight boundaries
   */
  async markGoalCelebratedToday(userId: string): Promise<void> {
    try {
      const today = this.getTodayDateString();
      const celebrations = await this.getAllCelebrations();
      const key = `${userId}_${today}`;
      celebrations[key] = Date.now();

      // Clean up old celebrations (older than 7 days)
      const cleanedCelebrations = this.cleanOldCelebrations(celebrations);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cleanedCelebrations));
    } catch (error) {
      console.error('[DailyGoalTracker] Error marking celebration:', error);
    }
  }

  /**
   * Reset celebration for a specific user (for testing or manual reset)
   */
  async resetCelebrationForUser(userId: string): Promise<void> {
    try {
      const today = this.getTodayDateString();
      const celebrations = await this.getAllCelebrations();
      const key = `${userId}_${today}`;
      delete celebrations[key];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(celebrations));
    } catch (error) {
      console.error('[DailyGoalTracker] Error resetting celebration:', error);
    }
  }

  /**
   * Get all celebrations from storage
   */
  private async getAllCelebrations(): Promise<Record<string, number>> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return {};
      return JSON.parse(stored) as Record<string, number>;
    } catch (error) {
      console.error(
        '[DailyGoalTracker] Error parsing celebrations:',
        error
      );
      return {};
    }
  }

  /**
   * Get today's date as a string (YYYY-MM-DD)
   */
  private getTodayDateString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Remove celebrations older than 7 days
   */
  private cleanOldCelebrations(
    celebrations: Record<string, number>
  ): Record<string, number> {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const cleaned: Record<string, number> = {};

    Object.entries(celebrations).forEach(([key, timestamp]) => {
      if (timestamp > sevenDaysAgo) {
        cleaned[key] = timestamp;
      }
    });

    return cleaned;
  }
}

export const dailyGoalTrackerService = new DailyGoalTrackerService();
