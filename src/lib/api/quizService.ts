import { ServiceError } from "./serviceError";
import { QuizQuestion, QuizAttempt, LearningSessionRecord } from "@/types";
import {
  contentGeneratorService,
  QuizGenerationBundle,
} from "./contentGenerator";
import { DistributedLockService } from "./distributedLock";
import { logger } from "@/utils/logger";
import { safeJSONParse } from "@/utils/safeJson";
import { spacedRepetitionService } from "./spacedRepetitionService";
import { ErrorHandler } from "@/utils/errorHandler";
// QA judge removed - AI prompts enforce quality via temperature 0.1, Bloom taxonomy, and structured schemas

export interface QuizServiceResult<T = any> {
  data?: T;
  error?: string;
}

export interface CreateQuizRequest {
  seedId: string;
  userId: string;
  quantity?: number;
  onProgress?: (progress: number, message: string) => void;
  _skipDuplicateCheck?: boolean; // Internal flag for background processor
}

export interface QuizSession {
  id: string;
  questions: QuizQuestion[];
  attempts: QuizAttempt[];
  startTime: string;
  endTime?: string;
  score?: number;
}

export class QuizService {
  private supabase: any;

  constructor() {
    // Supabase client is injected via setSupabase() when service is used
  }

  setSupabase(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  private getSupabase() {
    if (!this.supabase) {
      const { supabase: client } = require('./supabaseWithTimeout');
      this.supabase = client;
    }
    return this.supabase;
  }

  async getQuizQuestionsBySeed(
    seedId: string,
    userId: string,
  ): Promise<QuizServiceResult<QuizQuestion[]>> {
    try {
      // Always verify authentication - no skipAuth
      const { data: sessionData, error: authError } =
        await this.getSupabase().auth.getSession();
      const authUser = sessionData?.session?.user;

      if (authError || !authUser) {
        logger.error("[QuizService] Authentication error:", authError);
        throw new ServiceError(
          "User not authenticated",
          "quizService",
          "AUTH_ERROR",
          "Please log in to access quiz questions",
          false,
        );
      }

      if (authUser.id !== userId) {
        logger.error("[QuizService] User ID mismatch:", {
          authUserId: authUser.id,
          requestUserId: userId,
        });
        throw new ServiceError(
          "User ID mismatch",
          "quizService",
          "USER_MISMATCH",
          "Authentication error occurred",
          false,
        );
      }


      const { data, error } = await this.getSupabase()
        .from("quiz_questions")
        .select("*")
        .eq("seed_id", seedId)
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) {
        logger.error("[QuizService] Database error:", error);
        return {
          error: `Failed to load quiz questions: ${error.message}`,
        };
      }


      // Ensure options are properly parsed as arrays (JSONB from database)
      if (data && data.length > 0) {
        data.forEach((question: any, index: number) => {
          if (typeof question.options === "string") {
            const parsed = safeJSONParse(question.options, [], `quizService.getQuizzes[${index}]`);
            if (!Array.isArray(parsed)) {
              ErrorHandler.handleParsingError(
                new Error('Question options is not an array'),
                `quizService.getQuizzes[${index}]`,
                { severity: 'medium', additionalInfo: { questionId: question.id } }
              );
              question.options = [];
            } else {
              question.options = parsed;
            }
          }
          // Ensure options is always an array
          if (!Array.isArray(question.options)) {
            logger.warn(
              "[QuizService] Options is not an array for question",
              index,
              typeof question.options,
            );
            question.options = [];
          }
        });
      }

      return { data: data || [] };
    } catch (err) {
      logger.error("[QuizService] Error getting quiz questions:", err);
      return {
        error:
          err instanceof Error ? err.message : "Failed to load quiz questions",
      };
    }
  }

