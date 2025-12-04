import { SupabaseClient } from "@supabase/supabase-js";
import { QueryClient } from "@tanstack/react-query";
import { logger } from "@/utils/logger";
export interface DeleteImpactAnalysis {
  seedId: string;
  seedTitle: string;
  impact: {
    flashcards: number;
    quizQuestions: number;
    examSeeds: number;
    learningSessions: number;
    totalItems: number;
  };
  affectedExams: Array<{
    examId: string;
    examName: string;
    seedCount: number;
  }>;
}

export interface DeleteResult {
  success: boolean;
  deletedCounts?: {
    flashcards: number;
    quizQuestions: number;
    examSeeds: number;
    learningSessions: number;
    seeds: number;
  };
  error?: string;
}

class CleanupService {
  private supabase: SupabaseClient | null = null;
  private queryClient: QueryClient | null = null;

  setSupabase(client: SupabaseClient) {
    this.supabase = client;
    
    // Also try to initialize QueryClient from global if not already set
    if (!this.queryClient && typeof window !== 'undefined') {
      const globalQueryClient = (window as any).__QUERY_CLIENT__;
      if (globalQueryClient) {
        this.queryClient = globalQueryClient;
      }
    }
  }

  setQueryClient(client: QueryClient) {
    this.queryClient = client;
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

  private getQueryClient(): QueryClient {
    if (!this.queryClient) {
      // Try to get the QueryClient from the window or create a default one
      try {
        // Check if we're in a browser environment
        if (typeof window !== 'undefined') {
          // Try to access the global QueryClient if it exists
          const globalQueryClient = (window as any).__QUERY_CLIENT__;
          if (globalQueryClient) {
            this.queryClient = globalQueryClient;
          }
        }
        
        // Create a default QueryClient for server-side operations
        if (!this.queryClient) {
          this.queryClient = new QueryClient({
            defaultOptions: {
              queries: {
                staleTime: 1000 * 60 * 5, // 5 minutes
                retry: 1,
              },
            },
          });
        }
        return this.queryClient;
      } catch (error) {
        throw new Error(
          "QueryClient not initialized. Call setQueryClient() first.",
        );
      }
    }
    return this.queryClient;
  }

  /**
   * Analyze the impact of deleting an exam
   */
  async analyzeExamDeleteImpact(
    examId: string,
  ): Promise<{ impact?: any; error?: string }> {
    try {
      const client = this.getClient();

      // Get exam information
      const { data: exam, error: examError } = await client
        .from("exams")
        .select("subject_name")
        .eq("id", examId)
        .single();

      if (examError) {
        return { error: `Exam not found: ${examError.message}` };
      }

      // First, get all seed IDs for this exam
      const { data: examSeeds, error: examSeedsError } = await client
        .from("exam_seeds")
        .select("seed_id")
        .eq("exam_id", examId);

      if (examSeedsError) {
        logger.warn(
          "[CleanupService] Warning: Could not fetch exam seeds:",
          examSeedsError,
        );
      }

      const seedIds = (examSeeds || []).map((es) => es.seed_id);

      // Count exam_seeds
      const examSeedResult = await client
        .from("exam_seeds")
        .select("id", { count: "exact", head: true })
        .eq("exam_id", examId);

      // Count related records for seeds in this exam
      let flashcardResult = { count: 0 };
      let quizResult = { count: 0 };
      let learningSessionResult = { count: 0 };

      if (seedIds.length > 0) {
        const [fc, qq, ls] = await Promise.all([
          client
            .from("flashcards")
            .select("id", { count: "exact", head: true })
            .in("seed_id", seedIds),
          client
            .from("quiz_questions")
            .select("id", { count: "exact", head: true })
            .in("seed_id", seedIds),
          client
            .from("learning_sessions")
            .select("id", { count: "exact", head: true })
            .in("seed_id", seedIds),
        ]);
        flashcardResult = { count: fc.count || 0 };
        quizResult = { count: qq.count || 0 };
        learningSessionResult = { count: ls.count || 0 };
      }

      const impact = {
        examId,
        examName: exam.subject_name || "Untitled Exam",
        impact: {
          flashcards: flashcardResult.count || 0,
          quizQuestions: quizResult.count || 0,
          examSeeds: examSeedResult.count || 0,
          learningSessions: learningSessionResult.count || 0,
          totalItems:
            (flashcardResult.count || 0) +
            (quizResult.count || 0) +
            (examSeedResult.count || 0) +
            (learningSessionResult.count || 0),
        },
      };

      return { impact };
    } catch (error) {
      logger.error(
        "[CleanupService] Error analyzing exam delete impact:",
        error,
      );
      return {
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze delete impact",
      };
    }
  }

  /**
   * Analyze the impact of deleting a seed
   */
  async analyzeSeedDeleteImpact(
    seedId: string,
  ): Promise<{ impact?: DeleteImpactAnalysis; error?: string }> {
    try {
      const client = this.getClient();

      // Get seed information
      const { data: seed, error: seedError } = await client
        .from("seeds")
        .select("title")
        .eq("id", seedId)
        .single();

      if (seedError) {
        return { error: `Seed not found: ${seedError.message}` };
      }

      // Count related records in parallel
      const [
        flashcardResult,
        quizResult,
        examSeedResult,
        learningSessionResult,
      ] = await Promise.all([
        client
          .from("flashcards")
          .select("id", { count: "exact", head: true })
          .eq("seed_id", seedId),
        client
          .from("quiz_questions")
          .select("id", { count: "exact", head: true })
          .eq("seed_id", seedId),
        client
          .from("exam_seeds")
          .select("id", { count: "exact", head: true })
          .eq("seed_id", seedId),
        client
          .from("learning_sessions")
          .select("id", { count: "exact", head: true })
          .eq("seed_id", seedId),
      ]);

      // Get affected exams information
      const { data: examSeedsWithDetails, error: examDetailsError } =
        await client
          .from("exam_seeds")
          .select(
            `
          exam_id,
          exams!inner(
            id,
            subject_name
          )
        `,
          )
          .eq("seed_id", seedId);

      if (examDetailsError) {
        logger.warn(
          "[CleanupService] Warning: Could not fetch exam details:",
          examDetailsError,
        );
      }

      // Calculate remaining seed counts for affected exams
      const affectedExams: DeleteImpactAnalysis["affectedExams"] = [];
      if (examSeedsWithDetails) {
        const examIds = [
          ...new Set(examSeedsWithDetails.map((es) => es.exam_id)),
        ];

        // Parallelize queries instead of sequential awaits
        const countPromises = examIds.map((examId) =>
          client
            .from("exam_seeds")
            .select("*", { count: "exact", head: true })
            .eq("exam_id", examId)
            .then((result) => ({ examId, ...result })),
        );

        const countResults = await Promise.all(countPromises);

        for (const { examId, count, error: countError } of countResults) {
          if (
            !countError &&
            examSeedsWithDetails.some((es) => es.exam_id === examId)
          ) {
            const examData = examSeedsWithDetails.find(
              (es) => es.exam_id === examId,
            );
            affectedExams.push({
              examId,
              examName:
                (examData?.exams as any)?.subject_name || "Unknown Exam",
              seedCount: count || 0,
            });
          }
        }
      }

      const impact: DeleteImpactAnalysis = {
        seedId,
        seedTitle: seed.title || "Untitled Seed",
        impact: {
          flashcards: flashcardResult.count || 0,
          quizQuestions: quizResult.count || 0,
          examSeeds: examSeedResult.count || 0,
          learningSessions: learningSessionResult.count || 0,
          totalItems:
            (flashcardResult.count || 0) +
            (quizResult.count || 0) +
            (examSeedResult.count || 0) +
            (learningSessionResult.count || 0),
        },
        affectedExams,
      };

      return { impact };
    } catch (error) {
      logger.error("[CleanupService] Error analyzing delete impact:", error);
      return {
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze delete impact",
      };
    }
  }

  /**
   * Delete a seed with proper cascade (transaction-based)
   * FIXED: Simplified timeout handling to prevent app freezing
   */
  async deleteSeedCascade(
    seedId: string,
    userId: string,
  ): Promise<DeleteResult> {
    const startTime = Date.now();
    const TIMEOUT_MS = 15000; // Single timeout for entire operation

    try {
      const client = this.getClient();

      // Single timeout wrapper for the entire operation
      const deleteOperation = async () => {
        // Verify ownership first (quick operation)
        const { data: seed, error: seedError } = await client
          .from("seeds")
          .select("id, user_id")
          .eq("id", seedId)
          .single();

        if (seedError || !seed) {
          return { success: false, error: "Seed not found" };
        }

        if (seed.user_id !== userId) {
          return { success: false, error: "Unauthorized to delete this seed" };
        }

        const deletedCounts = {
          flashcards: 0,
          quizQuestions: 0,
          examSeeds: 0,
          learningSessions: 0,
          seeds: 0,
        };

        // Sequential deletion to avoid database deadlocks
        try {
          // 1. Delete flashcards
          const flashcardsResult = await client
            .from("flashcards")
            .delete({ count: "exact" })
            .eq("seed_id", seedId);
          deletedCounts.flashcards = flashcardsResult.count || 0;

          // 2. Delete quiz questions
          const quizQuestionsResult = await client
            .from("quiz_questions")
            .delete({ count: "exact" })
            .eq("seed_id", seedId);
          deletedCounts.quizQuestions = quizQuestionsResult.count || 0;

          // 3. Delete exam seeds
          const examSeedsResult = await client
            .from("exam_seeds")
            .delete({ count: "exact" })
            .eq("seed_id", seedId);
          deletedCounts.examSeeds = examSeedsResult.count || 0;

          // 4. learning_sessions NOT deleted - database SET NULL preserves history
          deletedCounts.learningSessions = 0;

          // 5. Delete the seed itself
          const { count: seedsCount, error: deleteError } = await client
            .from("seeds")
            .delete({ count: "exact" })
            .eq("id", seedId);

          if (deleteError) {
            throw new Error(`Failed to delete seed: ${deleteError.message}`);
          }

          deletedCounts.seeds = seedsCount || 0;

          return {
            success: true,
            deletedCounts,
          };
        } catch (deleteError) {
          logger.error(
            "[CleanupService] Error during cascade delete:",
            deleteError,
          );
          return {
            success: false,
            error:
              deleteError instanceof Error
                ? deleteError.message
                : "Cascade delete failed",
          };
        }
      };

      // Execute with single timeout
      const result = await Promise.race([
        deleteOperation(),
        new Promise<DeleteResult>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(`Delete operation timed out after ${TIMEOUT_MS}ms`),
              ),
            TIMEOUT_MS,
          ),
        ),
      ]);

