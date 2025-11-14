// Database types matching the iOS app schema
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          created_at: string;
          timezone: string | null;
          daily_goal: number | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          created_at?: string;
          timezone?: string | null;
          daily_goal?: number | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          created_at?: string;
          timezone?: string | null;
          daily_goal?: number | null;
          updated_at?: string | null;
        };
      };
      seeds: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content_type: 'pdf' | 'image' | 'audio' | 'video' | 'text';
          content_url: string | null;
          content_text: string | null;
          file_size: number | null;
          feynman_explanation: string | null;
          processing_status: 'pending' | 'extracting' | 'analyzing' | 'completed' | 'failed';
          intent: 'Educational' | 'Comprehension' | 'Reference' | 'Analytical' | 'Procedural' | null;
          language_code: string | null;
          is_mixed_language: boolean | null;
          language_metadata: Json | null;
          exam_id: string | null;
          exam_name: string | null;
          exam_names: string[] | null;
          is_starred: boolean;
          is_archived: boolean;
          confidence_score: number | null;
          extraction_metadata: Json | null;
          processing_error: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          content_type: 'pdf' | 'image' | 'audio' | 'video' | 'text';
          content_url?: string | null;
          content_text?: string | null;
          file_size?: number | null;
          feynman_explanation?: string | null;
          processing_status?: 'pending' | 'extracting' | 'analyzing' | 'completed' | 'failed';
          intent?: 'Educational' | 'Comprehension' | 'Reference' | 'Analytical' | 'Procedural' | null;
          language_code?: string | null;
          is_mixed_language?: boolean | null;
          language_metadata?: Json | null;
          exam_id?: string | null;
          exam_name?: string | null;
          exam_names?: string[] | null;
          is_starred?: boolean;
          is_archived?: boolean;
          confidence_score?: number | null;
          extraction_metadata?: Json | null;
          processing_error?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          content_type?: 'pdf' | 'image' | 'audio' | 'video' | 'text';
          content_url?: string | null;
          content_text?: string | null;
          file_size?: number | null;
          feynman_explanation?: string | null;
          processing_status?: 'pending' | 'extracting' | 'analyzing' | 'completed' | 'failed';
          intent?: 'Educational' | 'Comprehension' | 'Reference' | 'Analytical' | 'Procedural' | null;
          language_code?: string | null;
          is_mixed_language?: boolean | null;
          language_metadata?: Json | null;
          exam_id?: string | null;
          exam_name?: string | null;
          exam_names?: string[] | null;
          is_starred?: boolean;
          is_archived?: boolean;
          confidence_score?: number | null;
          extraction_metadata?: Json | null;
          processing_error?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      flashcards: {
        Row: {
          id: string;
          seed_id: string;
          user_id: string;
          question: string;
          answer: string;
          difficulty: number; // 1-5
          interval: number;
          repetitions: number;
          easiness_factor: number;
          next_due_date: string;
          last_reviewed: string | null;
          quality_rating: number | null;
          streak: number;
          lapses: number;
          quality_score: number | null;
          ai_confidence: number | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          seed_id: string;
          user_id: string;
          question: string;
          answer: string;
          difficulty?: number;
          interval?: number;
          repetitions?: number;
          easiness_factor?: number;
          next_due_date?: string;
          last_reviewed?: string | null;
          quality_rating?: number | null;
          streak?: number;
          lapses?: number;
          quality_score?: number | null;
          ai_confidence?: number | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          seed_id?: string;
          user_id?: string;
          question?: string;
          answer?: string;
          difficulty?: number;
          interval?: number;
          repetitions?: number;
          easiness_factor?: number;
          next_due_date?: string;
          last_reviewed?: string | null;
          quality_rating?: number | null;
          streak?: number;
          lapses?: number;
          quality_score?: number | null;
          ai_confidence?: number | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      quiz_questions: {
        Row: {
          id: string;
          seed_id: string;
          user_id: string;
          question: string;
          options: string[];
          correct_answer: string;
          difficulty: number;
          interval: number;
          repetitions: number;
          easiness_factor: number;
          next_due_date: string;
          last_reviewed: string | null;
          quality_rating: number | null;
          streak: number;
          lapses: number;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          seed_id: string;
          user_id: string;
          question: string;
          options: string[];
          correct_answer: string;
          difficulty?: number;
          interval?: number;
          repetitions?: number;
          easiness_factor?: number;
          next_due_date?: string;
          last_reviewed?: string | null;
          quality_rating?: number | null;
          streak?: number;
          lapses?: number;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          seed_id?: string;
          user_id?: string;
          question?: string;
          options?: string[];
          correct_answer?: string;
          difficulty?: number;
          interval?: number;
          repetitions?: number;
          easiness_factor?: number;
          next_due_date?: string;
          last_reviewed?: string | null;
          quality_rating?: number | null;
          streak?: number;
          lapses?: number;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      exams: {
        Row: {
          id: string;
          user_id: string;
          subject_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject_name?: string;
          created_at?: string;
        };
      };
      exam_seeds: {
        Row: {
          id: string;
          exam_id: string;
          seed_id: string;
          user_id: string;
          added_at: string;
        };
        Insert: {
          id?: string;
          exam_id: string;
          seed_id: string;
          user_id: string;
          added_at?: string;
        };
        Update: {
          id?: string;
          exam_id?: string;
          seed_id?: string;
          user_id?: string;
          added_at?: string;
        };
      };
      learning_sessions: {
        Row: {
          id: string;
          user_id: string;
          seed_id: string;
          session_type: 'flashcards' | 'quiz';
          started_at: string;
          completed_at: string | null;
          total_items: number;
          correct_items: number;
          score: number; // 0-1 decimal
          time_spent: number | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          seed_id: string;
          session_type: 'flashcards' | 'quiz';
          started_at?: string;
          completed_at?: string | null;
          total_items: number;
          correct_items: number;
          score: number;
          time_spent?: number | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          seed_id?: string;
          session_type?: 'flashcards' | 'quiz';
          started_at?: string;
          completed_at?: string | null;
          total_items?: number;
          correct_items?: number;
          score?: number;
          time_spent?: number | null;
          metadata?: Json | null;
        };
      };
      notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          study_reminders_enabled: boolean;
          review_reminders_enabled: boolean;
          achievement_notifications_enabled: boolean;
          preferred_reminder_time: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          study_reminders_enabled?: boolean;
          review_reminders_enabled?: boolean;
          achievement_notifications_enabled?: boolean;
          preferred_reminder_time?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          study_reminders_enabled?: boolean;
          review_reminders_enabled?: boolean;
          achievement_notifications_enabled?: boolean;
          preferred_reminder_time?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
};

// Helper types for easier usage
export type Seed = Database['public']['Tables']['seeds']['Row'];
export type Flashcard = Database['public']['Tables']['flashcards']['Row'];
export type QuizQuestion = Database['public']['Tables']['quiz_questions']['Row'];
export type Exam = Database['public']['Tables']['exams']['Row'];
export type ExamSeed = Database['public']['Tables']['exam_seeds']['Row'];
export type LearningSession = Database['public']['Tables']['learning_sessions']['Row'];
export type User = Database['public']['Tables']['users']['Row'];
