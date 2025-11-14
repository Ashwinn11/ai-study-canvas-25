import { getSupabaseClient } from '../supabase/client';
import { Flashcard } from '../supabase/types';
import { calculateSM2, swipeToQuality, updateStreakAndLapses, formatDateString, getLocalDate } from '../algorithms/sm2';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  console.warn('NEXT_PUBLIC_API_BASE_URL not configured');
}

export interface GenerateFlashcardsParams {
  seedId: string;
  userId: string;
  content: string;
  title: string;
  language?: string;
  accessToken: string;
}

export interface ReviewFlashcardParams {
  flashcardId: string;
  direction: 'left' | 'right' | 'up'; // swipe direction
}

export class FlashcardsService {
  /**
   * Generate flashcards from seed content using AI
   */
  async generateFlashcards(params: GenerateFlashcardsParams): Promise<Flashcard[]> {
    if (!API_BASE_URL) {
      throw new Error('Backend URL not configured');
    }

    const url = `${API_BASE_URL}/api/ai/flashcards`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${params.accessToken}`,
      },
      body: JSON.stringify({
        content: params.content,
        title: params.title,
        language: params.language,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to generate flashcards';

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        // Use default error message
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();

    // Store flashcards in database with initial SM-2 values
    const supabase = getSupabaseClient();
    const today = getLocalDate();

    const flashcardsToInsert = result.flashcards.map((fc: { question: string; answer: string; difficulty?: number }) => ({
      seed_id: params.seedId,
      user_id: params.userId,
      question: fc.question,
      answer: fc.answer,
      difficulty: fc.difficulty || 3,
      interval: 1,
      repetitions: 0,
      easiness_factor: 2.5,
      next_due_date: today, // Due today for first review
      streak: 0,
      lapses: 0,
    }));

    const { data, error } = await supabase
      .from('flashcards')
      .insert(flashcardsToInsert)
      .select();

    if (error) {
      throw new Error(`Failed to save flashcards: ${error.message}`);
    }

    return data as Flashcard[];
  }

  /**
   * Get flashcards for a seed
   */
  async getFlashcards(seedId: string, userId: string): Promise<Flashcard[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('seed_id', seedId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get flashcards: ${error.message}`);
    }

    return (data as Flashcard[]) || [];
  }

  /**
   * Get due flashcards for review
   */
  async getDueFlashcards(seedId: string, userId: string): Promise<Flashcard[]> {
    const supabase = getSupabaseClient();
    const today = getLocalDate();

    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('seed_id', seedId)
      .eq('user_id', userId)
      .lte('next_due_date', today)
      .order('next_due_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to get due flashcards: ${error.message}`);
    }

    return (data as Flashcard[]) || [];
  }

  /**
   * Review flashcard with swipe direction
   * Applies SM-2 algorithm and updates database
   * Prevents duplicate reviews on same day
   */
  async reviewFlashcard(
    flashcardId: string,
    direction: 'left' | 'right' | 'up'
  ): Promise<Flashcard> {
    const supabase = getSupabaseClient();

    // Get current flashcard data
    const { data: currentCard, error: fetchError } = await supabase
      .from('flashcards')
      .select('*')
      .eq('id', flashcardId)
      .single();

    if (fetchError || !currentCard) {
      throw new Error('Failed to find flashcard');
    }

    // Check if already reviewed today - prevent duplicate SM2 updates
    const today = getLocalDate();
    if (currentCard.last_reviewed) {
      const lastReviewedDate = currentCard.last_reviewed.split('T')[0];
      if (lastReviewedDate === today) {
        console.log(`Flashcard ${flashcardId} already reviewed today, skipping SM2 update`);
        return currentCard as Flashcard;
      }
    }

    // Convert swipe direction to quality rating
    const quality = swipeToQuality(direction);

    // Calculate new SM2 values
    const sm2Result = calculateSM2({
      quality,
      repetitions: currentCard.repetitions || 0,
      interval: currentCard.interval || 1,
      easinessFactor: currentCard.easiness_factor || 2.5,
    });

    // Update streak and lapses
    const { streak, lapses } = updateStreakAndLapses(
      quality,
      currentCard.streak || 0,
      currentCard.lapses || 0
    );

    // Update flashcard with new SM2 values
    const updateData = {
      interval: sm2Result.interval,
      repetitions: sm2Result.repetitions,
      easiness_factor: sm2Result.easinessFactor,
      next_due_date: formatDateString(sm2Result.nextDueDate),
      last_reviewed: new Date().toISOString(),
      quality_rating: sm2Result.qualityRating,
      streak,
      lapses,
    };

    const { data, error } = await supabase
      .from('flashcards')
      .update(updateData)
      .eq('id', flashcardId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update flashcard: ${error.message}`);
    }

    console.log(
      `Updated flashcard ${flashcardId} with quality ${quality}, next due: ${updateData.next_due_date}`
    );

    return data as Flashcard;
  }

  /**
   * Delete all flashcards for a seed
   */
  async deleteFlashcards(seedId: string): Promise<void> {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('seed_id', seedId);

    if (error) {
      throw new Error(`Failed to delete flashcards: ${error.message}`);
    }
  }

  /**
   * Create learning session record
   */
  async createLearningSession(
    seedId: string,
    userId: string,
    stats: {
      totalItems: number;
      correctItems: number;
      timeSpent: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    const supabase = getSupabaseClient();

    const score = stats.totalItems > 0 ? stats.correctItems / stats.totalItems : 0;

    const { error } = await supabase
      .from('learning_sessions')
      .insert({
        user_id: userId,
        seed_id: seedId,
        session_type: 'flashcards',
        total_items: stats.totalItems,
        correct_items: stats.correctItems,
        score,
        time_spent: stats.timeSpent,
        completed_at: new Date().toISOString(),
        metadata: stats.metadata || {},
      });

    if (error) {
      throw new Error(`Failed to save learning session: ${error.message}`);
    }
  }
}

export const flashcardsService = new FlashcardsService();
