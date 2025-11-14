import { getSupabaseClient } from '@/lib/supabase/client';
import { Flashcard, QuizQuestion } from '@/lib/supabase/types';

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

export interface ReviewItem {
  id: string;
  type: 'quiz' | 'flashcard';
  seed_id: string;
  seed_title: string;
  content: QuizQuestion | Flashcard;
  next_due_date?: string | null;
  interval?: number | null;
  repetitions?: number | null;
  easiness_factor?: number | null;
}

export interface ExamReviewStats {
  exam_id: string;
  total_items: number;
  due_today: number;
  overdue: number;
  available_items: number;
  average_grade?: string | null;
  next_due_date?: string | null;
}

class SpacedRepetitionService {
  /**
   * Get review items for an exam
   * Matches iOS spacedRepetitionService.getExamReviewItems
   */
  async getExamReviewItems(
    userId: string,
    examId: string,
    practiceMode: boolean = false
  ): Promise<{
    flashcards: Flashcard[];
    quizQuestions: QuizQuestion[];
    error?: string;
  }> {
    try {
      const supabase = getSupabaseClient();
      const today = getLocalDate();
      const dueDateFilter = `${today} 23:59:59`; // Include full day

      // Get cards already reviewed in ANY exam today to prevent duplicates
      const reviewedCardIds = new Set<string>();
      if (!practiceMode) {
        const { data: todayReviews, error: reviewError } = await supabase
          .from('learning_sessions')
          .select('metadata')
          .eq('user_id', userId)
          .eq('metadata->>source', 'exam-review')
          .gte('completed_at', `${today}T00:00:00`);

        if (!reviewError && todayReviews) {
          // Extract all card IDs from today's exam reviews
          todayReviews.forEach((session: any) => {
            const metadata = session.metadata;
            if (metadata?.reviewed_card_ids && Array.isArray(metadata.reviewed_card_ids)) {
              metadata.reviewed_card_ids.forEach((id: string) => {
                reviewedCardIds.add(id);
              });
            }
          });
        }
      }

      // Build base query for flashcards
      // Include unstudied items (interval can be null) - they'll be initialized on first review
      let flashcardsQuery = supabase
        .from('flashcards')
        .select(`
          id, seed_id, question, answer, difficulty,
          next_due_date, interval, repetitions, easiness_factor,
          streak, lapses, last_reviewed, quality_rating,
          created_at, updated_at,
          seeds!inner (id, title, exam_seeds!inner (exam_id))
        `)
        .eq('user_id', userId)
        .eq('seeds.exam_seeds.exam_id', examId);

      // Build base query for quiz questions
      // Include unstudied items (interval can be null) - they'll be initialized on first review
      let quizQuery = supabase
        .from('quiz_questions')
        .select(`
          id, seed_id, question, options, correct_answer, explanation,
          next_due_date, interval, repetitions, easiness_factor,
          streak, lapses, last_reviewed, quality_rating,
          created_at, updated_at,
          seeds!inner (id, title, exam_seeds!inner (exam_id))
        `)
        .eq('user_id', userId)
        .eq('seeds.exam_seeds.exam_id', examId);

      // Only filter by due date if not in practice mode
      if (!practiceMode) {
        // Include items where next_due_date <= today OR next_due_date is null (unstudied)
        flashcardsQuery = flashcardsQuery.or(`next_due_date.lte.${dueDateFilter},next_due_date.is.null`);
        quizQuery = quizQuery.or(`next_due_date.lte.${dueDateFilter},next_due_date.is.null`);
      }

      // Execute queries
      const { data: flashcards, error: flashcardsError } = await flashcardsQuery.order('next_due_date', {
        ascending: true,
      });
      const { data: quizQuestions, error: quizError } = await quizQuery.order('next_due_date', {
        ascending: true,
      });

      if (flashcardsError || quizError) {
        const error = flashcardsError || quizError;
        console.error('[SpacedRepetitionService] Error getting exam review items:', error);
        return {
          flashcards: [],
          quizQuestions: [],
          error: error?.message,
        };
      }

      // Filter out cards already reviewed today in any exam
      const filteredFlashcards = (flashcards || []).filter((fc: any) => !reviewedCardIds.has(fc.id));
      const filteredQuizQuestions = (quizQuestions || []).filter((qq: any) => !reviewedCardIds.has(qq.id));

      return {
        flashcards: filteredFlashcards as Flashcard[],
        quizQuestions: filteredQuizQuestions as QuizQuestion[],
      };
    } catch (err) {
      console.error('[SpacedRepetitionService] Error getting exam review items:', err);
      return {
        flashcards: [],
        quizQuestions: [],
        error: err instanceof Error ? err.message : 'Failed to get exam review items',
      };
    }
  }