  async createQuizQuestions(
    request: CreateQuizRequest,
  ): Promise<QuizServiceResult<QuizQuestion[]>> {
    try {
      // Always verify authentication - no skipAuth
      const { data: sessionData, error: authError } =
        await this.getSupabase().auth.getSession();
      const authUser = sessionData?.session?.user;

      if (authError || !authUser) {
        logger.error("[QuizService] Authentication error:", authError);
        throw new ServiceError(
          "User not authenticated",
          "quizService",
          "AUTH_ERROR",
          "Please log in to generate quiz questions",
          false,
        );
      }

      if (authUser.id !== request.userId) {
        logger.error("[QuizService] User ID mismatch:", {
          authUserId: authUser.id,
          requestUserId: request.userId,
        });
        throw new ServiceError(
          "User ID mismatch",
          "quizService",
          "USER_MISMATCH",
          "Authentication error occurred",
          false,
        );
      }


      // DISTRIBUTED LOCK CHECK: Works across all devices/sessions
      const lockService = new DistributedLockService(this.getSupabase());
      const existingLock = await lockService.hasActiveLock(request.seedId, request.userId);

      if (existingLock.hasLock) {
        // Check if it's a quiz lock or both
        if (existingLock.lockType === 'quiz' || existingLock.lockType === 'both') {
          logger.warn(
            `[QuizService] Quiz generation already ${existingLock.status} (lock type: ${existingLock.lockType})`,
          );

          // If we're being called from background processor with skip check, release old lock and continue
          if (request._skipDuplicateCheck) {
            const lock = await lockService.getLock(request.seedId, request.userId, 'quiz') ||
              await lockService.getLock(request.seedId, request.userId, 'both');
            // Only proceed if we own the lock or it's expired
            if (!lock) {
              logger.info(`[QuizService] No existing lock found for seed ${request.seedId}, proceeding with generation`);
            }
          } else {
            // Manual generation - block if another process is working
            return {
              error: existingLock.status === 'running'
                ? 'Quiz is already being generated. Please wait for completion.'
                : 'Quiz generation is queued. Please wait...',
            };
          }
        }
      }

      // Only check in-memory state if NOT called from background processor
      if (!request._skipDuplicateCheck) {
        // AUTO-CANCEL: Cancel queued task if exists (manual generation takes priority)
        const { backgroundProcessor } = require('./backgroundProcessor');
        const canceledQueued = backgroundProcessor.cancelRedundantTask(
          request.seedId,
          request.userId,
          'quiz',
        );

        if (canceledQueued) {
          logger.info(`[QuizService] Canceled redundant queued task for seed ${request.seedId}`);
        }

        // CHECK RUNNING OR QUEUED: Prevent concurrent manual + background generation in same runtime
        const taskState = backgroundProcessor.getTaskState(
          request.seedId,
          request.userId,
          'quiz',
        );

        if (taskState.status === 'running' || taskState.status === 'queued') {
          logger.warn(
            `[QuizService] Quiz already ${taskState.status} in this runtime for ${request.seedId}`,
          );
          return {
            error:
              taskState.status === 'running'
                ? 'Quiz is already being generated in the background. Please wait for completion.'
                : 'Quiz is queued for generation. Please wait for the background task to start.',
          };
        }
      }

      // Check if quiz questions already exist for this seed – no regeneration logic
      const existingResult = await this.getQuizQuestionsBySeed(
        request.seedId,
        request.userId,
      );
      if (existingResult.data && existingResult.data.length > 0) {
        try {
          const { backgroundProcessor } = require("./backgroundProcessor");
          backgroundProcessor.clearSeedFailures(
            request.seedId,
            request.userId,
            "quiz",
          );
        } catch (clearError) {
          logger.warn(
            "[QuizService] Warning: Failed to clear background failures:",
            clearError,
          );
        }
        return existingResult;
      }

      // ACQUIRE DISTRIBUTED LOCK before starting generation
      let lock = null;
      if (!request._skipDuplicateCheck) {
        // Manual generation - acquire lock to prevent cross-device races
        lock = await lockService.acquireLock(request.seedId, request.userId, 'quiz');
        if (!lock) {
          logger.warn('[QuizService] Failed to acquire distributed lock - another device is generating');
          return {
            error: 'Another device is currently generating this quiz. Please wait and refresh...',
          };
        }
      }

      try {
        // Update lock status to running
        if (lock) {
          await lockService.updateLockStatus(lock.id, 'running');
        }

        // Report progress - starting generation
        request.onProgress?.(0.1, 'Preparing content...');

        // Get seed data for generation
        const { data: seedData, error: seedError } = await this.getSupabase()
          .from("seeds")
          .select("*")
          .eq("id", request.seedId)
          .eq("user_id", request.userId)
          .single();

        if (seedError || !seedData) {
          logger.error("[QuizService] Error getting seed:", seedError);
          if (lock) {
            await lockService.releaseLock(lock.id, false, "Failed to find seed data");
          }
          return {
            error: "Failed to find the source content for quiz generation",
          };
        }

        // Report progress - content retrieved
        request.onProgress?.(0.2, 'Analyzing content...');

        // Generate quiz questions using AI - generate first, then replace
        const generationBundle =
          await contentGeneratorService.generateQuizFromSeed(
            seedData,
            request.userId,
            request.quantity,
            (progress, message) => {
              // Map contentGenerator progress (0-1) to our range (0.2-0.7)
              request.onProgress?.(0.2 + progress * 0.5, message);
            }
          );

        const generatedQuestions = [...generationBundle.quizQuestions];

        // Trust AI-generated content (prompts enforce Bloom taxonomy, 4 options, clear explanations)
        // Only check minimum count to catch technical failures (network/parsing errors)
        const MIN_QUESTIONS = 3;
        if (generatedQuestions.length < MIN_QUESTIONS) {
          logger.error(
            `[QuizService] Insufficient questions generated: ${generatedQuestions.length}/${MIN_QUESTIONS} required`,
          );
          throw new ServiceError(
            "Insufficient quiz generation",
            "quizService",
            "LOW_COUNT",
            `Only ${generatedQuestions.length} quiz questions generated (minimum ${MIN_QUESTIONS} required). Content may be too short for meaningful assessment.`,
            true,
          );
        }


        // Log final count - AI-only, no fallback top-ups

        // Report progress - saving to database
        request.onProgress?.(0.9, 'Saving quiz questions...');

        // Re-validate auth before DB insert (token may have expired during generation)
        const { data: revalidateAuth, error: revalidateError } =
          await this.getSupabase().auth.getUser();

        if (revalidateError || !revalidateAuth?.user) {
          logger.error('[QuizService] Auth expired during generation');
          throw new ServiceError(
            'Authentication expired during generation',
            'quizService',
            'AUTH_EXPIRED',
            'Your session expired. Please log in again and retry.',
            true, // Retryable - user can log in and retry
          );
        }

        if (revalidateAuth.user.id !== request.userId) {
          logger.error('[QuizService] User mismatch after revalidation');
          throw new ServiceError(
            'User ID mismatch after auth revalidation',
            'quizService',
            'USER_MISMATCH',
            'Authentication error occurred during generation.',
            false,
          );
        }

        // Never delete existing questions here; replacement only happens on seed deletion

        // Save quiz questions to database with SM2 initialization
        const questionsToInsert = generatedQuestions.map((q) => ({
          seed_id: request.seedId,
          user_id: request.userId,
          question: q.question,
          options: q.options,
          correct_answer: q.correct_answer,
          difficulty: q.difficulty,
          // Initialize SM2 fields for new quiz questions
          interval: 1,
          repetitions: 0,
          easiness_factor: 2.5,
          next_due_date: new Date().toISOString().split("T")[0], // Due today
          streak: 0,
          lapses: 0,
        }));

        const { data, error } = await this.getSupabase()
          .from("quiz_questions")
          .insert(questionsToInsert)
          .select();

        if (error) {
          // Check if error is due to unique constraint violation (duplicate from race condition)
          if (error.code === '23505' && error.message.includes('quiz_questions_seed_user_question_unique')) {
            logger.warn(
              "[QuizService] Duplicate quiz questions detected (race condition), fetching existing ones",
            );
            // Fetch existing quiz questions instead of failing
            const existing = await this.getQuizQuestionsBySeed(request.seedId, request.userId);
            try {
              const { backgroundProcessor } = require('./backgroundProcessor');
              backgroundProcessor.clearSeedFailures(
                request.seedId,
                request.userId,
                'quiz',
              );
            } catch (clearError) {
              logger.warn(
                "[QuizService] Warning: Failed to clear background failures:",
                clearError,
              );
            }
            return existing;
          }

          logger.error("[QuizService] Error saving quiz questions:", error);
          return {
            error: `Failed to save quiz questions: ${error.message}`,
          };
        }


        // Report progress - complete
        request.onProgress?.(1.0, 'Quiz questions ready!');

        try {
          const { backgroundProcessor } = require('./backgroundProcessor');
          backgroundProcessor.clearSeedFailures(
            request.seedId,
            request.userId,
            'quiz',
          );
        } catch (clearError) {
          logger.warn(
            "[QuizService] Warning: Failed to clear background failures:",
            clearError,
          );
        }

        // SUCCESS - Release lock
        if (lock) {
          await lockService.releaseLock(lock.id, true);
        }

        return { data: data || [] };

      } catch (generationError) {
        // FAILURE - Release lock with error
        logger.error("[QuizService] Error during quiz generation:", generationError);

        if (lock) {
          const errorMsg = generationError instanceof Error ? generationError.message : 'Unknown error';
          await lockService.releaseLock(lock.id, false, errorMsg);
        }

        throw generationError; // Re-throw to outer catch
      }
    } catch (err) {
      logger.error("[QuizService] Error creating quiz questions:", err);

      if (err instanceof ServiceError) {
        return {
          error: err.userMessage || err.message,
        };
      }

      return {
        error:
          err instanceof Error
            ? err.message
            : "Failed to create quiz questions",
      };
    }
  }

