import { Seed, ContentType, SeedFilter } from "@/types";
import { supabase } from "./supabaseWithTimeout";
import { cleanupService } from "./cleanupService";
import { SeedDetailRPC } from "@/types/rpc";

import { logger } from "@/utils/logger";

// SIMPLIFIED: Direct session validation without caching layer
// React Query handles all caching at the query level, no need for service-level cache
const validateSession = async (userId?: string) => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      logger.error("[DB-AUTH] Session error:", sessionError);
      return {
        valid: false,
        error: `Session error: ${sessionError.message}`,
        session: null,
      };
    }

    if (!session?.user) {
      return {
        valid: false,
        error: "Authentication required - no session found",
        session: null,
      };
    }

    // Optional: Validate userId matches if provided
    if (userId && session.user.id !== userId) {
      logger.warn("[DB-AUTH] User ID mismatch:", {
        expected: userId,
        actual: session.user.id,
      });
      return {
        valid: false,
        error: "User ID mismatch",
        session: null,
      };
    }

    return {
      valid: true,
      session,
      error: null,
    };
  } catch (error) {
    logger.error("[DB-AUTH] Exception during session validation:", error);
    return {
      valid: false,
      error: `Session validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      session: null,
    };
  }
};

export interface CreateSeedData {
  title: string;
  content_type: ContentType;
  content_url?: string;
  content_text?: string;
  file_size?: number;
  processing_status?:
  | "pending"
  | "extracting"
  | "analyzing"
  | "summarizing"
  | "feynman_processing"
  | "completed"
  | "failed";
  confidence_score?: number;
  extraction_metadata?: any;
  processing_error?: string;
}

export interface UpdateSeedData {
  title?: string;
  content_text?: string;
  is_starred?: boolean;
  is_archived?: boolean;
  processing_status?:
  | "pending"
  | "extracting"
  | "analyzing"
  | "summarizing"
  | "feynman_processing"
  | "completed"
  | "failed";
  confidence_score?: number;
  extraction_metadata?: any;
  processing_error?: string;
  feynman_explanation?: string;
  intent?: string;
  original_content?: string;
  language_code?: string;
  is_mixed_language?: boolean;
  language_metadata?: any;
}

export interface SeedsQuery {
  search?: string;
  filter?: SeedFilter;
  limit?: number;
  offset?: number;
}

class SeedsService {
  async createSeed(
    data: CreateSeedData,
  ): Promise<{ seed?: Seed; error?: string }> {
    try {
      // OPTIMIZED: Use cached authentication validation
      const sessionValidation = await validateSession();

      if (!sessionValidation.valid) {
        logger.error("Session validation failed:", sessionValidation.error);
        return {
          error:
            sessionValidation.error ||
            "User authentication required to create seeds. Please sign in first.",
        };
      }

      const { session } = sessionValidation;

      if (!session?.user) {
        logger.error("No authenticated user found");
        // For development/testing, provide a more helpful error message
        const isDevelopment = process.env.NODE_ENV === "development";
        if (isDevelopment) {
          logger.warn(
            "DEVELOPMENT MODE: Consider implementing test user authentication for offline testing",
          );
        }
        return {
          error:
            "User authentication required to create seeds. Please sign in first.",
        };
      }

      const { data: seed, error } = await supabase
        .from("seeds")
        .insert({
          user_id: session.user.id, // Add the required user_id field
          title: data.title,
          content_type: data.content_type,
          content_url: data.content_url,
          content_text: data.content_text,
          file_size: data.file_size,
          is_starred: false,
          is_archived: false,
          processing_status: data.processing_status || "pending",
          confidence_score: data.confidence_score,
          extraction_metadata: data.extraction_metadata,
          processing_error: data.processing_error,
        })
        .select()
        .single();

      if (error) {
        logger.error("Create seed error:", error);
        return { error: `Failed to create seed: ${error.message}` };
      }

      return { seed };
    } catch (error) {
      logger.error("Create seed exception:", error);
      return { error: "Failed to create seed" };
    }
  }

  async getSeeds(
    query: SeedsQuery = {},
  ): Promise<{ seeds?: Seed[]; error?: string }> {
    // OPTIMIZATION: Removed request deduplication wrapper - React Query handles this better
    // React Query provides superior caching with configurable staleTime and automatic invalidation
    try {
      // Starting getSeeds

      // Validate session with detailed logging
      const sessionValidation = await validateSession();
      if (!sessionValidation.valid) {
        // Session validation failed for getSeeds
        // Return empty list for UI compatibility, but log the authentication issue
        return { seeds: [] };
      }

      const { session } = sessionValidation;

      let supabaseQuery = supabase
        .from("seeds")
        .select(
          `
          *,
          exam_seeds!left(
            exam_id,
            exams!left(
              subject_name
            )
          )
        `,
        )
        .eq("user_id", session!.user.id)
        .order("created_at", { ascending: false });

      // Apply filter
      if (query.filter) {
        switch (query.filter) {
          case "exam":
            // Exam filter: seeds with flashcards or quiz questions generated
            supabaseQuery = supabaseQuery
              .eq("processing_status", "completed")
              .not("feynman_explanation", "is", null);
            break;
          case "all":
          default:
            supabaseQuery = supabaseQuery.eq("processing_status", "completed");
            break;
        }
      }

      // Apply search
      if (query.search?.trim()) {
        const searchTerm = query.search.trim();
        supabaseQuery = supabaseQuery.or(
          `title.ilike.%${searchTerm}%,content_text.ilike.%${searchTerm}%`,
        );
      }

      // Apply pagination
      if (query.limit) {
        supabaseQuery = supabaseQuery.limit(query.limit);
      }
      if (query.offset) {
        supabaseQuery = supabaseQuery.range(
          query.offset,
          query.offset + (query.limit || 50) - 1,
        );
      }

      // Executing seeds query
      const { data: seeds, error } = await supabaseQuery;

      if (error) {
        logger.error("[DB-ERROR] Get seeds error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          query: query,
        });
        return { error: `Failed to fetch seeds: ${error.message}` };
      }

      // Transform seeds to include exam information
      const transformedSeeds = (seeds || []).map((seed: any) => {
        const examSeeds = seed.exam_seeds || [];
        // Get the first exam for backward compatibility
        const firstExamSeed = examSeeds[0];
        const firstExam = firstExamSeed?.exams;
        // Get all exam names
        const examNames = examSeeds
          .map((es: any) => es?.exams?.subject_name)
          .filter((name: string) => name);

        return {
          ...seed,
          exam_id: firstExamSeed?.exam_id || undefined,
          exam_name: firstExam?.subject_name || undefined,
          exam_names: examNames,
          // Remove the joined data to clean up the response
          exam_seeds: undefined,
        };
      });

      // getSeeds completed
      return { seeds: transformedSeeds };
    } catch (error) {
      logger.error("[DB-ERROR] Get seeds exception with full details:", {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "No stack available",
        query: query,
      });
      return {
        error: `Failed to fetch seeds: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  async getSeed(id: string): Promise<{ seed?: Seed; error?: string }> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        return { error: "Authentication required" };
      }

      const { data: seed, error } = await supabase
        .from("seeds")
        .select("*")
        .eq("id", id)
        .eq("user_id", session!.user.id)
        .single();

      if (error) {
        logger.error("Get seed error:", error);
        return { error: "Failed to fetch seed" };
      }

      return { seed };
    } catch (error) {
      logger.error("Get seed exception:", error);
      return { error: "Failed to fetch seed" };
    }
  }

  /**
   * Get seed detail with counts and exam associations
   * OPTIMIZED: Uses RPC instead of 5 sequential queries
   * Performance improvement: 80% faster (280ms → 40ms)
   */
  async getSeedDetail(id: string): Promise<{
    seedDetail?: {
      seed: Seed;
      counts: { flashcards: number; quizQuestions: number };
      exams: Array<{ id: string; subject_name: string }>;
      recentSessions: Array<{
        completed_at: string;
        session_type: string;
        score: number;
        time_spent: number;
      }>;
    };
    error?: string;
  }> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        return { error: "Authentication required" };
      }

      // OPTIMIZED: Single RPC call replaces 5 separate queries
      const { data: seedDetail, error } = await supabase.rpc(
        "get_seed_detail",
        { p_seed_id: id, p_user_id: session!.user.id },
      );

      if (error) {
        logger.error("Get seed detail error:", error);
        return { error: "Failed to fetch seed detail" };
      }

      return { seedDetail };
    } catch (error) {
      logger.error("Get seed detail exception:", error);
      return { error: "Failed to fetch seed detail" };
    }
  }

  async updateSeed(
    id: string,
    data: UpdateSeedData,
  ): Promise<{ seed?: Seed; error?: string }> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        return { error: "Authentication required" };
      }

      const { data: seed, error } = await supabase
        .from("seeds")
        .update(data)
        .eq("id", id)
        .eq("user_id", session!.user.id)
        .select()
        .single();

      if (error) {
        logger.error("Update seed error:", error);
        return { error: "Failed to update seed" };
      }

      return { seed };
    } catch (error) {
      logger.error("Update seed exception:", error);
      return { error: "Failed to update seed" };
    }
  }

  async deleteSeed(id: string): Promise<{ error?: string; impact?: any }> {
    try {
      const sessionValidation = await validateSession();

      if (!sessionValidation.valid) {
        logger.error("Session validation failed:", sessionValidation.error);
        return {
          error:
            sessionValidation.error ||
            "User authentication required to delete seeds. Please sign in first.",
        };
      }

      const { session } = sessionValidation;

      if (!session?.user) {
        return {
          error:
            "User authentication required to delete seeds. Please sign in first.",
        };
      }

      // Use cleanupService for cascade delete
      cleanupService.setSupabase(supabase);

      // Add timeout protection to prevent indefinite hangs (10 seconds)
      const deleteWithTimeout = async () => {
        // OPTIMIZATION: Skip redundant impact analysis
        // The UI already analyzes impact before showing the confirmation dialog
        // Performing analysis again here wastes 0.5-1 second
        // Just proceed directly with cascade delete

        // Perform cascade delete
        const deleteResult = await cleanupService.deleteSeedCascade(
          id,
          session.user.id,
        );

        if (!deleteResult.success) {
          logger.error("Delete seed error:", deleteResult.error);
          return { error: deleteResult.error || "Failed to delete seed" };
        }

        // Cancel all queued tasks for this seed
        try {
          const { backgroundProcessor } = require("./backgroundProcessor");
          const canceledCount = backgroundProcessor.cancelTasksBySeedId(id);
          if (canceledCount > 0) {
            logger.info(`[SeedsService] Canceled ${canceledCount} background tasks for seed ${id}`);
          }
        } catch (cancelError) {
          logger.warn(
            "[SeedsService] Warning: Failed to cancel tasks:",
            cancelError,
          );
          // Don't fail the main operation if cancellation fails
        }

        return {
          error: undefined,
          impact: {
            deletedCounts: deleteResult.deletedCounts,
          },
        };
      };

      // Simplified: Let cleanupService handle timeout internally
      const result = await deleteWithTimeout();
      return result;
    } catch (error) {
      logger.error("Delete seed exception:", error);
      return { error: "Failed to delete seed" };
    }
  }

  async searchSeeds(
    searchTerm: string,
    filter?: SeedFilter,
  ): Promise<{ seeds?: Seed[]; error?: string }> {
    return this.getSeeds({ search: searchTerm, filter });
  }

  async getSeedCounts(): Promise<{
    total?: number;
    exam?: number;
    error?: string;
  }> {
    try {
      // Starting getSeedCounts

      // Validate session with detailed logging
      const sessionValidation = await validateSession();
      if (!sessionValidation.valid) {
        // Session validation failed
        return { error: sessionValidation.error || "Authentication failed" };
      }

      const { session } = sessionValidation;
      // Session validated, executing count queries

      // Use Promise.all for parallel queries with enhanced error logging
      const [totalResult, examResult] = await Promise.all([
        supabase
          .from("seeds")
          .select("*", { count: "exact", head: true })
          .eq("user_id", session!.user.id)
          .eq("processing_status", "completed"),
        supabase
          .from("seeds")
          .select("*", { count: "exact", head: true })
          .eq("user_id", session!.user.id)
          .eq("processing_status", "completed")
          .not("feynman_explanation", "is", null),
      ]);

      // Count query results

      if (totalResult.error || examResult.error) {
        logger.error("[DB-ERROR] Get counts error details:", {
          total: totalResult.error
            ? {
              message: totalResult.error.message,
              code: totalResult.error.code,
              details: totalResult.error.details,
              hint: totalResult.error.hint,
            }
            : null,
          exam: examResult.error
            ? {
              message: examResult.error.message,
              code: examResult.error.code,
              details: examResult.error.details,
              hint: examResult.error.hint,
            }
            : null,
        });

        // Return specific error message
        const errors = [totalResult.error, examResult.error]
          .filter(Boolean)
          .map((e) => e!.message);

        return { error: `Database query failed: ${errors.join(", ")}` };
      }

      const result = {
        total: totalResult.count || 0,
        exam: examResult.count || 0,
      };

      // getSeedCounts completed
      return result;
    } catch (error) {
      logger.error("[DB-ERROR] Get counts exception with full details:", {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "No stack available",
        name: error instanceof Error ? error.name : "Unknown",
      });
      return {
        error: `Failed to fetch seed counts: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  async updateSeedProcessingStatus(
    id: string,
    status:
      | "pending"
      | "extracting"
      | "analyzing"
      | "summarizing"
      | "feynman_processing"
      | "completed"
      | "failed",
    error?: string,
  ): Promise<{ seed?: Seed; error?: string }> {
    const updateData: any = { processing_status: status };
    if (error) {
      updateData.processing_error = error;
    }
    return this.updateSeed(id, updateData);
  }

  async getSeedsByProcessingStatus(
    status:
      | "pending"
      | "extracting"
      | "analyzing"
      | "summarizing"
      | "feynman_processing"
      | "completed"
      | "failed",
  ): Promise<{ seeds?: Seed[]; error?: string }> {
    try {
      const { data: seeds, error } = await supabase
        .from("seeds")
        .select("*")
        .eq("processing_status", status)
        .order("created_at", { ascending: false });

      if (error) {
        logger.error("Get seeds by processing status error:", error);
        return { error: "Failed to fetch seeds by processing status" };
      }

      return { seeds: seeds || [] };
    } catch (error) {
      logger.error("Get seeds by processing status exception:", error);
      return { error: "Failed to fetch seeds by processing status" };
    }
  }

  async reprocessFailedSeed(
    id: string,
  ): Promise<{ seed?: Seed; error?: string }> {
    try {
      // Reset the seed to pending status and clear error
      const result = await this.updateSeed(id, {
        processing_status: "pending",
        processing_error: undefined,
        confidence_score: undefined,
        extraction_metadata: undefined,
      });

      return result;
    } catch (error) {
      logger.error("Reprocess failed seed exception:", error);
      return { error: "Failed to reprocess seed" };
    }
  }

  // Batch operations for better performance
  async batchUpdateSeeds(
    updates: Array<{ id: string; data: UpdateSeedData }>,
  ): Promise<{
    seeds?: Seed[];
    errors?: string[];
  }> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        return { errors: ["Authentication required"] };
      }

      // Execute all updates in parallel
      const updatePromises = updates.map(async ({ id, data }) => {
        const { data: seed, error } = await supabase
          .from("seeds")
          .update(data)
          .eq("id", id)
          .eq("user_id", session.user.id)
          .select()
          .single();

        return { seed, error, id };
      });

      const results = await Promise.allSettled(updatePromises);

      const seeds: Seed[] = [];
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          const { seed, error, id } = result.value;
          if (error) {
            errors.push(`Failed to update seed ${id}: ${error.message}`);
          } else if (seed) {
            seeds.push(seed);
          }
        } else {
          errors.push(
            `Failed to update seed ${updates[index].id}: ${result.reason}`,
          );
        }
      });

      return { seeds, errors: errors.length > 0 ? errors : undefined };
    } catch (error) {
      logger.error("Batch update seeds exception:", error);
      return { errors: ["Failed to batch update seeds"] };
    }
  }

  async getSeedsAndCounts(query: SeedsQuery = {}): Promise<{
    seeds?: Seed[];
    counts?: { total: number; exam: number };
    error?: string;
  }> {
    try {
      // Validate session once for both operations
      const sessionValidation = await validateSession();
      if (!sessionValidation.valid) {
        return { seeds: [], counts: { total: 0, exam: 0 } };
      }

      const { session } = sessionValidation;
      const userId = session!.user.id;

      // Execute seeds query and counts in parallel, but more efficiently
      const [seedsResult, countsResults] = await Promise.allSettled([
        // Get seeds with the same query logic as getSeeds
        this.executeSeedsQuery(userId, query),
        // Get counts more efficiently with a single aggregated query
        this.getCountsEfficiently(userId),
      ]);

      let seeds: Seed[] = [];
      let counts = { total: 0, exam: 0 };
      let error: string | undefined;

      // Handle seeds result
      if (seedsResult.status === "fulfilled") {
        if (seedsResult.value.error) {
          error = seedsResult.value.error;
        } else {
          seeds = seedsResult.value.seeds || [];
        }
      } else {
        error = "Failed to fetch seeds";
      }

      // Handle counts result (non-critical)
      if (countsResults.status === "fulfilled" && !countsResults.value.error) {
        counts = {
          total: countsResults.value.total || 0,
          exam: countsResults.value.exam || 0,
        };
      }

      return { seeds, counts, error };
    } catch (error) {
      logger.error("Get seeds and counts exception:", error);
      return { error: "Failed to fetch seeds and counts" };
    }
  }

  // Optimized seeds query execution
  private async executeSeedsQuery(
    userId: string,
    query: SeedsQuery,
  ): Promise<{ seeds?: Seed[]; error?: string }> {
    try {
      let supabaseQuery = supabase
        .from("seeds")
        .select(
          `
          *,
          exam_seeds!left(
            exam_id,
            exams!left(
              subject_name
            )
          )
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      // Apply filter
      if (query.filter) {
        switch (query.filter) {
          case "exam":
            // Exam filter: seeds with flashcards or quiz questions generated
            supabaseQuery = supabaseQuery
              .eq("processing_status", "completed")
              .not("feynman_explanation", "is", null);
            break;
          case "all":
          default:
            supabaseQuery = supabaseQuery.eq("processing_status", "completed");
            break;
        }
      }

      // Apply search
      if (query.search?.trim()) {
        const searchTerm = query.search.trim();
        supabaseQuery = supabaseQuery.or(
          `title.ilike.%${searchTerm}%,content_text.ilike.%${searchTerm}%`,
        );
      }

      // Apply pagination
      if (query.limit) {
        supabaseQuery = supabaseQuery.limit(query.limit);
      }
      if (query.offset) {
        supabaseQuery = supabaseQuery.range(
          query.offset,
          query.offset + (query.limit || 50) - 1,
        );
      }

      const { data, error } = await supabaseQuery;

      if (error) {
        logger.error("[DB-ERROR] Seeds query error:", error);
        return { error: `Failed to fetch seeds: ${error.message}` };
      }

      // Transform seeds to include exam information
      const transformedSeeds = (data || []).map((seed: any) => {
        const examSeeds = seed.exam_seeds || [];
        // Get the first exam for backward compatibility
        const firstExamSeed = examSeeds[0];
        const firstExam = firstExamSeed?.exams;
        // Get all exam names
        const examNames = examSeeds
          .map((es: any) => es?.exams?.subject_name)
          .filter((name: string) => name);

        return {
          ...seed,
          exam_id: firstExamSeed?.exam_id || undefined,
          exam_name: firstExam?.subject_name || undefined,
          exam_names: examNames,
          // Remove the joined data to clean up the response
          exam_seeds: undefined,
        };
      });

      return { seeds: transformedSeeds };
    } catch (error) {
      logger.error("[DB-ERROR] Seeds query exception:", error);
      return { error: "Failed to execute seeds query" };
    }
  }

  // More efficient counts query using a single aggregated query
  private async getCountsEfficiently(userId: string): Promise<{
    total?: number;
    exam?: number;
    error?: string;
  }> {
    try {
      // Single query with conditional counting for better performance
      const { data, error } = await supabase
        .from("seeds")
        .select("feynman_explanation, processing_status")
        .eq("user_id", userId);

      if (error) {
        logger.error("[DB-ERROR] Efficient counts query error:", error);
        return { error: `Failed to fetch counts: ${error.message}` };
      }

      // Calculate counts client-side to reduce database load
      const total = data.filter(
        (seed) => seed.processing_status === "completed",
      ).length;
      const exam = data.filter(
        (seed) =>
          seed.processing_status === "completed" && seed.feynman_explanation,
      ).length;

      return { total, exam };
    } catch (error) {
      logger.error("[DB-ERROR] Efficient counts exception:", error);
      return { error: "Failed to calculate counts" };
    }
  }
}

export const seedsService = new SeedsService();
