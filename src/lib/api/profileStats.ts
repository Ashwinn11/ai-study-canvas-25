import { getSupabaseClient } from '@/lib/supabase/client';
import { gradeToNumber, numberToGrade } from '@/lib/utils/gradeUtils';

/**
 * Get local date in YYYY-MM-DD format
 */
function getLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface UserStats {
  // Legacy compatibility (main fields used by UI)
  totalCards: number; // Total cards reviewed ever
  masteredCards: number; // Mastered cards now
  studyMinutes: number; // Total study minutes
  currentStreak: number; // Current streak
  longestStreak: number; // Best streak ever
  totalSeeds: number; // Total seeds created
  totalSessions: number; // Total sessions completed
  weeklyGoal: number; // Weekly goal minutes
  dailyCardsGoal: number; // Daily cards goal
  accuracy: number; // Current accuracy %
  avgSessionScore: number; // Average session score
  weakAreas: string[]; // Weak areas
  cardsReviewedToday: number; // Cards reviewed today
  currentCommitmentStreak: number; // Current commitment streak
  totalAGrades: number; // Total A+/A grades earned
  averageGrade: string; // Average letter grade
}

class ProfileStatsService {
  /**
   * Calculate commitment streak (consecutive days meeting daily goal)
   * Matching iOS lines 442-521
   */
  private async getCommitmentStreak(userId: string, dailyCardsGoal: number): Promise<number> {
    try {
      const supabase = getSupabaseClient();

      const { data: sessions, error } = await supabase
        .from('learning_sessions')
        .select('completed_at, total_items, metadata')
        .eq('user_id', userId)
        .eq('metadata->>source', 'exam-review')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      if (!sessions || sessions.length === 0) return 0;

      // Group by local date string (YYYY-MM-DD)
      const cardsByDate = new Map<string, number>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessions.forEach((s: any) => {
        const date = new Date(s.completed_at);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        cardsByDate.set(
          dateKey,
          (cardsByDate.get(dateKey) || 0) + (s.total_items || 0)
        );
      });

      // Calculate streak using only days that met the goal
      const today = getLocalDate();
      const yesterday = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })();

      const sortedDates = Array.from(cardsByDate.keys()).sort((a, b) =>
        a > b ? -1 : a < b ? 1 : 0
      );

      const goalMetStartIndex = sortedDates.findIndex(
        (date) => (cardsByDate.get(date) || 0) >= dailyCardsGoal
      );
      if (goalMetStartIndex === -1) {
        return 0;
      }

      const anchorDate = sortedDates[goalMetStartIndex];
      if (anchorDate !== today && anchorDate !== yesterday) {
        return 0;
      }