  async updateQuizQuestion(
    questionId: string,
    updates: Partial<QuizQuestion>,
  ): Promise<QuizServiceResult<QuizQuestion>> {
    try {
      const { data, error } = await this.getSupabase()
        .from("quiz_questions")
        .update(updates)
        .eq("id", questionId)
        .select()
        .single();

      if (error) {
        logger.error("[QuizService] Error updating quiz question:", error);
        return {
          error: `Failed to update quiz question: ${error.message}`,
        };
      }

      return { data };
    } catch (err) {
      logger.error("[QuizService] Error updating quiz question:", err);
      return {
        error:
          err instanceof Error ? err.message : "Failed to update quiz question",
      };
    }
  }

  async deleteQuizQuestion(
    questionId: string,
  ): Promise<QuizServiceResult<void>> {
    try {
      const { error } = await this.getSupabase()
        .from("quiz_questions")
        .delete()
        .eq("id", questionId);

      if (error) {
        logger.error("[QuizService] Error deleting quiz question:", error);
        return {
          error: `Failed to delete quiz question: ${error.message}`,
        };
      }

      return { data: undefined };
    } catch (err) {
      logger.error("[QuizService] Error deleting quiz question:", err);
      return {
        error:
          err instanceof Error ? err.message : "Failed to delete quiz question",
      };
    }
  }

