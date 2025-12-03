import { Exam, ExamSeed, ExamWithSeeds, Seed } from "@/types";
export type { ExamWithSeeds };
import { supabase } from "./supabaseWithTimeout";
import { spacedRepetitionService } from "./spacedRepetitionService";
import { backgroundProcessor } from "./backgroundProcessor";
import { ExamDetailRPC } from "@/types/rpc";

import { logger } from "@/utils/logger";
export interface CreateExamData {
  subject_name: string;
}

export interface UpdateExamData {
  subject_name?: string;
}

class ExamsService {
  async createExam(
    data: CreateExamData,
  ): Promise<{ exam?: Exam; error?: string }> {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        logger.error("Session error:", sessionError);
        return { error: "Authentication required" };
      }

      if (!session?.user) {
        return {
          error:
            "User authentication required to create exams. Please sign in first.",
        };
      }

      const { data: exam, error } = await supabase
        .from("exams")
        .insert({
          user_id: session.user.id,
          subject_name: data.subject_name,
        })
        .select()
        .single();

      if (error) {
        logger.error("Create exam error:", error);
        return { error: `Failed to create exam: ${error.message}` };
      }

      return { exam };
    } catch (error) {
      logger.error("Create exam exception:", error);
      return { error: "Failed to create exam" };
    }
  }

  async getExams(): Promise<{ exams?: Exam[]; error?: string }> {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        return { exams: [] };
      }

      const { data: exams, error } = await supabase
        .from("exams")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        logger.error("Get exams error:", error);
        return { error: `Failed to fetch exams: ${error.message}` };
      }

      return { exams: exams || [] };
    } catch (error) {
      logger.error("Get exams exception:", error);
      return { error: "Failed to fetch exams" };
    }
  }

  async getExam(id: string): Promise<{ exam?: Exam; error?: string }> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        return { error: "Authentication required" };
      }

      const { data: exam, error } = await supabase
        .from("exams")
        .select("*")
        .eq("id", id)
        .eq("user_id", session.user.id)
        .single();

      if (error) {
        logger.error("Get exam error:", error);
        return { error: "Failed to fetch exam" };
      }

      return { exam };
    } catch (error) {
      logger.error("Get exam exception:", error);
      return { error: "Failed to fetch exam" };
    }
  }

  async updateExam(
    id: string,
    data: UpdateExamData,
  ): Promise<{ exam?: Exam; error?: string }> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        return { error: "Authentication required" };
      }

      const { data: exam, error } = await supabase
        .from("exams")
        .update(data)
        .eq("id", id)
        .eq("user_id", session.user.id)
        .select()
        .single();

      if (error) {
        logger.error("Update exam error:", error);
        return { error: "Failed to update exam" };
      }

      return { exam };
    } catch (error) {
      logger.error("Update exam exception:", error);
      return { error: "Failed to update exam" };
    }
  }

  async deleteExam(id: string): Promise<{ error?: string }> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        return { error: "Authentication required" };
      }

      const { error } = await supabase
        .from("exams")
        .delete()
        .eq("id", id)
        .eq("user_id", session.user.id);

      if (error) {
        logger.error("Delete exam error:", error);
        return { error: "Failed to delete exam" };
      }

      // Cancel all queued tasks associated with this exam
      try {
        const canceledCount = backgroundProcessor.cancelTasksByExamId(id);
        if (canceledCount > 0) {
          logger.info(`[ExamsService] Canceled ${canceledCount} background tasks for exam ${id}`);
        }
      } catch (cancelError) {
        logger.warn(
          "[ExamsService] Warning: Failed to cancel tasks:",
          cancelError,
        );
        // Don't fail the main operation if cancellation fails
      }

      return {};
    } catch (error) {
      logger.error("Delete exam exception:", error);
      return { error: "Failed to delete exam" };
    }
  }

  async addSeedToExam(
    examId: string,
    seedId: string,
  ): Promise<{ examSeed?: ExamSeed; error?: string }> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        return { error: "Authentication required" };
      }

      const { data: examSeed, error } = await supabase
        .from("exam_seeds")
        .insert({
          exam_id: examId,
          seed_id: seedId,
          user_id: session.user.id,
        })
        .select()
        .single();

      if (error) {
        logger.error("Add seed to exam error:", error);
        return { error: "Failed to add seed to exam" };
      }

      // Auto-generate flashcards and quiz for newly added seed
      try {
        // Trigger background generation (non-blocking)
        const generationResult =
          await backgroundProcessor.generateBothInBackground(
            seedId,
            session.user.id,
            examId,
          );

        if (!generationResult.success && !generationResult.skipped) {
          logger.warn(
            "[ExamsService] Auto-generation request reported failure:",
            generationResult.error || "Unknown error",
          );
        } else {
          logger.info(`[ExamsService] Auto-generation queued successfully for seed ${seedId}`);
        }
      } catch (autoGenError) {
        logger.warn(
          "[ExamsService] Warning: Auto-generation queuing failed:",
          autoGenError,
        );
        // Don't fail the main operation if auto-generation fails to queue
      }

      // Initialize SM2 fields for flashcards and quiz questions of this seed
      try {
        spacedRepetitionService.setSupabase(supabase);

        // Get content IDs for the added seed
        const {
          flashcardIds,
          quizQuestionIds,
          error: contentError,
        } = await spacedRepetitionService.getContentIdsForSeeds(
          session.user.id,
          [seedId],
        );

        if (contentError) {
          logger.warn(
            "[ExamsService] Warning: Could not get content IDs for SM2 initialization:",
            contentError,
          );
        } else if (flashcardIds.length > 0 || quizQuestionIds.length > 0) {
          // Initialize SM2 fields for the content
          const { success, error: sm2Error } =
            await spacedRepetitionService.initializeSM2ForContent(
              session.user.id,
              flashcardIds,
              quizQuestionIds,
            );

          if (!success) {
            logger.warn(
              "[ExamsService] Warning: SM2 initialization failed:",
              sm2Error,
            );
          } else {
          }
        }
      } catch (sm2InitError) {
        logger.warn(
          "[ExamsService] Warning: SM2 initialization failed with exception:",
          sm2InitError,
        );
        // Don't fail the main operation if SM2 initialization fails
      }

      return { examSeed };
    } catch (error) {
      logger.error("Add seed to exam exception:", error);
      return { error: "Failed to add seed to exam" };
    }
  }

  async removeSeedFromExam(
    examId: string,
    seedId: string,
  ): Promise<{ error?: string }> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        return { error: "Authentication required" };
      }

      const { error } = await supabase
        .from("exam_seeds")
        .delete()
        .eq("exam_id", examId)
        .eq("seed_id", seedId)
        .eq("user_id", session.user.id);

      if (error) {
        logger.error("Remove seed from exam error:", error);
        return { error: "Failed to remove seed from exam" };
      }

      // Cancel any queued tasks for this seed in this specific exam
      try {
        const canceledCount = backgroundProcessor.cancelTasksBySeedId(
          seedId,
          examId,
        );
        if (canceledCount > 0) {
          logger.info(`[ExamsService] Canceled ${canceledCount} background tasks for seed ${seedId} in exam ${examId}`);
        }
      } catch (cancelError) {
        logger.warn(
          "[ExamsService] Warning: Failed to cancel tasks:",
          cancelError,
        );
        // Don't fail the main operation if cancellation fails
      }

      return {};
    } catch (error) {
      logger.error("Remove seed from exam exception:", error);
      return { error: "Failed to remove seed from exam" };
    }
  }

  async getExamWithSeeds(
    examId: string,
  ): Promise<{ examWithSeeds?: ExamWithSeeds; error?: string }> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        return { error: "Authentication required" };
      }

      // OPTIMIZED: Single RPC call replaces 2 sequential queries
      // Returns exam metadata, seeds list, and review stats all at once
      const { data: examDetail, error: examError } = await supabase.rpc(
        "get_exam_with_review_stats",
        { p_exam_id: examId, p_user_id: session.user.id },
      );

      if (examError) {
        logger.error("Get exam detail error:", examError);
        return { error: "Failed to fetch exam" };
      }

      if (!examDetail?.exam) {
        return { error: "Exam not found" };
      }

      // Transform RPC response to ExamWithSeeds format
      const seeds = examDetail.seeds || [];
      const examWithSeeds: ExamWithSeeds = {
        ...examDetail.exam,
        seeds,
        seedCount: seeds.length,
      };

      return { examWithSeeds };
    } catch (error) {
      logger.error("Get exam with seeds exception:", error);
      return { error: "Failed to fetch exam with seeds" };
    }
  }

  async addMultipleSeedsToExam(
    examId: string,
    seedIds: string[],
  ): Promise<{
    examSeeds?: ExamSeed[];
    errors?: string[];
  }> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        return { errors: ["Authentication required"] };
      }

      const insertData = seedIds.map((seedId) => ({
        exam_id: examId,
        seed_id: seedId,
        user_id: session.user.id,
      }));

      const { data: examSeeds, error } = await supabase
        .from("exam_seeds")
        .insert(insertData)
        .select();

      if (error) {
        logger.error("Add multiple seeds to exam error:", error);
        return { errors: [`Failed to add seeds to exam: ${error.message}`] };
      }

      // Auto-generate flashcards and quiz for newly added seeds
      try {
        // Trigger background generation for each seed (non-blocking)
        const generationResults = await Promise.allSettled(
          seedIds.map((seedId) =>
            backgroundProcessor.generateBothInBackground(
              seedId,
              session.user.id,
              examId,
            ),
          ),
        );

        const failedGenerations = generationResults.filter(
          (result) =>
            result.status === "rejected" ||
            (result.status === "fulfilled" &&
              !result.value.success &&
              !result.value.skipped),
        );

        if (failedGenerations.length > 0) {
          logger.warn(
            "[ExamsService] Warning: Some auto-generation requests failed:",
            failedGenerations.length,
          );
        } else {
          logger.info(`[ExamsService] SM2 initialization successful for all seeds`);
        }
      } catch (autoGenError) {
        logger.warn(
          "[ExamsService] Warning: Auto-generation queuing failed:",
          autoGenError,
        );
        // Don't fail the main operation if auto-generation fails to queue
      }

      // Initialize SM2 fields for flashcards and quiz questions of these seeds
      try {
        spacedRepetitionService.setSupabase(supabase);

        // Get content IDs for the added seeds
        const {
          flashcardIds,
          quizQuestionIds,
          error: contentError,
        } = await spacedRepetitionService.getContentIdsForSeeds(
          session.user.id,
          seedIds,
        );

        if (contentError) {
          logger.warn(
            "[ExamsService] Warning: Could not get content IDs for SM2 initialization:",
            contentError,
          );
        } else if (flashcardIds.length > 0 || quizQuestionIds.length > 0) {
          // Initialize SM2 fields for the content
          const { success, error: sm2Error } =
            await spacedRepetitionService.initializeSM2ForContent(
              session.user.id,
              flashcardIds,
              quizQuestionIds,
            );

          if (!success) {
            logger.warn(
              "[ExamsService] Warning: SM2 initialization failed:",
              sm2Error,
            );
          } else {
          }
        }
      } catch (sm2InitError) {
        logger.warn(
          "[ExamsService] Warning: SM2 initialization failed with exception:",
          sm2InitError,
        );
        // Don't fail the main operation if SM2 initialization fails
      }

      return { examSeeds: examSeeds || [] };
    } catch (error) {
      logger.error("Add multiple seeds to exam exception:", error);
      return { errors: ["Failed to add seeds to exam"] };
    }
  }

  async getExamsWithSeedCounts(): Promise<{
    exams?: (Exam & { seedCount: number })[];
    error?: string;
  }> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        return { exams: [] };
      }

      const { data: examsWithCounts, error } = await supabase
        .from("exams")
        .select(
          `
          *,
          exam_seeds (count)
        `,
        )
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        logger.error("Get exams with counts error:", error);
        return { error: "Failed to fetch exams" };
      }

      const exams =
        examsWithCounts?.map((exam: any) => ({
          ...exam,
          seedCount: exam.exam_seeds?.[0]?.count || 0,
        })) || [];

      return { exams };
    } catch (error) {
      logger.error("Get exams with counts exception:", error);
      return { error: "Failed to fetch exams" };
    }
  }
}

export const examsService = new ExamsService();