  /**
   * Get review statistics for an exam
   */
  async getExamReviewStats(userId: string, examId: string): Promise<ExamReviewStats | null> {
    try {
      const supabase = getSupabaseClient();
      const today = getLocalDate();

      // Get all seeds in the exam
      const { data: examSeeds, error: examSeedsError } = await supabase
        .from('exam_seeds')
        .select('seed_id')
        .eq('exam_id', examId);

      if (examSeedsError || !examSeeds || examSeeds.length === 0) {
        return null;
      }

      const seedIds = examSeeds.map((es) => es.seed_id);

      // Get all flashcards and quiz questions for these seeds (only studied items with interval set)
      const [flashcardResult, quizResult] = await Promise.all([
        supabase
          .from('flashcards')
          .select('next_due_date')
          .eq('user_id', userId)
          .in('seed_id', seedIds)
          .not('interval', 'is', null),
        supabase
          .from('quiz_questions')
          .select('next_due_date')
          .eq('user_id', userId)
          .in('seed_id', seedIds)
          .not('interval', 'is', null),
      ]);

      const flashcards = flashcardResult.data || [];
      const quizQuestions = quizResult.data || [];

      const allItems = [...flashcards, ...quizQuestions];
      const totalItems = allItems.length;

      if (totalItems === 0) {
        return {
          exam_id: examId,
          total_items: 0,
          due_today: 0,
          overdue: 0,
          available_items: 0,
        };
      }

      let dueToday = 0;
      let overdue = 0;
      let nextDueDate: string | null = null;

      allItems.forEach((item: any) => {
        const dueDate = item.next_due_date;
        if (!dueDate) return;

        // Match iOS logic: dueToday includes overdue + today (lines 188-194 in useReviewStats.ts)
        if (dueDate <= today) {
          dueToday++;  // Includes both overdue and items due exactly today
        }

        // Track overdue separately
        if (dueDate < today) {
          overdue++;
        }

        // Track earliest due date
        if (!nextDueDate || dueDate < nextDueDate) {
          nextDueDate = dueDate;
        }
      });

      // Get average grade from exam reports
      const { data: reports } = await supabase
        .from('exam_reports')
        .select('letter_grade')
        .eq('user_id', userId)
        .eq('exam_id', examId)
        .not('letter_grade', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10); // Last 10 exam reports

      let averageGrade: string | null = null;
      if (reports && reports.length > 0) {
        // Calculate average using 9-grade system
        const gradeToNumber = (grade: string): number => {
          const gradeMap: Record<string, number> = {
            'A+': 9,
            A: 8,
            'B+': 7,
            B: 6,
            'C+': 5,
            C: 4,
            'D+': 3,
            D: 2,
            F: 1,
          };
          return gradeMap[grade] || 0;
        };

        const numberToGrade = (num: number): string => {
          const gradeMap: Record<number, string> = {
            9: 'A+',
            8: 'A',
            7: 'B+',
            6: 'B',
            5: 'C+',
            4: 'C',
            3: 'D+',
            2: 'D',
            1: 'F',
          };
          return gradeMap[Math.round(num)] || 'F';
        };

        const totalGradeValue = reports.reduce(
          (sum, report) => sum + gradeToNumber(report.letter_grade),
          0
        );
        const avgGradeValue = totalGradeValue / reports.length;
        averageGrade = numberToGrade(avgGradeValue);
      }

      return {
        exam_id: examId,
        total_items: totalItems,
        due_today: dueToday,
        overdue,
        available_items: totalItems - dueToday - overdue,
        average_grade: averageGrade,
        next_due_date: nextDueDate,
      };
    } catch (err) {
      console.error('[SpacedRepetitionService] Error getting exam review stats:', err);
      return null;
    }
  }
}

export const spacedRepetitionService = new SpacedRepetitionService();
