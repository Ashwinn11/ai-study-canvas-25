import { getSupabaseClient } from '../supabase/client';
import { Flashcard } from '../supabase/types';
import { calculateSM2, swipeToQuality, updateStreakAndLapses, formatDateString, getLocalDate } from '../algorithms/sm2';
import { ServiceError } from '../utils/serviceError';

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
   * Matches iOS contentGenerator.ts generateAIPoweredFlashcards lines 193-309
   */
  async generateFlashcards(params: GenerateFlashcardsParams & { intent?: string; quantity?: number }): Promise<Flashcard[]> {
    const { chatCompletion } = await import('./openAIClient');
    const { configService } = await import('./configService');
    const { getReturnOnlyJsonFlashcards, getFlashcardsUserTemplate, renderPromptTemplate } = await import('./prompts');

    try {
      // Get dynamic config for flashcard generation (matching iOS lines 204-207)
      const flashcardsConfig = await configService.getAIConfig('flashcards');

      // Validate quantity (matching iOS line 210)
      const validatedQuantity = Math.min(
        params.quantity || flashcardsConfig.maxQuantity,
        flashcardsConfig.maxQuantity
      );

      // Fetch prompts from backend (matching iOS lines 216-221)
      const intent = (params.intent || 'Educational') as 'Educational' | 'Comprehension' | 'Reference' | 'Analytical' | 'Procedural';
      const [systemPrompt, userTemplate] = await Promise.all([
        getReturnOnlyJsonFlashcards(),
        getFlashcardsUserTemplate(intent),
      ]);

      // Add language instruction if content is not in English (matching iOS lines 224-227)
      const languageInstruction =
        params.language && params.language !== 'en'
          ? `\n\nCRITICAL LANGUAGE INSTRUCTION:\nThe source content is in ${params.language.toUpperCase()}.\nGenerate ALL flashcards (questions AND answers) in ${params.language.toUpperCase()}.\nMaintain the source language throughout - do NOT translate to English.`
          : '';

      // Render prompt template (matching iOS lines 229-236)
      const prompt = renderPromptTemplate(userTemplate, {
        language_instruction: languageInstruction,
        intent,
        content: params.content,
        min_quantity: String(flashcardsConfig.minQuantity),
        max_quantity: String(flashcardsConfig.maxQuantity),
      });

      // Get model limits (matching iOS lines 204-207)
      const fullConfig = await configService.getConfig();
      const modelLimits = fullConfig.ai.modelLimits || {};
      const modelMaxTokens = modelLimits[flashcardsConfig.model] || 16384;

      // Call chatCompletion (matching iOS lines 239-263)
      const aiContent = await chatCompletion({
        model: flashcardsConfig.model,
        systemPrompt: systemPrompt,
        userPrompt: prompt,
        temperature: flashcardsConfig.temperature,
        maxTokens: Math.min(
          modelMaxTokens,
          Math.max(flashcardsConfig.maxTokens, 6000 + flashcardsConfig.maxQuantity * 180)
        ),
        responseFormat: { type: 'json_object' },
        timeoutMs: flashcardsConfig.timeoutMs,
      });

      // Parse JSON response (matching iOS lines 265-286)
      let cards;
      try {
        cards = JSON.parse(aiContent);

        if (!cards || typeof cards !== 'object') {
          throw new Error('Parsed result is not an object');
        }
      } catch (parseError) {
        console.error('[FlashcardsService] Flashcard parsing failed:', parseError);
        throw new Error('Unable to process AI response. The content may be too complex. Try breaking it into smaller sections.');
      }

      // Normalize to array (matching iOS lines 289-303)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let normalized: any[] = [];
      if (Array.isArray(cards)) {
        normalized = cards;
      } else if (cards && typeof cards === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj = cards as any;
        const candidate = obj.flashcards || obj.cards || obj.items || obj.data || obj.results;
        if (Array.isArray(candidate)) {
          normalized = candidate;
        } else if (Array.isArray(obj.questions)) {
          normalized = obj.questions;
        }
      }

      // Cap at maximum quantity (matching iOS lines 306-308)
      const result = Array.isArray(normalized)
        ? normalized.slice(0, flashcardsConfig.maxQuantity)
        : [];

      if (result.length === 0) {
        throw new Error('No flashcards generated from content');
      }

      // Store flashcards in database with initial SM-2 values
      const supabase = getSupabaseClient();
      const today = getLocalDate();

      const flashcardsToInsert = result.map((fc: { question: string; answer: string; difficulty?: number }) => ({
        seed_id: params.seedId,
        user_id: params.userId,
        question: fc.question,
        answer: fc.answer,
        difficulty: fc.difficulty || 3,
        interval: 1,
        repetitions: 0,
        easiness_factor: 2.5,
        next_due_date: today,
        last_reviewed_date: null,
        streak: 0,
        lapses: 0,
        quality_rating: null,
      }));

      const { data, error } = await supabase
        .from('flashcards')
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(flashcardsToInsert as any)
        .select();

      if (error) {
        throw new Error(`Failed to save flashcards: ${error.message}`);
      }

      return data as Flashcard[];
    } catch (error) {
      console.error('[FlashcardsService] Error generating flashcards:', error);
      throw error instanceof Error ? error : new Error('Failed to generate flashcards. Please try again.');
    }
  }

  /**
   * Create flashcards for a seed (fetches seed content, generates via AI, and saves to DB)
   * Matches iOS contentGenerator.ts generateFlashcardsFromSeed lines 51-109
   */
  async createFlashcards(params: {
    seedId: string;
    userId: string;
    onProgress?: (progress: number, message: string) => void;
  }): Promise<Flashcard[]> {
    const supabase = getSupabaseClient();

    // Check if flashcards already exist
    const existing = await this.getFlashcards(params.seedId, params.userId);
    if (existing.length > 0) {
      return existing;
    }

    params.onProgress?.(0.1, 'Preparing content...');

    // Get seed data
    const { data: seedData, error: seedError } = await supabase
      .from('seeds')
      .select('*')
      .eq('id', params.seedId)
      .eq('user_id', params.userId)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seed = seedData as any;

    if (seedError || !seedData) {
      throw new Error('Failed to find the source content for flashcard generation');
    }

    // Verify Feynman explanation exists (matching iOS lines 61-69)
    if (!seed.feynman_explanation || seed.feynman_explanation.length < 50) {
      throw new Error('Learning materials not ready yet. Please wait for content processing to complete.');
    }

    params.onProgress?.(0.2, 'Analyzing content...');

    // Get access token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }

    // Generate flashcards from Feynman explanation (matching iOS lines 80-85)
    const generatedCards = await this.generateFlashcards({
      seedId: params.seedId,
      userId: params.userId,
      content: seed.feynman_explanation, // Use Feynman instead of raw content
      title: seed.title,
      language: seed.language_code || 'en',
      intent: seed.intent || 'Educational', // Pass intent for adaptive generation
      accessToken: session.access_token,
    });

    params.onProgress?.(1.0, 'Flashcards ready!');

    return generatedCards;
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
   * Uses distributed lock to prevent race conditions
   */
  async reviewFlashcard(
    flashcardId: string,
    direction: 'left' | 'right' | 'up'
  ): Promise<Flashcard> {
    const { distributedLockService } = await import('../utils/distributedLock');
    const supabase = getSupabaseClient();

    // Use distributed lock to prevent concurrent SM-2 updates
    const lockKey = `flashcard:${flashcardId}`;

    return await distributedLockService.withLock(lockKey, async () => {
      // Get current flashcard data
      const { data: currentCard, error: fetchError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('id', flashcardId)
        .single();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const card = currentCard as any;

      if (fetchError || !currentCard) {
        throw new Error('Failed to find flashcard');
      }

      // Check if already reviewed today - prevent duplicate SM2 updates
      const today = getLocalDate();
      if (card.last_reviewed_date === today) {
        console.log(`Flashcard ${flashcardId} already reviewed today, skipping SM2 update`);
        return card as Flashcard;
      }

      // Convert swipe direction to quality rating
      const quality = swipeToQuality(direction);

      // Calculate new SM2 values
      const sm2Result = calculateSM2({
        quality,
        repetitions: card.repetitions || 0,
        interval: card.interval || 1,
        easinessFactor: card.easiness_factor || 2.5,
      });

      // Update streak and lapses
      const { streak, lapses } = updateStreakAndLapses(
        quality,
        card.streak || 0,
        card.lapses || 0
      );

      // Update flashcard with new SM2 values
      const updateData = {
        interval: sm2Result.interval,
        repetitions: sm2Result.repetitions,
        easiness_factor: sm2Result.easinessFactor,
        next_due_date: formatDateString(sm2Result.nextDueDate),
        last_reviewed: new Date().toISOString(),
        last_reviewed_date: today,
        quality_rating: sm2Result.qualityRating,
        streak,
        lapses,
      };

      const { data, error } = await supabase
        .from('flashcards')
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(updateData as any)
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
    });
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
   * Create learning session record (matching iOS lines 483-549)
   * Source: "individual-practice" for flashcard practice
   */
  async createLearningSession(
    seedId: string,
    userId: string,
    sessionData: {
      totalItems: number;
      correctItems: number;
      timeSpent?: number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const supabase = getSupabaseClient();

    // Score as decimal 0.0-1.0 (NOT percentage) per database constraint
    const score = sessionData.totalItems > 0
      ? sessionData.correctItems / sessionData.totalItems
      : 0;

    const sessionRecord = {
      user_id: userId,
      seed_id: seedId,
      session_type: 'flashcards' as const,
      total_items: sessionData.totalItems,
      correct_items: sessionData.correctItems,
      score,
      time_spent: sessionData.timeSpent,
      metadata: {
        ...sessionData.metadata,
        source: sessionData.metadata?.source || 'individual-practice',
      },
      completed_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('learning_sessions')
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(sessionRecord as any);

    if (error) {
      console.error('[FlashcardsService] Error saving session:', error);
      // Don't throw - just log (matching iOS behavior)
    }
  }
}

export const flashcardsService = new FlashcardsService();
