import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/api/supabaseWithTimeout';
import { spacedRepetitionService } from '@/lib/api/spacedRepetitionService';
import { gradeToNumber, numberToGrade } from '@/utils/gradeUtils';
import { ReviewStats, ExamWithSeeds, Seed } from '@/types';

import { logger } from "@/utils/logger";
interface UseReviewStatsReturn {
  reviewStats: Record<string, ReviewStats>;
  exams: (ExamWithSeeds & { seedCount: number })[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch review statistics for all user exams with optimized queries
 * Consolidates N+1 queries into single efficient database calls
 */
export const useReviewStats = (): UseReviewStatsReturn => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['reviewStats', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const today = new Date().toISOString().split('T')[0];

      // OPTIMIZED: Query 1 - Get exams with seed metadata only (no flashcards/quiz data)
      const { data: examsWithSeeds, error: examsError } = await supabase
        .from('exams')
        .select(`
          id,
          user_id,
          subject_name,
          exam_date,
          created_at,
          updated_at,
          exam_seeds!left(
            seed_id,
            seeds!left(
              id, title, content_type, content_url, content_text,
              file_size, is_starred, is_archived, created_at, updated_at,
              original_content, feynman_explanation, confidence_score,
              extraction_metadata, processing_status, processing_error
            )
          )
        `)
        .eq('user_id', user.id)
        .order('exam_date', { ascending: true, nullsFirst: false });

      if (examsError) {
        logger.error('[useReviewStats] Error fetching exams:', examsError);
        throw new Error(examsError.message);
      }

      // Gather all seed IDs across exams for batched lookups
      const seedIdSet = new Set<string>();
      for (const exam of examsWithSeeds || []) {
        const examSeeds = exam.exam_seeds || [];
        examSeeds.forEach((es: any) => {
          const seed = es.seeds as Seed | null;
          if (seed?.id) {
            seedIdSet.add(seed.id);
          }
        });
      }

      const allSeedIds = Array.from(seedIdSet);

      type DueDateRow = { seed_id: string; next_due_date: string | null };
      let flashcardRows: DueDateRow[] = [];
      let quizRows: DueDateRow[] = [];

      if (allSeedIds.length > 0) {
        const [flashcardResult, quizResult] = await Promise.all([
          supabase
            .from('flashcards')
            .select('seed_id,next_due_date')
            .eq('user_id', user.id)
            .in('seed_id', allSeedIds)
            .not('interval', 'is', null),
          supabase
            .from('quiz_questions')
            .select('seed_id,next_due_date')
            .eq('user_id', user.id)
            .in('seed_id', allSeedIds)
            .not('interval', 'is', null),
        ]);

        if (flashcardResult.error) {
          logger.error('[useReviewStats] Flashcard query failed:', flashcardResult.error);
        } else if (flashcardResult.data) {
          flashcardRows = flashcardResult.data as DueDateRow[];
        }

        if (quizResult.error) {
          logger.error('[useReviewStats] Quiz query failed:', quizResult.error);
        } else if (quizResult.data) {
          quizRows = quizResult.data as DueDateRow[];
        }
      }

      const flashcardMap = new Map<string, DueDateRow[]>();
      flashcardRows.forEach((row) => {
        if (!flashcardMap.has(row.seed_id)) {
          flashcardMap.set(row.seed_id, []);
        }
        flashcardMap.get(row.seed_id)!.push(row);
      });

      const quizMap = new Map<string, DueDateRow[]>();
      quizRows.forEach((row) => {
        if (!quizMap.has(row.seed_id)) {
          quizMap.set(row.seed_id, []);
        }
        quizMap.get(row.seed_id)!.push(row);
      });

      // OPTIMIZED: Query 3 - Get exam reports for average grade calculation
      let examReports: any[] = [];
      if (allSeedIds.length > 0) {
        const { data, error } = await supabase
          .from('exam_reports')
          .select('exam_id, letter_grade')
          .eq('user_id', user.id)
          .not('letter_grade', 'is', null);

        if (!error && data) {
          examReports = data;
        }
      }

      // Note: gradeToNumber and numberToGrade are imported from gradeUtils
      // They use 9-grade system: A+=9, A=8, B+=7, B=6, C+=5, C=4, D+=3, D=2, F=1

      // Map exam reports by exam_id and collect all grades for each exam
      const examReportsByExam = new Map<string, string[]>();
      examReports.forEach((report: any) => {
        const examId = report.exam_id;
        if (!examReportsByExam.has(examId)) {
          examReportsByExam.set(examId, []);
        }
        examReportsByExam.get(examId)!.push(report.letter_grade);
      });

      // Calculate average grade for each exam
      const examAverageGrades = new Map<string, string>();
      examReportsByExam.forEach((grades, examId) => {
        if (grades.length > 0) {
          const avgNumeric = grades.reduce((sum, g) => sum + gradeToNumber(g), 0) / grades.length;
          const avgGrade = numberToGrade(avgNumeric);
          examAverageGrades.set(examId, avgGrade);
        }
      });

      // Process exam data
      const examsWithSeedsFormatted: (ExamWithSeeds & { seedCount: number })[] = [];
      const statsMap: Record<string, ReviewStats> = {};

      for (const exam of examsWithSeeds || []) {
        // Extract seeds
        const examSeeds = exam.exam_seeds || [];
        const seeds: Seed[] = examSeeds
          .map(es => es.seeds as any)
          .filter((seed): seed is Seed => seed !== null);

        const seedIds = seeds.map(s => s.id);

        // OPTIMIZED: Query 2 - Get aggregated counts for this exam using PostgreSQL
        // This is MUCH faster than fetching all flashcard/quiz data
        let totalItems = 0;
        let dueTodayItems = 0;
        let overdueItems = 0;
        let nextDueDate: string | undefined;

        if (seedIds.length > 0) {
          const examFlashcards = seedIds.flatMap((id) => flashcardMap.get(id) || []);
          const examQuizzes = seedIds.flatMap((id) => quizMap.get(id) || []);

          const allItems = [...examFlashcards, ...examQuizzes];
          totalItems = allItems.length;

          const normalizedDates = allItems
            .map(item => item.next_due_date?.split('T')[0] || item.next_due_date?.split(' ')[0])
            .filter((date): date is string => !!date);

          normalizedDates.forEach((date) => {
            if (date <= today) dueTodayItems++;
            if (date < today) overdueItems++;
          });

          const futureDates = normalizedDates.filter(date => date > today).sort();
          nextDueDate = futureDates[0];
        }

        const upcomingItems = totalItems - dueTodayItems;

        // Get average grade for this exam
        const averageGrade = examAverageGrades.get(exam.id);

        examsWithSeedsFormatted.push({
          ...exam,
          seeds,
          seedCount: seeds.length
        });

        statsMap[exam.id] = {
          examId: exam.id,
          totalItems,
          dueToday: dueTodayItems,
          overdue: overdueItems,
          upcoming: upcomingItems,
          nextReviewDate: nextDueDate,
          averageGrade: averageGrade
        };
      }

      return {
        exams: examsWithSeedsFormatted,
        reviewStats: statsMap
      };
    },
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute cache
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: 2, // Retry up to 2 times to handle Supabase reconnection delay
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000), // Exponential backoff: 1s, 2s
    placeholderData: keepPreviousData, // Show cached data while loading
  });

  return {
    reviewStats: data?.reviewStats || {},
    exams: data?.exams || [],
    isLoading,
    error: error as Error | null,
    refetch
  };
};
