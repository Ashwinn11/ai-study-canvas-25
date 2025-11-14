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
   * Get comprehensive user statistics
   */
  async getUserStats(userId: string): Promise<{ data?: UserStats; error?: string }> {
    try {
      const supabase = getSupabaseClient();
      const today = getLocalDate();

      // Run all queries in parallel for optimal performance
      const [
        flashcardsResult,
        quizQuestionsResult,
        seedsResult,
        historicalResult,
        todayExamSessionsResult,
        allSessionsResult,
        userDataResult,
        gradeResult,
        aGradeResult,
      ] = await Promise.all([
        // Get all flashcards for total and mastered count
        supabase
          .from('flashcards')
          .select('id, repetitions, easiness_factor')
          .eq('user_id', userId),

        // Get all quiz questions for total and mastered count
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
          .select('current_streak, longest_streak, total_sessions, total_seeds_created')
          .eq('user_id', userId)
          .maybeSingle(),

        // Get today's EXAM-REVIEW sessions for daily goal (matching iOS)
        supabase
          .from('learning_sessions')
          .select('total_items, metadata')
          .eq('user_id', userId)
          .eq('metadata->>source', 'exam-review')
          .gte('completed_at', `${today}T00:00:00`)
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

        // Get A+/A grades count
        supabase
          .from('exam_reports')
          .select('letter_grade', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('letter_grade', ['A+', 'A']),
      ]);

      // Process flashcards
      const flashcards = flashcardsResult.data || [];
      const masteredFlashcards = flashcards.filter((fc: any) =>
        fc.repetitions !== null && fc.repetitions >= 3 && fc.easiness_factor !== null && fc.easiness_factor >= 2.5
      );

      // Process quiz questions
      const quizQuestions = quizQuestionsResult.data || [];
      const masteredQuizzes = quizQuestions.filter((qq: any) =>
        qq.repetitions !== null && qq.repetitions >= 3 && qq.easiness_factor !== null && qq.easiness_factor >= 2.5
      );

      const totalCards = flashcards.length + quizQuestions.length;
      const masteredCards = masteredFlashcards.length + masteredQuizzes.length;

      // Calculate accuracy from ALL learning sessions (matching iOS lines 283-307)
      const allSessions = allSessionsResult.data || [];
      let accuracy = 0;
      if (allSessions.length > 0) {
        const totalItems = allSessions.reduce((sum: number, s: any) => sum + (s.total_items || 0), 0);
        const correctItems = allSessions.reduce((sum: number, s: any) => sum + (s.correct_items || 0), 0);
        accuracy = totalItems > 0 ? Math.round((correctItems / totalItems) * 100) : 0;
      }

      // Read streak from user_stats_historical table (matching iOS lines 179-182)
      const historical = historicalResult.data;
      const currentStreak = historical?.current_streak || 0;
      const longestStreak = historical?.longest_streak || 0;
      const totalSessions = historical?.total_sessions || 0;

      // Process today's EXAM-REVIEW sessions for cards reviewed today (matching iOS lines 245-275)
      const todayExamSessions = todayExamSessionsResult.data || [];
      const cardsReviewedToday = todayExamSessions.reduce(
        (sum: number, session: any) => sum + (session.total_items || 0),
        0
      );

      // Calculate average grade (matching iOS lines 390-437)
      const currentGrade = userDataResult.data?.current_grade;
      const examReports = gradeResult.data || [];

      let averageGrade = '';
      if (examReports.length === 0) {
        // CASE 1: No exam reports yet - use currentGrade from onboarding
        averageGrade = currentGrade || '';
      } else {
        // CASE 2: Has exam reports - calculate average including currentGrade
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
        totalCards,
        masteredCards,
        studyMinutes: 0, // Not tracking time yet
        currentStreak,
        longestStreak,
        totalSeeds,
        totalSessions,
        weeklyGoal: 0, // Not implemented yet
        dailyCardsGoal: 20, // Default goal
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