  async createLearningSession(
    seedId: string,
    userId: string,
    sessionData: {
      totalItems: number;
      correctItems: number;
      timeSpent?: number;
      attempts?: QuizAttempt[];
      metadata?: Record<string, any>;
    },
  ): Promise<QuizServiceResult<LearningSessionRecord>> {
    try {
      // Score as decimal 0.0-1.0 (NOT percentage) per database constraint
      const score =
        sessionData.totalItems > 0
          ? sessionData.correctItems / sessionData.totalItems
          : 0;

      const sessionRecord = {
        user_id: userId,
        seed_id: seedId,
        session_type: "quiz" as const,
        total_items: sessionData.totalItems,
        correct_items: sessionData.correctItems,
        score,
        time_spent: sessionData.timeSpent,
        metadata: {
          ...sessionData.metadata,
          source: sessionData.metadata?.source || "individual-practice",
          attempts: sessionData.attempts || [],
        },
        completed_at: new Date().toISOString(),
      };

      const { data, error } = await this.getSupabase()
        .from("learning_sessions")
        .insert(sessionRecord)
        .select()
        .single();

      if (error) {
        logger.error("[QuizService] Error saving session:", error);
        return {
          error: `Failed to save learning session: ${error.message}`,
        };
      }

      return { data };
    } catch (err) {
      logger.error("[QuizService] Error creating session:", err);
      return {
        error:
          err instanceof Error
            ? err.message
            : "Failed to save learning session",
      };
    }
  }

