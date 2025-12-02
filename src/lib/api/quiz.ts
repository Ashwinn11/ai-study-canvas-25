import { getSupabaseClient } from '@/lib/supabase/client';
import { QuizQuestion } from '@/lib/supabase/types';
import { calculateSM2, quizToQuality, getLocalDate } from '@/lib/algorithms/sm2';

export interface CreateQuizRequest {
  seedId: string;
  userId: string;
  quantity?: number;
  onProgress?: (progress: number, message: string) => void;
}

export interface QuizAttempt {
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  timeSpent?: number;
}

class QuizService {
  async getQuizQuestionsBySeed(seedId: string, userId: string): Promise<QuizQuestion[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('seed_id', seedId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading quiz questions:', error);
      throw new Error(`Failed to load quiz questions: ${error.message}`);
    }

    return (data || []) as QuizQuestion[];
  }

  /**
   * Create quiz questions for a seed
   * Matches iOS contentGenerator.ts generateQuizFromSeed and generateAIPoweredQuiz lines 121-433
   */
  async createQuizQuestions(request: CreateQuizRequest): Promise<QuizQuestion[]> {
    const supabase = getSupabaseClient();
    const { chatCompletion } = await import('./openAIClient');
    const { configService } = await import('./configService');
    const { getReturnOnlyJsonQuiz, getQuizUserTemplate, renderPromptTemplate } = await import('./prompts');

    // Check if quiz questions already exist
    const existingQuestions = await this.getQuizQuestionsBySeed(
      request.seedId,
      request.userId
    );

    if (existingQuestions.length > 0) {
      return existingQuestions;
    }

    // Report progress
    request.onProgress?.(0.1, 'Preparing content...');

    // Get seed data
    const { data: seedData, error: seedError } = await supabase
      .from('seeds')
      .select('*')
      .eq('id', request.seedId)
      .eq('user_id', request.userId)
      .single();

    if (seedError || !seedData) {
      throw new Error('Failed to find the source content for quiz generation');
    }

    // Verify Feynman explanation exists (matching iOS lines 131-139)
    if (!seedData.feynman_explanation || seedData.feynman_explanation.length < 50) {
      throw new Error('Learning materials not ready yet. Please wait for content processing to complete.');
    }

    request.onProgress?.(0.2, 'Analyzing content...');

    try {
      // Get dynamic config for quiz generation (matching iOS lines 325-328)
      const quizConfig = await configService.getAIConfig('quiz');

      // Validate quantity (matching iOS line 331)
      const validatedQuantity = Math.min(
        request.quantity || quizConfig.maxQuantity,
        quizConfig.maxQuantity
      );

      // Fetch prompts from backend (matching iOS lines 337-342)
      const intent = (seedData.intent || 'Educational') as 'Educational' | 'Comprehension' | 'Reference' | 'Analytical' | 'Procedural';
      const [systemPrompt, userTemplate] = await Promise.all([
        getReturnOnlyJsonQuiz(),
        getQuizUserTemplate(intent),
      ]);

      // Add language instruction if content is not in English (matching iOS lines 345-348)
      const languageInstruction =
        seedData.language_code && seedData.language_code !== 'en'
          ? `\n\nCRITICAL LANGUAGE INSTRUCTION:\nThe source content is in ${seedData.language_code.toUpperCase()}.\nGenerate ALL quiz questions and options in ${seedData.language_code.toUpperCase()}.\nMaintain the source language throughout - do NOT translate to English.`
          : '';

      // Render prompt template (matching iOS lines 350-357)
      const prompt = renderPromptTemplate(userTemplate, {
        language_instruction: languageInstruction,
        intent,
        content: seedData.feynman_explanation, // Use Feynman instead of raw content
        min_quantity: String(quizConfig.minQuantity),
        max_quantity: String(quizConfig.maxQuantity),
      });

      request.onProgress?.(0.3, 'Generating quiz questions with AI...');

      // Get model limits (matching iOS lines 362-365)
      const fullConfig = await configService.getConfig();
      const modelLimits = fullConfig.ai.modelLimits || {};
      const modelMaxTokens = modelLimits[quizConfig.model] || 16384;

      // Call chatCompletion (matching iOS lines 360-384)
      const aiContent = await chatCompletion({
        model: quizConfig.model,
        systemPrompt: systemPrompt,
        userPrompt: prompt,
        temperature: quizConfig.temperature,
        maxTokens: Math.min(
          modelMaxTokens,
          Math.max(quizConfig.maxTokens, 5000 + quizConfig.maxQuantity * 220)
        ),
        responseFormat: { type: 'json_object' },
        timeoutMs: quizConfig.timeoutMs,
      });

      // Parse JSON response (matching iOS lines 388-407)
      let quizzes;
      try {
        quizzes = JSON.parse(aiContent);

        if (!quizzes || typeof quizzes !== 'object') {
          throw new Error('Parsed result is not an object');
        }
      } catch (parseError) {
        console.error('[QuizService] Quiz parsing failed:', parseError);
        throw new Error('Unable to process AI response. The content may be too complex. Try breaking it into smaller sections.');
      }

      // Normalize to array (matching iOS lines 410-424)
      let normalizedQ: any[] = [];
      if (Array.isArray(quizzes)) {
        normalizedQ = quizzes;
      } else if (quizzes && typeof quizzes === 'object') {
        const obj = quizzes as any;
        const candidate =
          obj.questions ||
          obj.quizQuestions ||
          obj.items ||
          obj.data ||
          obj.results;
        if (Array.isArray(candidate)) {
          normalizedQ = candidate;
        }
      }

      // Cap at maximum quantity (matching iOS lines 427-429)
      const generatedQuestions = Array.isArray(normalizedQ)
        ? normalizedQ.slice(0, quizConfig.maxQuantity)
        : [];

      if (generatedQuestions.length < 3) {
        throw new Error(
          `Only ${generatedQuestions.length} quiz questions generated (minimum 3 required). Content may be too short for meaningful assessment.`
        );
      }

      request.onProgress?.(0.9, 'Saving quiz questions...');

      // Save quiz questions to database with SM2 initialization
      const questionsToInsert = generatedQuestions.map((q: any) => ({
        seed_id: request.seedId,
        user_id: request.userId,
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        difficulty: q.difficulty || 3,
        // Initialize SM2 fields
        interval: 1,
        repetitions: 0,
        easiness_factor: 2.5,
        next_due_date: getLocalDate(),
        last_reviewed_date: null,
        streak: 0,
        lapses: 0,
        quality_rating: null,
      }));

      const { data, error } = await supabase
        .from('quiz_questions')
        .insert(questionsToInsert)
        .select();

      if (error) {
        // Handle duplicate constraint violation (race condition)
        if (error.code === '23505') {
          console.warn('Duplicate quiz questions detected, fetching existing ones');
          return await this.getQuizQuestionsBySeed(request.seedId, request.userId);
        }

        throw new Error(`Failed to save quiz questions: ${error.message}`);
      }

      request.onProgress?.(1.0, 'Quiz questions ready!');

      return (data || []) as QuizQuestion[];
    } catch (error) {
      console.error('[QuizService] Error generating quiz questions:', error);
      throw error instanceof Error ? error : new Error('Failed to generate quiz questions. Please try again.');
    }
  }

