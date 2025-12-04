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
    // Note: Individual card review progress is now captured at the END of the session
    // when the full learning_sessions record is created. Per-card logging is not needed
    // since we track all cards in the metadata of the final session record.
    // This method is kept for backwards compatibility but does nothing.
    logger.info("[ReviewProgressService] Chunk logging skipped - will be captured at session end");
    return { success: true };
  }
}

export const reviewProgressService = new ReviewProgressService();
