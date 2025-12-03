import { SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/utils/logger";
export interface ExamReport {
  id: string;
  exam_id: string;
  user_id: string;
  completed_at: string;
  score: number;
  letter_grade: string;
  time_spent: number;
  correct_count: number;
  total_count: number;
  quiz_correct: number;
  quiz_total: number;
  flashcard_correct: number;
  flashcard_total: number;
  mastery_percentage: number;
  improvement_from_previous: number | null;
  current_streak: number;
  breakdown_json: any;
}

export interface CreateExamReportParams {
  examId: string;
  userId: string;
  score: number;
  letterGrade: string;
  timeSpent: number;
  correctCount: number;
  totalCount: number;
  quizCorrect: number;
  quizTotal: number;
  flashcardCorrect: number;
  flashcardTotal: number;
  masteryPercentage: number;
  currentStreak: number;
  breakdownJson?: any;
}

class ExamReportsService {
  private supabase: SupabaseClient | null = null;

  setSupabase(client: SupabaseClient) {
    this.supabase = client;
  }

  private getSupabase(): SupabaseClient {
    if (!this.supabase) {
      const { supabase: client } = require('./supabaseWithTimeout');
      this.supabase = client;
    }
    return this.supabase as SupabaseClient;
  }

  private getClient(): SupabaseClient {
    return this.getSupabase();
  }

  /**
   * Get the most recent report for an exam
   */
  async getPreviousReport(
    userId: string,
    examId: string
  ): Promise<{ data: ExamReport | null; error: any }> {
    try {
      const client = this.getClient();

      const { data, error } = await client
        .from("exam_reports")
        .select("*")
        .eq("user_id", userId)
        .eq("exam_id", examId)
        .order("completed_at", { ascending: false })
        .limit(2); // Get last 2 to calculate improvement

      if (error) {
        logger.error("[ExamReportsService] Error fetching previous report:", error);
        return { data: null, error };
      }

      // Return the second most recent (first is current, second is previous)
      return { data: data && data.length > 1 ? data[1] : null, error: null };
    } catch (error) {
      logger.error("[ExamReportsService] Exception fetching previous report:", error);
      return { data: null, error };
    }
  }

  /**
   * Create a new exam report
   */
  async createReport(
    params: CreateExamReportParams
  ): Promise<{ data: ExamReport | null; error: any }> {
    try {
      const client = this.getClient();

      // Get previous report to calculate improvement
      const { data: previousReport } = await this.getPreviousReport(
        params.userId,
        params.examId
      );

      const improvementFromPrevious = previousReport
        ? params.score - previousReport.score
        : null;

      const reportData = {
        exam_id: params.examId,
        user_id: params.userId,
        completed_at: new Date().toISOString(),
        score: params.score,
        letter_grade: params.letterGrade,
        time_spent: params.timeSpent,
        correct_count: params.correctCount,
        total_count: params.totalCount,
        quiz_correct: params.quizCorrect,
        quiz_total: params.quizTotal,
        flashcard_correct: params.flashcardCorrect,
        flashcard_total: params.flashcardTotal,
        mastery_percentage: params.masteryPercentage,
        improvement_from_previous: improvementFromPrevious,
        current_streak: params.currentStreak,
        breakdown_json: params.breakdownJson || {},
      };

      const { data, error } = await client
        .from("exam_reports")
        .insert(reportData)
        .select()
        .single();

      if (error) {
        logger.error("[ExamReportsService] Error creating report:", error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      logger.error("[ExamReportsService] Exception creating report:", error);
      return { data: null, error };
    }
  }

  /**
   * Get all reports for an exam
   */
  async getExamReports(
    userId: string,
    examId: string
  ): Promise<{ data: ExamReport[] | null; error: any }> {
    try {
      const client = this.getClient();

      const { data, error } = await client
        .from("exam_reports")
        .select("*")
        .eq("user_id", userId)
        .eq("exam_id", examId)
        .order("completed_at", { ascending: false });

      if (error) {
        logger.error("[ExamReportsService] Error fetching exam reports:", error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      logger.error("[ExamReportsService] Exception fetching exam reports:", error);
      return { data: null, error };
    }
  }

  /**
   * Get all reports for a user
   */
  async getUserReports(
    userId: string
  ): Promise<{ data: ExamReport[] | null; error: any }> {
    try {
      const client = this.getClient();

      const { data, error } = await client
        .from("exam_reports")
        .select(`
          *,
          exams:exam_id (
            subject_name,
            exam_date
          )
        `)
        .eq("user_id", userId)
        .order("completed_at", { ascending: false });

      if (error) {
        logger.error("[ExamReportsService] Error fetching user reports:", error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      logger.error("[ExamReportsService] Exception fetching user reports:", error);
      return { data: null, error };
    }
  }

  /**
   * Get all scores for an exam (for percentile calculation)
   */
  async getAllExamScores(
    examId: string
  ): Promise<{ data: number[] | null; error: any }> {
    try {
      const client = this.getClient();

      const { data, error } = await client
        .from("exam_reports")
        .select("score")
        .eq("exam_id", examId)
        .order("score", { ascending: false });

      if (error) {
        logger.error("[ExamReportsService] Error fetching exam scores:", error);
        return { data: null, error };
      }

      return {
        data: data ? data.map((r) => r.score) : null,
        error: null,
      };
    } catch (error) {
      logger.error("[ExamReportsService] Exception fetching exam scores:", error);
      return { data: null, error };
    }
  }
}

export const examReportsService = new ExamReportsService();
