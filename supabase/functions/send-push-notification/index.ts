import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ExpoPushClient, ExpoPushMessage } from '../_shared/expo-push.ts';
import {
  getActivePushTokens,
  logNotification,
  canNotifyUser,
  deactivatePushToken,
} from '../_shared/notification-helpers.ts';

interface SendPushNotificationRequest {
  userIds: string[];
  notificationType: 'study_reminder' | 'spaced_repetition' | 'achievement';
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  channelId?: string;
  categoryId?: string;
}

interface SendPushNotificationResponse {
  success: boolean;
  sentCount: number;
  failedCount: number;
  results: {
    userId: string;
    tokenCount: number;
    sent: number;
    failed: number;
    errors: string[];
  }[];
}

Deno.serve(async (req: Request) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
    const serviceSecret = Deno.env.get('PUSH_SERVICE_SECRET');

    if (!supabaseUrl || !supabaseServiceKey || !expoAccessToken || !serviceSecret) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate service secret via Authorization header only
    const authHeader = req.headers.get('authorization') ?? '';
    const bearerToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : null;

    if (bearerToken !== serviceSecret) {
      console.warn('[send-push-notification] Unauthorized invocation (invalid or missing PUSH_SERVICE_SECRET)');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const expoPush = new ExpoPushClient(expoAccessToken);

    // Parse request body
    const payload: SendPushNotificationRequest = await req.json();

    // Validate payload
    if (!Array.isArray(payload.userIds) || payload.userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'userIds must be a non-empty array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.title || !payload.body) {
      return new Response(
        JSON.stringify({ error: 'title and body are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize response tracking
    let totalSent = 0;
    let totalFailed = 0;
    const results: SendPushNotificationResponse['results'] = [];

    // Process each user
    for (const userId of payload.userIds) {
      try {
        // Get user preferences to check if we should notify them
        const { data: userPrefs, error: userError } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (userError) {
          console.error(`Error fetching preferences for user ${userId}:`, userError);
          results.push({
            userId,
            tokenCount: 0,
            sent: 0,
            failed: 1,
            errors: ['Failed to fetch user preferences'],
          });
          totalFailed++;
          continue;
        }

        // Get user's timezone
        const { data: user, error: userDataError } = await supabase
          .from('profiles')
          .select('tz')
          .eq('id', userId)
          .maybeSingle();

        if (userDataError) {
          console.error(`Error fetching user data for ${userId}:`, userDataError);
          results.push({
            userId,
            tokenCount: 0,
            sent: 0,
            failed: 1,
            errors: ['Failed to fetch user data'],
          });
          totalFailed++;
          continue;
        }

        // Get active push tokens for this user
        const tokens = await getActivePushTokens(userId, supabase);

        if (tokens.length === 0) {
          console.log(`No active push tokens for user ${userId}`);
          results.push({
            userId,
            tokenCount: 0,
            sent: 0,
            failed: 0,
            errors: ['No active push tokens'],
          });
          continue;
        }

        // Prepare messages for each token
        const messages: ExpoPushMessage[] = tokens.map(token => ({
          to: token,
          title: payload.title,
          body: payload.body,
          data: payload.data,
          badge: payload.badge,
          sound: 'default',
          priority: 'high',
          channelId: payload.channelId,
          categoryId: payload.categoryId,
        }));

        // Send notifications
        let sentCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        for (const message of messages) {
          const response = await expoPush.sendNotification(message);

          if (response.status === 'ok') {
            sentCount++;
            totalSent++;

            // Log successful notification
            await logNotification(supabase, {
              user_id: userId,
              notification_type: payload.notificationType,
              title: payload.title,
              body: payload.body,
              data: payload.data,
              expo_message_id: response.id,
              success: true,
            });
          } else {
            failedCount++;
            totalFailed++;

            const errorMsg = response.details?.error || response.message || 'Unknown error';
            errors.push(errorMsg);

            // If token is invalid, deactivate it
            if (errorMsg.includes('InvalidCredentials') || errorMsg.includes('DeviceNotRegistered')) {
              await deactivatePushToken(userId, message.to as string, supabase);
            }

            // Log failed notification
            await logNotification(supabase, {
              user_id: userId,
              notification_type: payload.notificationType,
              title: payload.title,
              body: payload.body,
              data: payload.data,
              success: false,
              error_message: errorMsg,
            });
          }
        }

        results.push({
          userId,
          tokenCount: tokens.length,
          sent: sentCount,
          failed: failedCount,
          errors,
        });
      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
        results.push({
          userId,
          tokenCount: 0,
          sent: 0,
          failed: 1,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        });
        totalFailed++;
      }
    }

    // Return results
    const response: SendPushNotificationResponse = {
      success: totalFailed === 0,
      sentCount: totalSent,
      failedCount: totalFailed,
      results,
    };

    return new Response(JSON.stringify(response), {
      status: totalFailed === 0 ? 200 : 207, // 207 Multi-Status if partial failure
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