  async getLearningHistory(
    seedId: string,
    userId: string,
  ): Promise<QuizServiceResult<LearningSessionRecord[]>> {
    try {
      const { data, error } = await this.getSupabase()
        .from("learning_sessions")
        .select("*")
        .eq("seed_id", seedId)
        .eq("user_id", userId)
        .eq("session_type", "quiz")
        .order("completed_at", { ascending: false });

      if (error) {
        logger.error("[QuizService] Error getting history:", error);
        return {
          error: `Failed to load learning history: ${error.message}`,
        };
      }

      return { data: data || [] };
    } catch (err) {
      logger.error("[QuizService] Error getting history:", err);
      return {
        error:
          err instanceof Error
            ? err.message
            : "Failed to load learning history",
      };
    }
  }

  calculateQuizScore(attempts: QuizAttempt[]): {
    correct: number;
    total: number;
    percentage: number;
  } {
    const total = attempts.length;
    const correct = attempts.filter((attempt) => attempt.is_correct).length;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

    return { correct, total, percentage };
  }

  async getQuizStatistics(
    seedId: string,
    userId: string,
  ): Promise<
    QuizServiceResult<{
      totalAttempts: number;
      averageScore: number;
      bestScore: number;
      totalTimeSpent: number;
      lastAttempt?: string;
    }>
  > {
    try {

      const historyResult = await this.getLearningHistory(seedId, userId);
      if (historyResult.error || !historyResult.data) {
        return { error: historyResult.error || "Failed to get statistics" };
      }

      const sessions = historyResult.data;

      if (sessions.length === 0) {
        return {
          data: {
            totalAttempts: 0,
            averageScore: 0,
            bestScore: 0,
            totalTimeSpent: 0,
          },
        };
      }

      const totalAttempts = sessions.length;
      const scores = sessions.map((s) => s.score || 0);
      const averageScore = Math.round(
        scores.reduce((sum, score) => sum + score, 0) / totalAttempts,
      );
      const bestScore = Math.max(...scores);
      const totalTimeSpent = sessions.reduce(
        (sum, s) => sum + (s.time_spent || 0),
        0,
      );
      const lastAttempt = sessions[0]?.completed_at; // Most recent (already ordered by desc)

      return {
        data: {
          totalAttempts,
          averageScore,
          bestScore,
          totalTimeSpent,
          lastAttempt,
        },
      };
    } catch (err) {
      logger.error("[QuizService] Error getting statistics:", err);
      return {
        error:
          err instanceof Error ? err.message : "Failed to load quiz statistics",
      };
    }
  }

  async deleteAllQuizQuestions(
    seedId: string,
    userId: string,
  ): Promise<QuizServiceResult<void>> {
    try {
      const { error } = await this.getSupabase()
        .from("quiz_questions")
        .delete()
        .eq("seed_id", seedId)
        .eq("user_id", userId);

      if (error) {
        logger.error("[QuizService] Error deleting quiz questions:", error);
        return {
          error: `Failed to delete quiz questions: ${error.message}`,
        };
      }

      return { data: undefined };
    } catch (err) {
      logger.error("[QuizService] Error deleting quiz questions:", err);
      return {
        error:
          err instanceof Error
            ? err.message
            : "Failed to delete quiz questions",
      };
    }
  }

  async regenerateQuizQuestions(
    seedId: string,
    userId: string,
    quantity?: number,
  ): Promise<QuizServiceResult<QuizQuestion[]>> {
    try {

      return await this.createQuizQuestions({
        seedId,
        userId,
        quantity,
      });
    } catch (err) {
      logger.error("[QuizService] Error regenerating quiz questions:", err);
      return {
        error:
          err instanceof Error
            ? err.message
            : "Failed to regenerate quiz questions",
      };
    }
  }
  async reviewQuizQuestion(
    questionId: string,
    isCorrect: boolean,
  ): Promise<QuizServiceResult<void>> {
    try {
      const { error } = await spacedRepetitionService.updateQuizQuestionSM2(
        questionId,
        isCorrect,
      );

      if (error) {
        logger.error("[QuizService] Error reviewing quiz question:", error);
        return {
          error,
        };
      }

      return { data: undefined };
    } catch (err) {
      logger.error("[QuizService] Error reviewing quiz question:", err);
      return {
        error:
          err instanceof Error
            ? err.message
            : "Failed to review quiz question",
      };
    }
  }
}

// Export a singleton instance
export const quizService = new QuizService();
