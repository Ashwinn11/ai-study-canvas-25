import { ServiceError } from "./serviceError";

import { logger } from "@/utils/logger";
export type ReviewChunkSessionType = "flashcards" | "quiz";

interface ReviewChunkPayload {
  userId: string;
  seedId: string;
  sessionType: ReviewChunkSessionType;
  totalItems: number;
  correctItems: number;
  timeSpentSeconds?: number;
  examId: string;
  chunkStartIndex: number;
  chunkEndIndex: number;
  totalReviewItems: number;
  isFinalChunk: boolean;
  chunkSequence: number;
  reviewedCardIds?: string[]; // Card IDs reviewed in this chunk
}

class ReviewProgressService {
  private supabase: any;

  setSupabase(client: any) {
    this.supabase = client;
  }

  private getSupabase() {
    if (!this.supabase) {
      const { supabase: client } = require('./supabaseWithTimeout');
      this.supabase = client;
    }
    return this.supabase;
  }

  async logChunk(payload: ReviewChunkPayload): Promise<{ success: boolean; error?: string }> {
    try {
      const metadata = {
      exam_id: payload.examId,
      source: "exam-review",
      chunk_start_index: payload.chunkStartIndex,
      chunk_end_index: payload.chunkEndIndex,
      total_review_items: payload.totalReviewItems,
      chunk_sequence: payload.chunkSequence,
      is_final_chunk: payload.isFinalChunk,
      reviewed_card_ids: payload.reviewedCardIds || [],
      accuracy: payload.totalItems > 0
        ? Math.round(
            Math.max(
              0,
              Math.min(1, payload.correctItems / payload.totalItems),
            ) * 10000,
          ) / 10000
        : null,
    };

    const timeSpent =
      typeof payload.timeSpentSeconds === "number" && payload.timeSpentSeconds >= 0
        ? payload.timeSpentSeconds
        : null;

    const { error } = await this.getSupabase()
      .from("learning_sessions")
      .insert({
        user_id: payload.userId,
        seed_id: payload.seedId,
        session_type: payload.sessionType,
        total_items: payload.totalItems,
        correct_items: payload.correctItems,
        score: null,
        time_spent: timeSpent,
        metadata,
        completed_at: new Date().toISOString(),
      });

      if (error) {
        logger.error("[ReviewProgressService] Error logging review chunk:", error);
        return {
          success: false,
          error: error.message || "Failed to log review progress",
        };
      }

      return { success: true };
    } catch (err) {
      logger.error("[ReviewProgressService] Exception logging review chunk:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to log review progress",
      };
    }
  }
}

export const reviewProgressService = new ReviewProgressService();
