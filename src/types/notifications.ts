export type NotificationType =
  | 'study_reminder'
  | 'spaced_repetition'
  | 'achievement'
  | 'content_ready'
  | 'daily_summary';

export type DeviceType = 'ios' | 'android' | 'web';

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  device_id?: string;
  device_type?: DeviceType;
  app_version?: string;
  created_at: string;
  updated_at: string;
  last_used_at: string;
  is_active: boolean;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  study_reminders: boolean;
  spaced_repetition: boolean;
  achievements: boolean;
  content_ready: boolean;
  daily_summary: boolean;
  preferred_time_start: string; // HH:MM:SS format
  preferred_time_end: string; // HH:MM:SS format
  timezone: string;
  frequency_limit: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationHistory {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  sent_at: string;
  delivered_at?: string;
  opened_at?: string;
  action_taken?: string;
  expo_message_id?: string;
  success: boolean;
  error_message?: string;
  is_read: boolean;
}

export interface NotificationContent {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: boolean;
  badge?: number;
  categoryIdentifier?: string;
}

export interface ScheduledNotification {
  type: NotificationType;
  content: NotificationContent;
  trigger: {
    type: 'date' | 'timeInterval' | 'daily' | 'weekly';
    date?: Date;
    seconds?: number;
    hour?: number;
    minute?: number;
    weekday?: number;
    repeats?: boolean;
  };
}

export interface NotificationPermissionStatus {
  status: 'granted' | 'denied' | 'undetermined';
  ios?: {
    allowAlert?: boolean;
    allowBadge?: boolean;
    allowSound?: boolean;
    allowCriticalAlerts?: boolean;
    allowProvisional?: boolean;
    allowAnnouncements?: boolean;
  };
  android?: {
    importance?: number;
  };
}

export interface SpacedRepetitionReminder {
  content_id: string;
  content_type: 'flashcard' | 'quiz';
  due_date: string;
  difficulty: number;
  title: string;
  seed_title?: string;
}

export interface StudyReminderData {
  daily_goal: number;
  current_progress: number;
  preferred_time: string;
  streak_count?: number;
}

export interface AchievementData {
  achievement_type: 'streak' | 'milestone' | 'completion' | 'mastery';
  achievement_value: number;
  description: string;
  reward_points?: number;
}

export interface ContentReadyData {
  seed_id: string;
  seed_title: string;
  content_type: 'pdf' | 'image' | 'audio' | 'video' | 'text';
  processing_type: 'extraction' | 'feynman' | 'analysis';
}

export interface PracticePromptData {
  prompt_type: 'flashcards' | 'quiz';
  seed_id?: string;
  seed_title?: string;
  due_count?: number;
  estimated_time?: number;
}

export interface NotificationQueue {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  content: NotificationContent;
  scheduled_for: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  retry_count: number;
  max_retries: number;
  created_at: string;
}

export interface NotificationAnalytics {
  user_id: string;
  notification_type: NotificationType;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  action_taken_count: number;
  date: string;
}