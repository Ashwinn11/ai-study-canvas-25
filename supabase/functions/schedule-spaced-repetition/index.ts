import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { generateSpacedRepetitionContent, getCurrentTimeInTimezone, isWithinQuietHours } from '../_shared/notification-helpers.ts';

/**
 * Scheduled function to find flashcards/quizzes due for review
 * and send spaced repetition reminders to users
 *
 * Should be run via Supabase cron: every 3 hours (cron format: 0 0 * * * * with /3)
 * Peak timing: 12:30 PM (research shows best engagement at lunch time)
 */

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

    console.log('[schedule-spaced-repetition] Starting scheduled job');

    // Get today's date in UTC
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Find all flashcards due for review today
    const { data: dueFlashcards, error: flashcardError } = await supabase
      .from('flashcards')
      .select('user_id, seed_id', { count: 'exact' })
      .lte('next_due_date', new Date().toISOString())
      .is('deleted_at', null);

    if (flashcardError) {
      throw new Error(`Failed to fetch due flashcards: ${flashcardError.message}`);
    }

    // Find all quiz questions due for review today
    const { data: dueQuizzes, error: quizError } = await supabase
      .from('quiz_questions')
      .select('user_id, seed_id', { count: 'exact' })
      .lte('next_due_date', new Date().toISOString())
      .is('deleted_at', null);

    if (quizError) {
      throw new Error(`Failed to fetch due quizzes: ${quizError.message}`);
    }

    // Combine and group by user
    const allDue = [...(dueFlashcards || []), ...(dueQuizzes || [])];
    const userDueMap = new Map<string, Set<string>>();

    for (const item of allDue) {
      if (!userDueMap.has(item.user_id)) {
        userDueMap.set(item.user_id, new Set());
      }
      userDueMap.get(item.user_id)!.add(item.seed_id);
    }

    console.log(`[schedule-spaced-repetition] Found ${userDueMap.size} users with due items`);

    // Get users with spaced_repetition enabled and their preferences
    const { data: activeUsers, error: userError } = await supabase
      .from('notification_preferences')
      .select(
        `
        user_id,
        spaced_repetition,
        preferred_time_start,
        preferred_time_end,
        timezone
      `
      )
      .eq('spaced_repetition', true);

    if (userError) {
      throw new Error(`Failed to fetch active users: ${userError.message}`);
    }

    // Get user timezones for those not in preferences
    const userIds = Array.from(userDueMap.keys());
    const { data: userTimezones, error: tzError } = await supabase
      .from('profiles')
      .select('id, tz')
      .in('id', userIds);

    if (tzError) {
      console.error('Failed to fetch user timezones:', tzError);
    }

    const tzMap = new Map(userTimezones?.map(u => [u.id, u.tz]) || []);
    const prefsMap = new Map(activeUsers?.map(u => [u.user_id, u]) || []);

    // Send notifications to users with due items
    let notificationsSent = 0;
    let notificationsFailed = 0;

    for (const [userId, seedIds] of userDueMap.entries()) {
      try {
        const prefs = prefsMap.get(userId);

        // Skip if user doesn't have spaced repetition enabled
        if (!prefs || !prefs.spaced_repetition) {
          continue;
        }

        // Check if it's within their preferred time window
        const timezone = prefs.timezone || tzMap.get(userId) || 'UTC';
        const currentTime = getCurrentTimeInTimezone(timezone);
        const inWindow = isWithinQuietHours(prefs.preferred_time_start, prefs.preferred_time_end, currentTime);

        if (!inWindow) {
          console.log(`[schedule-spaced-repetition] User ${userId} outside notification window`);
          continue;
        }

        // Generate notification content
        const dueCount = seedIds.size;
        const { title, body } = generateSpacedRepetitionContent(dueCount);

        // Call send-push-notification function
        const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${pushServiceSecret}`,
          },
          body: JSON.stringify({
            userIds: [userId],
            notificationType: 'spaced_repetition',
            title,
            body,
            data: {
              type: 'spaced_repetition',
              due_count: dueCount,
              seed_ids: Array.from(seedIds),
            },
            channelId: 'spaced-repetition',
          }),
        });

        if (response.ok) {
          notificationsSent++;
          console.log(`[schedule-spaced-repetition] Sent notification to ${userId}`);
        } else {
          notificationsFailed++;
          const error = await response.text();
          console.error(`Failed to send notification to ${userId}:`, error);
        }
      } catch (error) {
        notificationsFailed++;
        console.error(`Error processing user ${userId}:`, error);
      }
    }

    const result = {
      success: notificationsFailed === 0,
      usersProcessed: userDueMap.size,
      notificationsSent,
      notificationsFailed,
      timestamp: new Date().toISOString(),
    };

    console.log('[schedule-spaced-repetition] Job complete:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in schedule-spaced-repetition:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process spaced repetition notifications',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
