/**
 * TypeScript interfaces for Supabase RPC function responses
 * Ensures type safety when calling optimized RPC functions
 */

/**
 * Response from get_user_dashboard_stats RPC
 * Aggregates all user statistics in a single call
 */
export interface DashboardStatsRPC {
  historical: {
    total_cards_reviewed: number;
    total_sessions: number;
    total_study_minutes: number;
    total_seeds_created: number;
    longest_streak: number;
    peak_mastered_cards: number;
    peak_accuracy: number;
    current_streak: number;
  };
  inventory: {
    cardsInLibrary: number;
    masteredInLibrary: number;
    activeSeedsCount: number;
  };
  preferences: {
    weeklyGoalMinutes: number;
    dailyCardsGoal: number;
    xp: number;
  };
  today: {
    cardsToday: number;
    minutesToday: number;
  };
  accuracy: {
    avgAccuracy: number;
    avgScore: number;
  };
  grades: {
    totalAGrades: number;
    averageGrade: string;
  };
}

/**
 * Response from get_exam_with_review_stats RPC
 * Returns exam details with associated seeds and review statistics
 */
export interface ExamDetailRPC {
  exam: {
    id: string;
    subject_name: string;
    created_at: string;
    updated_at: string;
  };
  seeds: Array<{
    id: string;
    title: string;
    content_type: string;
    processing_status: string;
    created_at: string;
    flashcard_count: number;
    quiz_count: number;
  }>;
  review_stats: {
    totalItems: number;
    dueToday: number;
    overdue: number;
  };
}

/**
 * Individual review item from get_review_items RPC
 * Can be either a flashcard or quiz question
 */
export interface ReviewItemRPC {
  item_id: string;
  item_type: 'flashcard' | 'quiz';
  question: string;
  answer?: string;
  options?: any;
  correct_answer?: number;
  difficulty: number;
  seed_id: string;
  seed_title: string;
  next_due_date: string;
  repetitions: number;
  easiness_factor: number;
  interval_days: number;
}

/**
 * Response from get_seed_detail RPC
 * Comprehensive seed information with counts and associations
 */
export interface SeedDetailRPC {
  seed: {
    id: string;
    title: string;
    content_type: string;
    processing_status: string;
    confidence_score: number;
    created_at: string;
    updated_at: string;
    language_code: string;
    intent: string;
  };
  counts: {
    flashcards: number;
    quizQuestions: number;
  };
  exams: Array<{
    id: string;
    subject_name: string;
  }>;
  recentSessions: Array<{
    completed_at: string;
    session_type: string;
    score: number;
    time_spent: number;
  }>;
}

/**
 * Response from batch_update_sm2 RPC
 * Returns count of updated items
 */
export interface BatchSM2UpdateRPC {
  updatedCount: number;
}

/**
 * Response from check_content_exists RPC
 * Checks if content has already been generated for a seed
 */
export interface ContentExistsRPC {
  hasFlashcards: boolean;
  hasQuiz: boolean;
  flashcardCount: number;
  quizCount: number;
}
