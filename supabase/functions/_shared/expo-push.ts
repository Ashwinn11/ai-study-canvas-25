/**
 * Expo Push Notifications API Client
 * Handles sending push notifications via Expo's push service
 */

export interface ExpoPushMessage {
  to: string | string[];
  sound?: string;
  title?: string;
  body?: string;
  badge?: number;
  data?: Record<string, any>;
  ttl?: number;
  expiration?: number;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
  mutableContent?: boolean;
  categoryId?: string;
}

export interface ExpoPushResponse {
  id: string;
  data?: Record<string, any>;
  status?: 'ok' | 'error';
  message?: string;
  details?: {
    error?: string;
    code?: string;
  };
}

export interface ExpoPushTicket {
  id: string;
  status: 'ok' | 'error';
  message?: string;
  details?: {
    error?: string;
    code?: string;
  };
}

export class ExpoPushClient {
  private baseUrl = 'https://exp.host/--/api/v2/push/send';
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Send a single push notification
   */
  async sendNotification(message: ExpoPushMessage): Promise<ExpoPushResponse> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          id: '',
          status: 'error',
          message: error.errors?.[0]?.message || 'Failed to send notification',
          details: {
            error: error.errors?.[0]?.code || 'UNKNOWN_ERROR',
            code: response.status.toString(),
          },
        };
      }

      const data = await response.json();
      return {
        id: data.id || '',
        status: 'ok',
        data,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        id: '',
        status: 'error',
        message: errorMessage,
        details: {
          error: 'NETWORK_ERROR',
        },
      };
    }
  }

  /**
   * Send multiple notifications in batch
   * Expo API supports batching up to 100 messages per request
   */
  async sendBatch(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.errors?.[0]?.message || 'Failed to send batch';
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Batch send failed: ${errorMessage}`);
    }
  }

  /**
   * Validate that a push token is properly formatted
   */
  static isValidToken(token: string): boolean {
    // Expo push tokens start with "ExponentPushToken["
    return typeof token === 'string' && token.startsWith('ExponentPushToken[') && token.endsWith(']');
  }
}