      const toDate = (dateString: string) => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
      };

      let streak = 0;
      let lastCountedDate = toDate(anchorDate);

      for (let i = goalMetStartIndex; i < sortedDates.length; i++) {
        const currentDateString = sortedDates[i];
        const cardsOnDate = cardsByDate.get(currentDateString) || 0;

        if (cardsOnDate < dailyCardsGoal) {
          break;
        }

        const currentDate = toDate(currentDateString);

        if (streak > 0) {
          const dayDiff = Math.round(
            (lastCountedDate.getTime() - currentDate.getTime()) /
            (1000 * 3600 * 24)
          );
          if (dayDiff !== 1) {
            break;
          }
        }

        streak++;
        lastCountedDate = currentDate;
      }

      return streak;
    } catch (error) {
      console.error('[ProfileStatsService] Error calculating commitment streak:', error);
      return 0;
    }
  }

  /**
   * Get comprehensive user statistics
   */
  async getUserStats(userId: string): Promise<{ data?: UserStats; error?: string }> {
    try {
      const supabase = getSupabaseClient();

      // Get local midnight for today (matching iOS getLocalMidnight)
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      // Run all queries in parallel for optimal performance
      const [
        flashcardsResult,
        quizQuestionsResult,
        seedsResult,
        historicalResult,
        userPrefsResult,
        todayExamSessionsResult,
        allSessionsResult,
        userDataResult,
        gradeResult,
        aGradeResult,
      ] = await Promise.all([
        // Get all flashcards for mastered count
        supabase
          .from('flashcards')
          .select('id, repetitions, easiness_factor')
          .eq('user_id', userId),

        // Get all quiz questions for mastered count
        supabase
          .from('quiz_questions')
          .select('id, repetitions, easiness_factor')
          .eq('user_id', userId),

        // Get total seeds count (including deleted)
        supabase
          .from('seeds')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),

        // Get streak from user_stats_historical table (matching iOS lines 121-125)
        supabase
          .from('user_stats_historical')
          .select('current_streak, longest_streak, total_sessions, total_seeds_created, total_cards_reviewed')
          .eq('user_id', userId)
          .maybeSingle(),

        // Get user preferences (daily_cards_goal)
        supabase
          .from('users')
          .select('daily_cards_goal')
          .eq('id', userId)
          .single(),

        // Get today's EXAM-REVIEW sessions for daily goal (matching iOS lines 245-275)
        supabase
          .from('learning_sessions')
          .select('total_items, metadata')
          .eq('user_id', userId)
          .eq('metadata->>source', 'exam-review')
          .gte('completed_at', startOfToday.toISOString())
          .not('completed_at', 'is', null),

        // Get ALL sessions (both sources) for accuracy calculation (matching iOS)
        supabase
          .from('learning_sessions')
          .select('score, correct_items, total_items')
          .eq('user_id', userId)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(20), // Last 20 sessions for accuracy

        // Get user's current_grade from onboarding (for average grade calculation)
        supabase
          .from('users')
          .select('current_grade')
          .eq('id', userId)
          .single(),

        // Get ALL exam reports for average grade (matching iOS lines 404-408)
        supabase
          .from('exam_reports')
          .select('letter_grade')
          .eq('user_id', userId)
          .not('letter_grade', 'is', null),

        // Get A+ grades count (matching iOS lines 367-380 - only A+, not A)
        supabase
          .from('exam_reports')
          .select('letter_grade', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('letter_grade', 'A+'),
      ]);

      // Process flashcards
      const flashcards = flashcardsResult.data || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const masteredFlashcards = flashcards.filter((fc: any) =>
        fc.repetitions !== null && fc.repetitions >= 3 && fc.easiness_factor !== null && fc.easiness_factor >= 2.5
      );

      // Process quiz questions
      const quizQuestions = quizQuestionsResult.data || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const masteredQuizzes = quizQuestions.filter((qq: any) =>
        qq.repetitions !== null && qq.repetitions >= 3 && qq.easiness_factor !== null && qq.easiness_factor >= 2.5
      );

      const masteredCards = masteredFlashcards.length + masteredQuizzes.length;

      // Calculate accuracy from ALL learning sessions (matching iOS lines 283-307)
      const allSessions = allSessionsResult.data || [];
      let accuracy = 0;
      if (allSessions.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const totalItems = allSessions.reduce((sum: number, s: any) => sum + (s.total_items || 0), 0);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const correctItems = allSessions.reduce((sum: number, s: any) => sum + (s.correct_items || 0), 0);
        accuracy = totalItems > 0 ? Math.round((correctItems / totalItems) * 100) : 0;
      }

      // Read from user_stats_historical table (matching iOS lines 121-125)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const historical: any = historicalResult.data;
      const longestStreak = historical?.longest_streak || 0;
      const totalSessions = historical?.total_sessions || 0;
      const totalCardsReviewed = historical?.total_cards_reviewed || 0; // Total cards reviewed EVER (matching iOS line 217)

      // Get user's actual dailyCardsGoal preference (matching iOS lines 169-177)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dailyCardsGoal = (userPrefsResult.data as any)?.daily_cards_goal || 20;

      // Calculate commitment streak from learning_sessions (matching iOS lines 442-521)
      const calculatedStreak = await this.getCommitmentStreak(userId, dailyCardsGoal);

      // Use MAX of historical and calculated streak (matching iOS lines 179-182)
      // This ensures real-time accuracy even if historical table not updated yet
      const currentStreak = Math.max(
        historical?.current_streak || 0,
        calculatedStreak
      );

      // Process today's EXAM-REVIEW sessions for cards reviewed today (matching iOS lines 245-275)
      const todayExamSessions = todayExamSessionsResult.data || [];

      const cardsReviewedToday = todayExamSessions.reduce(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (sum: number, session: any) => sum + (session.total_items || 0),
        0
      );

      // Calculate average grade (matching iOS lines 390-437)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentGrade = (userDataResult.data as any)?.current_grade || 'B';
      const examReports = gradeResult.data || [];

      let averageGrade = '';
      if (examReports.length === 0) {
        // CASE 1: No exam reports yet - use currentGrade from onboarding
        averageGrade = currentGrade || '';
      } else {
        // CASE 2: Has exam reports - calculate average including currentGrade
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let allGrades = examReports.map((r: any) => r.letter_grade);

        // Include currentGrade in the average if it exists (as baseline)
        if (currentGrade) {
          allGrades = [currentGrade, ...allGrades];
        }

        // Calculate average
        const avgNumeric = allGrades.reduce(
          (sum: number, grade: string) => sum + gradeToNumber(grade),
          0
        ) / allGrades.length;

        averageGrade = numberToGrade(avgNumeric);
      }

      // Get A grades count
      const totalAGrades = aGradeResult.count || 0;

      // Get total seeds from user_stats_historical (matching iOS) or fall back to seeds count
      const totalSeeds = historical?.total_seeds_created || seedsResult.count || 0;

      const stats: UserStats = {
        totalCards: totalCardsReviewed,
        masteredCards,
        studyMinutes: 0, // Not tracking time yet
        currentStreak,
        longestStreak,
        totalSeeds,
        totalSessions,
        weeklyGoal: 0, // Not implemented yet
        dailyCardsGoal, // User's actual goal preference
        accuracy,
        avgSessionScore: accuracy, // Use accuracy as session score
        weakAreas: [], // Not implemented yet
        cardsReviewedToday,
        currentCommitmentStreak: currentStreak,
        totalAGrades,
        averageGrade,
      };

      return { data: stats };
    } catch (err) {
      console.error('[ProfileStatsService] Error getting user stats:', err);
      return {
        error: err instanceof Error ? err.message : 'Failed to get user stats',
      };
    }
  }
}

export const profileStatsService = new ProfileStatsService();
