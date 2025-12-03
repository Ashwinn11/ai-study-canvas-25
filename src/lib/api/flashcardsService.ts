import { ServiceError } from "./serviceError";
import { Flashcard, LearningSessionRecord } from "@/types";
import {
  contentGeneratorService,
  FlashcardGenerationBundle,
} from "./contentGenerator";
import { logger } from "@/utils/logger";
import { spacedRepetitionService, SpacedRepetitionService } from "./spacedRepetitionService";
// QA judge removed - AI prompts enforce quality via temperature 0.1 and structured schemas


export interface FlashcardsServiceResult<T = any> {
  data?: T;
  error?: string;
}

export interface CreateFlashcardsRequest {
  seedId: string;
  userId: string;
  quantity?: number;
  onProgress?: (progress: number, message: string) => void;
  _skipDuplicateCheck?: boolean; // Internal flag for background processor
}

export class FlashcardsService {
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

  async getFlashcardsBySeed(
    seedId: string,
    userId: string,
  ): Promise<FlashcardsServiceResult<Flashcard[]>> {
    try {
      // Always verify authentication - no skipAuth
      const { data: sessionData, error: authError } =
        await this.getSupabase().auth.getSession();
      const authUser = sessionData?.session?.user;

      if (authError || !authUser) {
        logger.error("[FlashcardsService] Authentication error:", authError);
        throw new ServiceError(
          "User not authenticated",
          "flashcardsService",
          "AUTH_ERROR",
          "Please log in to access flashcards",
          false,
        );
      }

      if (authUser.id !== userId) {
        logger.error("[FlashcardsService] User ID mismatch:", {
          authUserId: authUser.id,
          requestUserId: userId,
        });
        throw new ServiceError(
          "User ID mismatch",
          "flashcardsService",
          "USER_MISMATCH",
          "Authentication error occurred",
          false,
        );
      }


      const { data, error } = await this.getSupabase()
        .from("flashcards")
        .select("*")
        .eq("seed_id", seedId)
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) {
        logger.error("[FlashcardsService] Database error:", error);
        return {
          error: `Failed to load flashcards: ${error.message}`,
        };
      }

      return { data: data || [] };
    } catch (err) {
      logger.error("[FlashcardsService] Error getting flashcards:", err);
      return {
        error: err instanceof Error ? err.message : "Failed to load flashcards",
      };
    }
  }

  async createFlashcards(
    request: CreateFlashcardsRequest,
  ): Promise<FlashcardsServiceResult<Flashcard[]>> {
    try {
      // Always verify authentication - no skipAuth
      const { data: sessionData, error: authError } =
        await this.getSupabase().auth.getSession();
      const authUser = sessionData?.session?.user;

      if (authError || !authUser) {
        logger.error("[FlashcardsService] Authentication error:", authError);
        throw new ServiceError(
          "User not authenticated",
          "flashcardsService",
          "AUTH_ERROR",
          "Please log in to generate flashcards",
          false,
        );
      }

      if (authUser.id !== request.userId) {
        logger.error("[FlashcardsService] User ID mismatch:", {
          authUserId: authUser.id,
          requestUserId: request.userId,
        });
        throw new ServiceError(
          "User ID mismatch",
          "flashcardsService",
          "USER_MISMATCH",
          "Authentication error occurred",
          false,
        );
      }


      // Only check for duplicates if NOT called from background processor
      if (!request._skipDuplicateCheck) {
        // AUTO-CANCEL: Cancel queued task if exists (manual generation takes priority)
        const { backgroundProcessor } = require('./backgroundProcessor');
        const canceledQueued = backgroundProcessor.cancelRedundantTask(
          request.seedId,
          request.userId,
          'flashcards',
        );

        if (canceledQueued) {
          logger.info(`[FlashcardsService] Canceled redundant queued task for seed ${request.seedId}`);
        }

        // CHECK RUNNING OR QUEUED: Prevent concurrent manual + background generation
        const taskState = backgroundProcessor.getTaskState(
          request.seedId,
          request.userId,
          'flashcards',
        );

        if (taskState.status === 'running' || taskState.status === 'queued') {
          logger.warn(
            `[FlashcardsService] Flashcards already ${taskState.status} for ${request.seedId}`,
          );
          return {
            error:
              taskState.status === 'running'
                ? 'Flashcards are already being generated in the background. Please wait for completion.'
                : 'Flashcards are queued for generation. Please wait for the background task to start.',
          };
        }
      }

      // Check if flashcards already exist for this seed – no regeneration logic
      const existingResult = await this.getFlashcardsBySeed(
        request.seedId,
        request.userId,
      );
      if (existingResult.data && existingResult.data.length > 0) {
        try {
          const { backgroundProcessor } = require("./backgroundProcessor");
          backgroundProcessor.clearSeedFailures(
            request.seedId,
            request.userId,
            "flashcards",
          );
        } catch (clearError) {
          logger.warn(
            "[FlashcardsService] Warning: Failed to clear background failures:",
            clearError,
          );
        }
        return { data: existingResult.data };
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
        logger.error("[FlashcardsService] Error getting seed:", seedError);
        return {
          error: "Failed to find the source content for flashcard generation",
        };
      }

      // Report progress - content retrieved
      request.onProgress?.(0.2, 'Analyzing content...');

      // Generate flashcards using AI - generate first, then replace existing
      const generationBundle =
        await contentGeneratorService.generateFlashcardsFromSeed(
          seedData,
          request.userId,
          request.quantity,
          (progress, message) => {
            // Map contentGenerator progress (0-1) to our range (0.2-0.7)
            request.onProgress?.(0.2 + progress * 0.5, message);
          }
        );

      logger.debug('[FlashcardsService] generationBundle:', generationBundle);

      let generatedFlashcards = [...(generationBundle?.flashcards || [])];
      logger.debug('[FlashcardsService] generatedFlashcards before filter:', {
        length: generatedFlashcards.length,
        first: generatedFlashcards[0],
        sample: generatedFlashcards.slice(0, 2),
      });

      // Filter out any invalid flashcards (missing required fields)
      generatedFlashcards = generatedFlashcards.filter((fc, index) => {
        if (!fc || typeof fc !== 'object') {
          logger.warn(`[FlashcardsService] Skipping invalid flashcard at index ${index}: not an object`, fc);
          return false;
        }
        if (!fc.question || !fc.answer) {
          logger.warn(`[FlashcardsService] Skipping invalid flashcard at index ${index}: missing question or answer`, {
            has_question: !!fc.question,
            has_answer: !!fc.answer,
            keys: Object.keys(fc),
          });
          return false;
        }
        return true;
      });

      logger.debug('[FlashcardsService] generatedFlashcards after filter:', {
        length: generatedFlashcards.length,
        first: generatedFlashcards[0],
      });

      // Trust AI-generated content (prompts are language-aware and enforce quality)
      // Only check minimum count to catch technical failures (network/parsing errors)
      const MIN_FLASHCARDS = 5;
      if (generatedFlashcards.length < MIN_FLASHCARDS) {
        logger.error(
          `[FlashcardsService] Insufficient flashcards generated: ${generatedFlashcards.length}/${MIN_FLASHCARDS} required`,
        );
        throw new ServiceError(
          "Insufficient flashcard generation",
          "flashcardsService",
          "LOW_COUNT",
          `Only ${generatedFlashcards.length} flashcards generated (minimum ${MIN_FLASHCARDS} required). Content may be too short for meaningful study materials.`,
          true,
        );
      }


      // Log final count - AI-only, no fallback top-ups

      // Report progress - saving to database
      request.onProgress?.(0.9, 'Saving flashcards...');

      // OFFLINE FIX: Re-validate auth before DB insert using local session
      // Use getSession() to avoid network call when offline
      const { data: revalidateAuth, error: revalidateError } =
        await this.getSupabase().auth.getSession();

      if (revalidateError || !revalidateAuth?.session?.user) {
        logger.error('[FlashcardsService] Auth expired during generation');
        throw new ServiceError(
          'Authentication expired during generation',
          'flashcardsService',
          'AUTH_EXPIRED',
          'Your session expired. Please log in again and retry.',
          true, // Retryable - user can log in and retry
        );
      }

      if (revalidateAuth.session.user.id !== request.userId) {
        logger.error('[FlashcardsService] User mismatch after revalidation');
        throw new ServiceError(
          'User ID mismatch after auth revalidation',
          'flashcardsService',
          'USER_MISMATCH',
          'Authentication error occurred during generation.',
          false,
        );
      }

      // Save flashcards to database with SM2 initialization
      logger.debug('[FlashcardsService] About to map flashcards to insert format');
      let flashcardsToInsert;
      try {
        flashcardsToInsert = generatedFlashcards.map((fc, index) => {
          logger.debug(`[FlashcardsService] Mapping flashcard ${index}:`, {
            has_question: !!fc.question,
            has_answer: !!fc.answer,
            has_difficulty: !!fc.difficulty,
          });
          return {
            seed_id: request.seedId,
            user_id: request.userId,
            question: fc.question,
            answer: fc.answer,
            difficulty: fc.difficulty ?? 3,  // Default to medium difficulty if not specified
            // Initialize SM2 fields for new flashcards
            interval: 1,
            repetitions: 0,
            easiness_factor: 2.5,
            next_due_date: new Date().toISOString().split("T")[0], // Due today
            streak: 0,
            lapses: 0,
          };
        });
        logger.debug('[FlashcardsService] Successfully mapped flashcards:', { count: flashcardsToInsert.length });
      } catch (mapError) {
        logger.error('[FlashcardsService] Error mapping flashcards:', mapError);
        throw mapError;
      }

      const { data, error } = await this.getSupabase()
        .from("flashcards")
        .insert(flashcardsToInsert)
        .select();

      if (error) {
        // Check if error is due to unique constraint violation (duplicate from race condition)
        if (error.code === '23505' && error.message.includes('flashcards_seed_user_question_unique')) {
          logger.warn(
            "[FlashcardsService] Duplicate flashcards detected (race condition), fetching existing ones",
          );
          // Fetch existing flashcards instead of failing
          const existing = await this.getFlashcardsBySeed(request.seedId, request.userId);
          try {
            const { backgroundProcessor } = require('./backgroundProcessor');
            backgroundProcessor.clearSeedFailures(
              request.seedId,
              request.userId,
              'flashcards',
            );
          } catch (clearError) {
            logger.warn(
              "[FlashcardsService] Warning: Failed to clear background failures:",
              clearError,
            );
          }
          return { data: existing.data || [] };
        }

        logger.error("[FlashcardsService] Error saving flashcards:", error);
        return {
          error: `Failed to save flashcards: ${error.message}`,
        };
      }

      // Validate that inserted data has required fields (especially id)
      logger.debug('[FlashcardsService] Supabase insert response:', {
        count: data?.length,
        first: data?.[0],
        sample: data?.slice(0, 2),
      });

      if (!data || data.length === 0) {
        logger.error('[FlashcardsService] Insert returned no data');
        return {
          error: 'Failed to insert flashcards (no data returned)',
        };
      }

      // Validate that all returned items have id
      const invalidItems = data.filter((item: any) => !item.id);
      if (invalidItems.length > 0) {
        logger.error('[FlashcardsService] Returned items missing id field:', invalidItems);
        return {
          error: 'Failed to insert flashcards (missing id in response)',
        };
      }

      // Report progress - complete
      request.onProgress?.(1.0, 'Flashcards ready!');

      try {
        const { backgroundProcessor } = require('./backgroundProcessor');
        backgroundProcessor.clearSeedFailures(
          request.seedId,
          request.userId,
          'flashcards',
        );
      } catch (clearError) {
        logger.warn(
          "[FlashcardsService] Warning: Failed to clear background failures:",
          clearError,
        );
      }

      return { data: data || [] };
    } catch (err) {
      logger.error("[FlashcardsService] Error creating flashcards:", err);

      // Capture full stack trace for debugging
      if (err instanceof Error) {
        logger.error("[FlashcardsService] Stack trace:", err.stack);
      }

      if (err instanceof ServiceError) {
        return {
          error: err.userMessage || err.message,
        };
      }

      return {
        error:
          err instanceof Error ? err.message : "Failed to create flashcards",
      };
    }
  }

  async updateFlashcard(
    flashcardId: string,
    updates: Partial<Flashcard>,
  ): Promise<FlashcardsServiceResult<Flashcard>> {
    try {
      const { data, error } = await this.getSupabase()
        .from("flashcards")
        .update(updates)
        .eq("id", flashcardId)
        .select()
        .single();

      if (error) {
        logger.error("[FlashcardsService] Error updating flashcard:", error);
        return {
          error: `Failed to update flashcard: ${error.message}`,
        };
      }

      return { data };
    } catch (err) {
      logger.error("[FlashcardsService] Error updating flashcard:", err);
      return {
        error:
          err instanceof Error ? err.message : "Failed to update flashcard",
      };
    }
  }

  async deleteFlashcard(
    flashcardId: string,
  ): Promise<FlashcardsServiceResult<void>> {
    try {
      const { error } = await this.getSupabase()
        .from("flashcards")
        .delete()
        .eq("id", flashcardId);

      if (error) {
        logger.error("[FlashcardsService] Error deleting flashcard:", error);
        return {
          error: `Failed to delete flashcard: ${error.message}`,
        };
      }

      return { data: undefined };
    } catch (err) {
      logger.error("[FlashcardsService] Error deleting flashcard:", err);
      return {
        error:
          err instanceof Error ? err.message : "Failed to delete flashcard",
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
      metadata?: Record<string, any>;
    },
  ): Promise<FlashcardsServiceResult<LearningSessionRecord>> {
    try {
      // Score as decimal 0.0-1.0 (NOT percentage) per database constraint
      const score =
        sessionData.totalItems > 0
          ? sessionData.correctItems / sessionData.totalItems
          : 0;

      const sessionRecord = {
        user_id: userId,
        seed_id: seedId,
        session_type: "flashcards" as const,
        total_items: sessionData.totalItems,
        correct_items: sessionData.correctItems,
        score,
        time_spent: sessionData.timeSpent,
        metadata: {
          ...sessionData.metadata,
          source: sessionData.metadata?.source || "individual-practice",
        },
        completed_at: new Date().toISOString(),
      };

      const { data, error } = await this.getSupabase()
        .from("learning_sessions")
        .insert(sessionRecord)
        .select()
        .single();

      if (error) {
        logger.error("[FlashcardsService] Error saving session:", error);
        return {
          error: `Failed to save learning session: ${error.message}`,
        };
      }

      return { data };
    } catch (err) {
      logger.error("[FlashcardsService] Error creating session:", err);
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
  ): Promise<FlashcardsServiceResult<LearningSessionRecord[]>> {
    try {
      const { data, error } = await this.getSupabase()
        .from("learning_sessions")
        .select("*")
        .eq("seed_id", seedId)
        .eq("user_id", userId)
        .eq("session_type", "flashcards")
        .order("completed_at", { ascending: false });

      if (error) {
        logger.error("[FlashcardsService] Error getting history:", error);
        return {
          error: `Failed to load learning history: ${error.message}`,
        };
      }

      return { data: data || [] };
    } catch (err) {
      logger.error("[FlashcardsService] Error getting history:", err);
      return {
        error:
          err instanceof Error
            ? err.message
            : "Failed to load learning history",
      };
    }
  }

  async deleteAllFlashcards(
    seedId: string,
    userId: string,
  ): Promise<FlashcardsServiceResult<void>> {
    try {
      const { error } = await this.getSupabase()
        .from("flashcards")
        .delete()
        .eq("seed_id", seedId)
        .eq("user_id", userId);

      if (error) {
        logger.error("[FlashcardsService] Error deleting flashcards:", error);
        return {
          error: `Failed to delete flashcards: ${error.message}`,
        };
      }

      return { data: undefined };
    } catch (err) {
      logger.error("[FlashcardsService] Error deleting flashcards:", err);
      return {
        error:
          err instanceof Error ? err.message : "Failed to delete flashcards",
      };
    }
  }

  async regenerateFlashcards(
    seedId: string,
    userId: string,
    quantity?: number,
  ): Promise<FlashcardsServiceResult<Flashcard[]>> {
    try {
      // No regeneration; return existing or create if missing
      return await this.createFlashcards({
        seedId,
        userId,
        quantity,
      });
    } catch (err) {
      logger.error("[FlashcardsService] Error regenerating flashcards:", err);
      return {
        error:
          err instanceof Error
            ? err.message
            : "Failed to regenerate flashcards",
      };
    }
  }
  async reviewFlashcard(
    flashcardId: string,
    direction: 'left' | 'right' | 'up',
    qualityOverride?: number,
  ): Promise<FlashcardsServiceResult<void>> {
    try {
      const qualityMap: Record<'left' | 'right' | 'up', number> = {
        left: SpacedRepetitionService.QUALITY_SCALE.FORGOT,
        up: SpacedRepetitionService.QUALITY_SCALE.SOMEWHAT,
        right: SpacedRepetitionService.QUALITY_SCALE.CONFIDENT,
      };

      const quality =
        qualityOverride ??
        qualityMap[direction] ??
        SpacedRepetitionService.QUALITY_SCALE.SOMEWHAT;

      const { error } = await spacedRepetitionService.updateFlashcardSM2(
        flashcardId,
        quality,
      );

      if (error) {
        logger.error("[FlashcardsService] Error reviewing flashcard:", error);
        return {
          error,
        };
      }

      return { data: undefined };
    } catch (err) {
      logger.error("[FlashcardsService] Error reviewing flashcard:", err);
      return {
        error:
          err instanceof Error
            ? err.message
            : "Failed to review flashcard",
      };
    }
  }
}

// Export a singleton instance
export const flashcardsService = new FlashcardsService();
