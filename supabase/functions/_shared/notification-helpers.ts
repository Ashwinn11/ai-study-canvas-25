/**
 * Notification Helper Functions
 * Timezone handling, preference checking, content generation
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface NotificationPreferences {
  study_reminders: boolean;
  spaced_repetition: boolean;
  achievements: boolean;
  content_ready: boolean;
  daily_summary: boolean;
  preferred_time_start: string; // HH:MM:SS
  preferred_time_end: string; // HH:MM:SS
  timezone: string;
  frequency_limit: number;
}

export interface UserWithPreferences {
  id: string;
  tz: string;
  daily_cards_goal: number;
  preferences: NotificationPreferences | null;
}

/**
 * Convert UTC time to user's local timezone
 */
export function getLocalTime(utcDate: Date, timezone: string): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(utcDate);
  const dateMap: Record<string, string> = {};

  for (const part of parts) {
    dateMap[part.type] = part.value;
  }

  return new Date(
    parseInt(dateMap['year']),
    parseInt(dateMap['month']) - 1,
    parseInt(dateMap['day']),
    parseInt(dateMap['hour']),
    parseInt(dateMap['minute']),
    parseInt(dateMap['second'])
  );
}

/**
 * Get current time in user's timezone
 */
export function getCurrentTimeInTimezone(timezone: string): Date {
  return getLocalTime(new Date(), timezone);
}

/**
 * Convert time string (HH:MM:SS) to minutes since midnight
 */
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  return hours * 60 + minutes + (seconds || 0) / 60;
}

/**
 * Check if current time is within quiet hours for user
 */
export function isWithinQuietHours(
  preferredTimeStart: string,
  preferredTimeEnd: string,
  currentTimeInTimezone: Date
): boolean {
  const currentMinutes = currentTimeInTimezone.getHours() * 60 + currentTimeInTimezone.getMinutes();
  const startMinutes = timeToMinutes(preferredTimeStart);
  const endMinutes = timeToMinutes(preferredTimeEnd);

  // Handle overnight ranges (e.g., 22:00 - 08:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Check if user can receive notifications right now
 */
export async function canNotifyUser(
  user: UserWithPreferences,
  notificationType: 'study_reminder' | 'spaced_repetition' | 'achievement',
  supabase: SupabaseClient
): Promise<boolean> {
  // Get preferences
  const preferences = user.preferences;
  if (!preferences) {
    // Default to true if no preferences (new user)
    return true;
  }

  // Check if notification type is enabled
  const typeEnabled = preferences[notificationType];
  if (!typeEnabled) {
    return false;
  }

  // Check quiet hours
  const userTimezone = preferences.timezone || user.tz || 'UTC';
  const currentTime = getCurrentTimeInTimezone(userTimezone);
  const inQuietHours = isWithinQuietHours(
    preferences.preferred_time_start,
    preferences.preferred_time_end,
    currentTime
  );

  if (!inQuietHours) {
    return false;
  }

  // Check frequency limit (notifications in last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const { count, error } = await supabase
    .from('notification_history')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('notification_type', notificationType)
    .gte('sent_at', oneDayAgo.toISOString());

  if (error) {
    console.error('Error checking notification frequency:', error);
    return true; // Allow on error
  }

  return (count || 0) < preferences.frequency_limit;
}

/**
 * Generate notification content for spaced repetition
 */
export function generateSpacedRepetitionContent(dueCount: number): {
  title: string;
  body: string;
} {
  const titles = [
    '📚 Review time!',
    '🧠 Time to learn!',
    '✨ Keep going!',
    '🎯 Ready to review?',
  ];

  const title = titles[Math.floor(Math.random() * titles.length)];
  const body = `${dueCount} card${dueCount > 1 ? 's' : ''} ready for review`;

  return { title, body };
}

/**
 * Generate notification content for study reminder
 */
export function generateStudyReminderContent(
  remaining: number,
  dailyGoal: number,
  streakCount?: number
): {
  title: string;
  body: string;
} {
  const percentage = Math.round(((dailyGoal - remaining) / dailyGoal) * 100);

  const titles = [
    '🎯 Time to study!',
    '📖 Let\'s learn!',
    '💪 Keep the streak!',
    '⭐ You\'ve got this!',
  ];

  let body: string;

  if (remaining <= 0) {
    body = 'Great job! Daily goal reached! 🎉';
  } else if (remaining <= 2) {
    body = `Just ${remaining} more card${remaining > 1 ? 's' : ''}!`;
  } else {
    body = `${remaining} cards left • ${percentage}% done`;
  }

  if (streakCount && streakCount > 0) {
    body += ` • 🔥 ${streakCount} day streak`;
  }

  const title = titles[Math.floor(Math.random() * titles.length)];

  return { title, body };
}

/**
 * Get all active push tokens for a user
 */
export async function getActivePushTokens(
  userId: string,
  supabase: SupabaseClient
): Promise<string[]> {
  const { data, error } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching push tokens:', error);
    return [];
  }

  return data?.map(t => t.token) || [];
}

/**
 * Log notification to history
 */
export async function logNotification(
  supabase: SupabaseClient,
  payload: {
    user_id: string;
    notification_type: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    expo_message_id?: string;
    success: boolean;
    error_message?: string;
  }
): Promise<void> {
  const { error } = await supabase
    .from('notification_history')
    .insert({
      user_id: payload.user_id,
      notification_type: payload.notification_type,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      expo_message_id: payload.expo_message_id,
      success: payload.success,
      error_message: payload.error_message,
      is_read: false,
      sent_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error logging notification:', error);
  }
}

/**
 * Mark a push token as inactive (user uninstalled or revoked permission)
 */
export async function deactivatePushToken(
  userId: string,
  token: string,
  supabase: SupabaseClient
): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('token', token);

  if (error) {
    console.error('Error deactivating push token:', error);
  }
}
