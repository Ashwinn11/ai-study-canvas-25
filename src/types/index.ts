export interface AnalyticsEvent {
  name: string;
  payload?: Record<string, unknown>;
  timestamp: number;
}

export type ContentType = "pdf" | "image" | "audio" | "text" | "youtube";

export type ContentIntent =
  | "Educational"
  | "Comprehension"
  | "Reference"
  | "Analytical"
  | "Procedural";

export interface Seed {
  id: string;
  user_id: string;
  title: string;
  content_type: ContentType;
  content_url?: string;
  content_text?: string;
  file_size?: number;
  is_starred: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  // Content extraction fields
  original_content?: string;
  // Feynman technique fields
  feynman_explanation?: string;
  // AI processing fields
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
  language_code?: string;
  is_mixed_language?: boolean;
  language_metadata?: Record<string, number> | null;
  // Content intent for adaptive question generation
  intent?: ContentIntent; // Determines flashcard/quiz generation strategy
  // Exam association fields
  exam_id?: string;
  exam_name?: string;
  exam_names?: string[]; // Multiple exam associations
}

export type SeedFilter = "all" | "exam";

// Flashcard types
export interface Flashcard {
  id: string;
  seed_id: string;
  user_id: string;
  question: string;
  answer: string;
  difficulty: number; // 1-5 scale
  created_at: string;
  updated_at: string;
  // SM2 algorithm fields (optional, for future use)
  interval?: number;
  repetitions?: number;
  easiness_factor?: number;
  next_due_date?: string;
  last_reviewed?: string;
  quality_rating?: number; // 0-5 scale for SM2
  streak?: number;
  lapses?: number;
  // Quality tracking fields
  quality_score?: number; // 0.0-1.0 AI quality score
  ai_confidence?: number; // 0.0-1.0 AI confidence score
}

export interface FlashcardProgress {
  card_id: string;
  is_known: boolean;
  attempts: number;
  last_reviewed: string;
}

// Quiz types
export interface QuizQuestion {
  id: string;
  seed_id: string;
  user_id: string;
  question: string;
  options: string[]; // Array of 4 options
  correct_answer: number; // Index of correct option (0-3)
  difficulty: number; // 1-5 scale
  created_at: string;
  updated_at: string;
  // SM2 algorithm fields (optional, for future use)
  interval?: number;
  repetitions?: number;
  easiness_factor?: number;
  next_due_date?: string;
  last_reviewed?: string;
  quality_rating?: number; // 0-5 scale for SM2
  streak?: number;
  lapses?: number;
  // Quality tracking fields
  quality_score?: number; // 0.0-1.0 AI quality score
  ai_confidence?: number; // 0.0-1.0 AI confidence score
}

export interface QuizAttempt {
  question_id: string;
  selected_answer: number;
  is_correct: boolean;
  time_spent: number; // seconds
}

export interface QuizSession {
  id: string;
  seed_id: string;
  questions: QuizQuestion[];
  attempts: QuizAttempt[];
  score: number; // percentage
  completed_at?: string;
  time_spent: number; // total seconds
}

// User Progress types
export interface UserProgress {
  id: string;
  user_id: string;
  seed_id: string;
  activity_type: "flashcards" | "quiz";
  content_id?: string; // References flashcard or quiz question ID
  score?: number; // Score as percentage (0-100)
  is_correct?: boolean; // For individual question attempts
  time_spent?: number; // Time spent in seconds
  completed_at: string;
  metadata?: Record<string, any>; // Additional data like attempts, difficulty level, etc.
}

// Content Generation types
export interface GeneratedContent {
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
  generatedAt: string;
  sourceContent: string;
  confidence: number;
}

export interface ContentGenerationRequest {
  seedId: string;
  userId: string;
  contentType: "flashcards" | "quiz" | "both";
  difficulty?: number;
  quantity?: {
    flashcards?: number;
    quizQuestions?: number;
  };
}

// Learning Activity types
export type LearningMode = "flashcards" | "quiz";

export interface LearningSession {
  id: string;
  seed_id: string;
  user_id: string;
  mode: LearningMode;
  started_at: string;
  completed_at?: string;
  progress_data: Record<string, any>;
}

// Learning Sessions (from database)
export interface LearningSessionRecord {
  id: string;
  user_id: string;
  seed_id: string;
  session_type: "flashcards" | "quiz";
  started_at: string;
  completed_at?: string;
  total_items: number;
  correct_items: number;
  score?: number; // Score as percentage
  time_spent?: number; // Time spent in seconds
  metadata?: Record<string, any>; // Session-specific data
}

// Exam types
export interface Exam {
  id: string;
  user_id: string;
  subject_name: string;
  created_at: string;
  updated_at: string;
}

export interface ExamSeed {
  id: string;
  exam_id: string;
  seed_id: string;
  user_id: string;
  added_at: string;
}

export interface ExamWithSeeds extends Exam {
  seeds: Seed[];
  seedCount: number;
}

// Review Session types
export interface ReviewItem {
  id: string;
  type: "flashcard" | "quiz";
  seed_id: string;
  seed_title: string;
  content: Flashcard | QuizQuestion;
  next_due_date?: string;
  interval?: number;
  repetitions?: number;
  easiness_factor?: number;
}

export interface ReviewSession {
  id?: string;
  exam_id: string;
  exam_name: string;
  user_id: string;
  items: ReviewItem[];
  started_at: string;
  completed_at?: string;
  total_items: number;
  completed_items: number;
  correct_items: number;
  session_score?: number;
}

export interface ExamReviewStats {
  exam_id: string;
  total_items: number;
  due_today: number;
  overdue: number;
  available_items: number;
  completed_today: number;
  average_score?: number; // Deprecated - use average_grade instead
  average_grade?: string; // Letter grade from exam reports (A+, A, B+, B, C+, C, D+, D, F)
  last_reviewed?: string;
  next_due_date?: string;
}

export type ReviewPriority = "overdue" | "due" | "available";

export interface ReviewItemWithPriority extends ReviewItem {
  priority: ReviewPriority;
  days_until_due: number;
}

// Review Statistics for exam overview
export interface ReviewStats {
  examId: string;
  totalItems: number;
  dueToday: number;
  overdue: number;
  upcoming: number;
  nextReviewDate?: string;
  averageScore?: number;
  averageGrade?: string; // Letter grade: A, B, C, D, F
}

// Review Session State
export interface ReviewSessionState {
  examId: string;
  examName: string;
  examDate?: string;
  items: ReviewItem[];
  currentIndex: number;
  results: Map<string, number>; // itemId -> quality rating
  startedAt: string;
}

// Review Session Result
export interface ReviewSessionResult {
  examId: string;
  totalItems: number;
  flashcardResults: {
    easy: number; // quality 5
    medium: number; // quality 3
    difficult: number; // quality 1
  };
  quizResults: {
    correct: number; // quality 4-5
    incorrect: number; // quality 0-2
  };
  averageQuality: number;
  completedAt: string;
}

// Notes generation types
export interface NotesGenerationResult {
  content: string;
  wordCount: number;
  estimatedReadTime: number;
}

// Re-export notification types for convenience
export type {
  NotificationType,
  DeviceType,
  PushToken,
  NotificationPreferences,
  NotificationHistory,
  NotificationContent,
  ScheduledNotification,
  NotificationPermissionStatus,
  SpacedRepetitionReminder,
  StudyReminderData,
  AchievementData,
  ContentReadyData,
  PracticePromptData,
  NotificationQueue,
  NotificationAnalytics,
} from "./notifications";
