import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generateStudyReminderContent, getCurrentTimeInTimezone, isWithinQuietHours } from '../_shared/notification-helpers.ts';

/**
 * Scheduled function to send daily study reminders
 * Sends personalized reminders based on user's daily goal and current progress
 *
 * Should be run via Supabase cron: 0 18 * * * (6 PM UTC, adjust for timezones)
 * Default time: User's preferred time or 6 PM if not set
 */

interface UserStudyProgress {
  user_id: string;
  daily_cards_goal: number;
  total_cards_reviewed: number;
  tz: string;
  current_streak?: number;
}

Deno.serve(async (req: Request) => {
  // Verify this is a legitimate cron request from Supabase
  const authHeader = req.headers.get('authorization');
  const expectedToken = Deno.env.get('CRON_SECRET');

  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const pushServiceSecret = Deno.env.get('PUSH_SERVICE_SECRET');

    if (!supabaseUrl || !supabaseServiceKey || !pushServiceSecret) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[send-study-reminder] Starting scheduled job');

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Get all users with study reminders enabled
    const { data: users, error: userError } = await supabase
      .from('notification_preferences')
      .select(
        `
        user_id,
        study_reminders,
        preferred_time_start,
        preferred_time_end,
        timezone
      `
      )
      .eq('study_reminders', true);

    if (userError) {
      throw new Error(`Failed to fetch users: ${userError.message}`);
    }

    if (!users || users.length === 0) {
      console.log('[send-study-reminder] No users with study reminders enabled');
      return new Response(JSON.stringify({ notificationsSent: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[send-study-reminder] Found ${users.length} users with reminders enabled`);

    // Get user data (goals, timezones)
    const userIds = users.map(u => u.user_id);
    const { data: userData, error: dataError } = await supabase
      .from('profiles')
      .select('id, tz, daily_cards_goal')
      .in('id', userIds);

    if (dataError) {
      throw new Error(`Failed to fetch user data: ${dataError.message}`);
    }

    const userDataMap = new Map(userData?.map(u => [u.id, u]) || []);

    // Get user stats for today's progress
    const { data: stats, error: statsError } = await supabase
      .from('user_stats_historical')
      .select('user_id, current_streak')
      .in('user_id', userIds);

    if (statsError) {
      console.error('Failed to fetch user stats:', statsError);
    }

    const statsMap = new Map(stats?.map(s => [s.user_id, s]) || []);

    // Get today's learning sessions to calculate progress
    const { data: sessions, error: sessionError } = await supabase
      .from('learning_sessions')
      .select('user_id, total_items')
      .in('user_id', userIds)
      .gte('started_at', `${today}T00:00:00Z`)
      .lte('started_at', `${today}T23:59:59Z`);

    if (sessionError) {
      console.error('Failed to fetch sessions:', sessionError);
    }

    // Calculate today's progress
    const progressMap = new Map<string, number>();
    for (const session of sessions || []) {
      const current = progressMap.get(session.user_id) || 0;
      progressMap.set(session.user_id, current + (session.total_items || 0));
    }

    // Send notifications to users
    let notificationsSent = 0;
    let notificationsFailed = 0;

    for (const userPref of users) {
      try {
        const userData = userDataMap.get(userPref.user_id);
        if (!userData) {
          console.warn(`[send-study-reminder] No user data for ${userPref.user_id}`);
          continue;
        }

        // Check if it's within their preferred time window
        const timezone = userPref.timezone || userData.tz || 'UTC';
        const currentTime = getCurrentTimeInTimezone(timezone);
        const inWindow = isWithinQuietHours(
          userPref.preferred_time_start,
          userPref.preferred_time_end,
          currentTime
        );

        if (!inWindow) {
          console.log(`[send-study-reminder] User ${userPref.user_id} outside notification window`);
          continue;
        }

        // Calculate progress
        const dailyGoal = userData.daily_cards_goal || 20;
        const cardsDone = progressMap.get(userPref.user_id) || 0;
        const remaining = Math.max(0, dailyGoal - cardsDone);
        const streakCount = statsMap.get(userPref.user_id)?.current_streak || 0;

        // Generate notification content
        const { title, body } = generateStudyReminderContent(remaining, dailyGoal, streakCount);

        // Call send-push-notification function
        const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${pushServiceSecret}`,
          },
          body: JSON.stringify({
            userIds: [userPref.user_id],
            notificationType: 'study_reminder',
            title,
            body,
            data: {
              type: 'study_reminder',
              daily_goal: dailyGoal,
              cards_done: cardsDone,
              cards_remaining: remaining,
              streak_count: streakCount,
            },
            channelId: 'study-reminders',
          }),
        });

        if (response.ok) {
          notificationsSent++;
          console.log(`[send-study-reminder] Sent reminder to ${userPref.user_id} (${remaining}/${dailyGoal})`);
        } else {
          notificationsFailed++;
          const error = await response.text();
          console.error(`Failed to send reminder to ${userPref.user_id}:`, error);
        }
      } catch (error) {
        notificationsFailed++;
        console.error(`Error processing user ${userPref.user_id}:`, error);
      }
    }

    const result = {
      success: notificationsFailed === 0,
      usersProcessed: users.length,
      notificationsSent,
      notificationsFailed,
      timestamp: new Date().toISOString(),
    };

    console.log('[send-study-reminder] Job complete:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in send-study-reminder:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process study reminders',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