      const duration = Date.now() - startTime;
      const totalDeleted = result.deletedCounts
        ? Object.values(result.deletedCounts).reduce(
          (sum, count) => sum + count,
          0,
        )
        : 0;

      if (result.success) {
        logger.info(
          `[CleanupService] Cascade delete completed in ${duration}ms`,
          {
            seedId,
            duration,
            totalDeleted,
            deletedCounts: result.deletedCounts,
          },
        );

        // Invalidate the seeds query to force a refetch (if QueryClient is available)
        try {
          this.getQueryClient().invalidateQueries({
            queryKey: ["seeds", userId],
          });
        } catch (error) {
          // QueryClient not initialized - this is expected in some contexts
          logger.debug("[CleanupService] QueryClient not available for query invalidation");
        }
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        `[CleanupService] Cascade delete failed after ${duration}ms:`,
        error,
      );

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during cascade delete",
      };
    }
  }

  async deleteExamCascade(
    examId: string,
    userId: string,
  ): Promise<DeleteResult> {
    const startTime = Date.now();
    try {
      const client = this.getClient();

      // Verify ownership
      const { data: exam, error: examError } = await client
        .from("exams")
        .select("id, user_id")
        .eq("id", examId)
        .single();

      if (examError || !exam) {
        return { success: false, error: "Exam not found" };
      }
      if (exam.user_id !== userId) {
        return { success: false, error: "Unauthorized to delete this exam" };
      }

      // Delete exam_seeds first
      const { count: examSeedsCount, error: examSeedsError } = await client
        .from("exam_seeds")
        .delete({ count: "exact" })
        .eq("exam_id", examId);

      if (examSeedsError) {
        throw new Error(
          `Failed to delete exam seeds: ${examSeedsError.message}`,
        );
      }

      // Delete the exam
      const { count: examCount, error: deleteError } = await client
        .from("exams")
        .delete({ count: "exact" })
        .eq("id", examId);

      if (deleteError) {
        throw new Error(`Failed to delete exam: ${deleteError.message}`);
      }

      const duration = Date.now() - startTime;
      logger.info(`[CleanupService] Exam delete completed in ${duration}ms`, {
        examId,
        duration,
        deletedCounts: { examSeeds: examSeedsCount, exams: examCount },
      });

      // Invalidate both exams and seeds queries (if QueryClient is available)
      try {
        this.getQueryClient().invalidateQueries({ queryKey: ["exams", userId] });
        this.getQueryClient().invalidateQueries({ queryKey: ["seeds", userId] });
      } catch (error) {
        // QueryClient not initialized - this is expected in some contexts
        logger.debug("[CleanupService] QueryClient not available for query invalidation");
      }

      return {
        success: true,
        deletedCounts: {
          examSeeds: examSeedsCount || 0,
          exams: examCount || 0,
        } as any,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        `[CleanupService] Exam delete failed after ${duration}ms:`,
        error,
      );
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during exam delete",
      };
    }
  }

  /**
   * Batch delete multiple seeds with impact analysis
   */
  async deleteMultipleSeedsCascade(
    seedIds: string[],
    userId: string,
  ): Promise<{
    results: DeleteResult[];
    totalDeleted: number;
    errors: string[];
  }> {
    const results: DeleteResult[] = [];
    const errors: string[] = [];
    let totalDeleted = 0;

    // First, analyze all impacts
    const impactAnalyses = await Promise.all(
      seedIds.map(async (seedId) => {
        const analysis = await this.analyzeSeedDeleteImpact(seedId);
        return { seedId, analysis };
      }),
    );

    // Check for any critical impacts (seeds used in many exams)
    const criticalImpacts = impactAnalyses.filter(
      ({ analysis }) =>
        analysis.impact &&
        analysis.impact.affectedExams.some((exam) => exam.seedCount <= 2),
    );

    if (criticalImpacts.length > 0) {
      const criticalSeedIds = criticalImpacts.map(({ seedId }) => seedId);
      errors.push(
        `Warning: Seeds ${criticalSeedIds.join(", ")} are critical to exams (2 or fewer seeds). Consider removing from exams first.`,
      );
    }

    // Process deletions sequentially to avoid overwhelming the database
    for (const { seedId } of impactAnalyses) {
      try {
        const result = await this.deleteSeedCascade(seedId, userId);
        results.push(result);

        if (result.success && result.deletedCounts) {
          totalDeleted += Object.values(result.deletedCounts).reduce(
            (sum, count) => sum + count,
            0,
          );
        } else if (!result.success) {
          errors.push(`Failed to delete seed ${seedId}: ${result.error}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        errors.push(`Exception deleting seed ${seedId}: ${errorMessage}`);
        results.push({ success: false, error: errorMessage });
      }
    }

    return { results, totalDeleted, errors };
  }

  /**
   * Clean up orphaned records (maintenance operation)
   */
  async cleanupOrphanedRecords(userId: string): Promise<{
    cleanedCounts: {
      flashcards: number;
      quizQuestions: number;
      examSeeds: number;
      learningSessions: number;
    };
    errors: string[];
  }> {
    const cleanedCounts = {
      flashcards: 0,
      quizQuestions: 0,
      examSeeds: 0,
      learningSessions: 0,
    };
    const errors: string[] = [];

    try {
      const client = this.getClient();

      // Clean up orphaned flashcards (seed_id references non-existent seed)
      try {
        const { count: orphanedFlashcards } = await client
          .from("flashcards")
          .delete({ count: "exact" })
          .not(
            "seed_id",
            "in",
            client.from("seeds").select("id").eq("user_id", userId),
          );

        cleanedCounts.flashcards = orphanedFlashcards || 0;
      } catch (error) {
        errors.push(`Failed to clean orphaned flashcards: ${error}`);
      }

      // Clean up orphaned quiz questions
      try {
        const { count: orphanedQuizQuestions } = await client
          .from("quiz_questions")
          .delete({ count: "exact" })
          .not(
            "seed_id",
            "in",
            client.from("seeds").select("id").eq("user_id", userId),
          );

        cleanedCounts.quizQuestions = orphanedQuizQuestions || 0;
      } catch (error) {
        errors.push(`Failed to clean orphaned quiz questions: ${error}`);
      }

      // Clean up orphaned exam_seeds (seed_id references non-existent seed)
      try {
        const { count: orphanedExamSeeds } = await client
          .from("exam_seeds")
          .delete({ count: "exact" })
          .not(
            "seed_id",
            "in",
            client.from("seeds").select("id").eq("user_id", userId),
          );

        cleanedCounts.examSeeds = orphanedExamSeeds || 0;
      } catch (error) {
        errors.push(`Failed to clean orphaned exam_seeds: ${error}`);
      }

      // Clean up orphaned learning_sessions
      try {
        const { count: orphanedLearningSessions } = await client
          .from("learning_sessions")
          .delete({ count: "exact" })
          .not(
            "seed_id",
            "in",
            client.from("seeds").select("id").eq("user_id", userId),
          );

        cleanedCounts.learningSessions = orphanedLearningSessions || 0;
      } catch (error) {
        errors.push(`Failed to clean orphaned learning_sessions: ${error}`);
      }

      const totalCleaned = Object.values(cleanedCounts).reduce(
        (sum, count) => sum + count,
        0,
      );

      return { cleanedCounts, errors };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown cleanup error";
      errors.push(`Cleanup operation failed: ${errorMessage}`);
      logger.error("[CleanupService] Cleanup operation failed:", error);

      return { cleanedCounts, errors };
    }
  }

  /**
   * Get database statistics for monitoring
   */
  async getDatabaseStats(userId: string): Promise<{
    recordCounts: {
      seeds: number;
      flashcards: number;
      quizQuestions: number;
      examSeeds: number;
      learningSessions: number;
      exams: number;
    };
    error?: string;
  }> {
    try {
      const client = this.getClient();

      // First get user's seed IDs
      const { data: userSeeds, error: seedsError } = await client
        .from("seeds")
        .select("id")
        .eq("user_id", userId);

      if (seedsError) {
        return {
          recordCounts: {
            seeds: 0,
            flashcards: 0,
            quizQuestions: 0,
            examSeeds: 0,
            learningSessions: 0,
            exams: 0,
          },
          error: seedsError.message,
        };
      }

      const seedIds = userSeeds?.map((seed) => seed.id) || [];

      const [
        seedsResult,
        flashcardsResult,
        quizQuestionsResult,
        examSeedsResult,
        learningSessionsResult,
        examsResult,
      ] = await Promise.all([
        client
          .from("seeds")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        seedIds.length > 0
          ? client
            .from("flashcards")
            .select("id", { count: "exact", head: true })
            .in("seed_id", seedIds)
          : Promise.resolve({ count: 0 }),
        seedIds.length > 0
          ? client
            .from("quiz_questions")
            .select("id", { count: "exact", head: true })
            .in("seed_id", seedIds)
          : Promise.resolve({ count: 0 }),
        client
          .from("exam_seeds")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        seedIds.length > 0
          ? client
            .from("learning_sessions")
            .select("id", { count: "exact", head: true })
            .in("seed_id", seedIds)
          : Promise.resolve({ count: 0 }),
        client
          .from("exams")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
      ]);

      const recordCounts = {
        seeds: seedsResult.count || 0,
        flashcards: flashcardsResult.count || 0,
        quizQuestions: quizQuestionsResult.count || 0,
        examSeeds: examSeedsResult.count || 0,
        learningSessions: learningSessionsResult.count || 0,
        exams: examsResult.count || 0,
      };

      return { recordCounts };
    } catch (error) {
      return {
        recordCounts: {
          seeds: 0,
          flashcards: 0,
          quizQuestions: 0,
          examSeeds: 0,
          learningSessions: 0,
          exams: 0,
        },
        error:
          error instanceof Error
            ? error.message
            : "Failed to get database stats",
      };
    }
  }
}

export const cleanupService = new CleanupService();