  private async pollForCompletion(
    seedId: string,
    userId: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<QuizQuestion[]> {
    const maxAttempts = 60; // 2 minutes (2 second intervals)
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      attempts++;

      const progress = 0.2 + (attempts / maxAttempts) * 0.7;
      onProgress?.(progress, 'Generating quiz questions...');

      try {
        const questions = await this.getQuizQuestionsBySeed(seedId, userId);
        if (questions.length > 0) {
          return questions;
        }
      } catch (error) {
        console.error('Error polling for quiz questions:', error);
      }
    }

    throw new Error('Quiz generation timed out');
  }

  async reviewQuizQuestion(
    questionId: string,
    isCorrect: boolean
  ): Promise<QuizQuestion> {
    const supabase = getSupabaseClient();

    // Get current question
    const { data: currentQuestion, error: fetchError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (fetchError || !currentQuestion) {
      throw new Error('Failed to load quiz question');
    }

    // Check if already reviewed today
    const today = getLocalDate();
    if (currentQuestion.last_reviewed_date === today) {
      return currentQuestion as QuizQuestion;
    }

    // Convert quiz result to quality rating
    const quality = quizToQuality(isCorrect);

    // Calculate new SM2 values
    const sm2Result = calculateSM2({
      quality,
      repetitions: currentQuestion.repetitions || 0,
      interval: currentQuestion.interval || 1,
      easinessFactor: currentQuestion.easiness_factor || 2.5,
    });

    // Update streak and lapses
    const streak = isCorrect ? (currentQuestion.streak || 0) + 1 : 0;
    const lapses = !isCorrect ? (currentQuestion.lapses || 0) + 1 : currentQuestion.lapses || 0;

    // Update quiz question in database
    const { data: updatedQuestion, error: updateError } = await supabase
      .from('quiz_questions')
      .update({
        interval: sm2Result.interval,
        repetitions: sm2Result.repetitions,
        easiness_factor: sm2Result.easinessFactor,
        next_due_date: sm2Result.nextDueDate.toISOString().split('T')[0],
        last_reviewed: new Date().toISOString(),
        last_reviewed_date: today,
        streak,
        lapses,
      })
      .eq('id', questionId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update quiz question: ${updateError.message}`);
    }

    return updatedQuestion as QuizQuestion;
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
    }
  ): Promise<void> {
    const supabase = getSupabaseClient();

    // Score as decimal 0.0-1.0 (NOT percentage)
    const score =
      sessionData.totalItems > 0
        ? sessionData.correctItems / sessionData.totalItems
        : 0;

    const sessionRecord = {
      user_id: userId,
      seed_id: seedId,
      session_type: 'quiz' as const,
      total_items: sessionData.totalItems,
      correct_items: sessionData.correctItems,
      score,
      time_spent: sessionData.timeSpent,
      metadata: {
        ...sessionData.metadata,
        source: sessionData.metadata?.source || 'individual-practice',
        attempts: sessionData.attempts || [],
      },
      completed_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('learning_sessions')
      .insert(sessionRecord);

    if (error) {
      throw new Error(`Failed to save learning session: ${error.message}`);
    }
  }

  calculateQuizScore(attempts: QuizAttempt[]): {
    correct: number;
    total: number;
    percentage: number;
  } {
    const total = attempts.length;
    const correct = attempts.filter((attempt) => attempt.isCorrect).length;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

    return { correct, total, percentage };
  }

  async getQuizStatistics(
    seedId: string,
    userId: string
  ): Promise<{
    totalAttempts: number;
    averageScore: number;
    bestScore: number;
    totalTimeSpent: number;
    lastAttempt?: string;
  }> {
    const supabase = getSupabaseClient();

    const { data: sessions, error } = await supabase
      .from('learning_sessions')
      .select('*')
      .eq('seed_id', seedId)
      .eq('user_id', userId)
      .eq('session_type', 'quiz')
      .order('completed_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load learning history: ${error.message}`);
    }

    if (!sessions || sessions.length === 0) {
      return {
        totalAttempts: 0,
        averageScore: 0,
        bestScore: 0,
        totalTimeSpent: 0,
      };
    }

    const totalAttempts = sessions.length;
    const scores = sessions.map((s) => s.score || 0);
    const averageScore = Math.round(
      (scores.reduce((sum, score) => sum + score, 0) / totalAttempts) * 100
    ) / 100;
    const bestScore = Math.round(Math.max(...scores) * 100) / 100;
    const totalTimeSpent = sessions.reduce((sum, s) => sum + (s.time_spent || 0), 0);
    const lastAttempt = sessions[0]?.completed_at;

    return {
      totalAttempts,
      averageScore,
      bestScore,
      totalTimeSpent,
      lastAttempt,
    };
  }
}

export const quizService = new QuizService();
