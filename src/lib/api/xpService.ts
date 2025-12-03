/**
 * XP Service - Manages experience points for user achievements
 * Awards XP based on learning activities (flashcard reviews, quiz answers)
 */

import { getSupabaseClient } from '@/lib/supabase/client';

export interface XPResult {
  amount: number;
  reason: string;
}

class XPService {
  // XP Values
  private static readonly XP_VALUES = {
    FLASHCARD: {
      FORGOT: 2, // Quality 1
      SOMEWHAT: 5, // Quality 3
      CONFIDENT: 10, // Quality 4
    },
    QUIZ: {
      INCORRECT: 2,
      CORRECT: 15,
    },
  };

  /**
   * Calculate XP based on item type and quality rating
   */
  calculateXP(
    type: 'flashcard' | 'quiz',
    qualityOrCorrect: number | boolean
  ): XPResult {
    if (type === 'flashcard') {
      const quality = qualityOrCorrect as number;
      if (quality >= 4)
        return {
          amount: XPService.XP_VALUES.FLASHCARD.CONFIDENT,
          reason: 'Perfect!',
        };
      if (quality >= 3)
        return {
          amount: XPService.XP_VALUES.FLASHCARD.SOMEWHAT,
          reason: 'Good',
        };
      return {
        amount: XPService.XP_VALUES.FLASHCARD.FORGOT,
        reason: 'Keep practicing',
      };
    } else {
      const isCorrect = qualityOrCorrect as boolean;
      if (isCorrect)
        return { amount: XPService.XP_VALUES.QUIZ.CORRECT, reason: 'Correct!' };
      return {
        amount: XPService.XP_VALUES.QUIZ.INCORRECT,
        reason: 'Nice try',
      };
    }
  }

  /**
   * Award XP to user and update database
   * Uses atomic RPC call to prevent race conditions
   */
  async awardXP(userId: string, amount: number): Promise<number | null> {
    try {
      const supabase = getSupabaseClient();

      // Use atomic RPC function to increment XP safely
      // This prevents race conditions when multiple requests happen concurrently
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newXP, error } = await (supabase.rpc as any)('increment_xp', {
        p_user_id: userId,
        p_amount: amount,
      });

      if (error) {
        console.error('[XPService] Error awarding XP via RPC:', error);
        return null;
      }

      console.log(
        `[XPService] Awarded ${amount} XP to user ${userId}. Total: ${newXP}`
      );
      return newXP;
    } catch (error) {
      console.error('[XPService] Exception awarding XP:', error);
      return null;
    }
  }

  /**
   * Get current XP for a user
   */
  async getCurrentXP(userId: string): Promise<number> {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('profiles')
        .select('xp')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((data as any)?.xp as number) || 0;
    } catch (error) {
      console.error('[XPService] Error getting XP:', error);
      return 0;
    }
  }
}

export const xpService = new XPService();
