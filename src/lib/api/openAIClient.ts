import { getSupabaseClient } from '@/lib/supabase/client';

/**
 * OpenAI Client for Web App
 * Matches iOS openAIClient.ts implementation
 * All OpenAI calls route through backend proxy (keeps API key secure on server)
 */

import { API_ENDPOINTS } from '@/constants/config';

// Backend proxy URL (matching iOS EXPO_PUBLIC_OPENAI_PROXY_URL)
const getBackendProxyUrl = () => {
  const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  const normalizedBase = rawBaseUrl.replace(/\/$/, '');
  if (!normalizedBase || normalizedBase.trim().length === 0) {
    throw new Error('API base URL not configured. Set NEXT_PUBLIC_API_BASE_URL.');
  }
  return `${normalizedBase}${API_ENDPOINTS.AI_CHAT_PROXY}`;
};

// In-flight request deduplication
const inFlightRequests = new Map<string, Promise<string>>();

export interface ChatCompletionOptions {
  model: string;
  systemPrompt?: string;
  userPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  cacheNamespace?: string;
  cacheKeyParts?: string[];
  cacheTtlMs?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  responseFormat?: any;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  validateBeforeCache?: (content: string) => boolean;
}

/**
 * Chat completion via backend proxy (matching iOS chatCompletion function)
 * Lines 51-297 in iOS openAIClient.ts
 */
export async function chatCompletion(options: ChatCompletionOptions): Promise<string> {
  const {
    model,
    systemPrompt = '',
    userPrompt = '',
    temperature = 0.7,
    maxTokens = 1024,
    topP,
    presencePenalty,
    frequencyPenalty,
    messages,
    responseFormat,
    timeoutMs = 30000, // 30 second default timeout
    retries = 2,
    retryDelayMs = 800,
  } = options;

  const backendProxyUrl = getBackendProxyUrl();

  // Build messages array (matching iOS lines 126-129)
  const payloadMessages = messages ?? [
    ...(systemPrompt?.trim() ? [{ role: 'system' as const, content: systemPrompt }] : []),
    { role: 'user' as const, content: userPrompt },
  ];

  const maxRetries = retries;
  const baseDelay = retryDelayMs;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Get user session for JWT auth (matching iOS lines 137-146)
      const supabase = getSupabaseClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Not authenticated. You must be logged in to use AI features.');
      }

      // Send request to backend proxy (matching iOS lines 148-165)
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(backendProxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            model,
            messages: payloadMessages,
            temperature,
            maxTokens,
            ...(responseFormat ? { responseFormat } : {}),
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutHandle);

        // Handle non-OK responses (matching iOS lines 167-197)
        if (!response.ok) {
          const retriable = response.status === 429 || response.status >= 500;
          let message = response.statusText;

          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const error = lastError as any;
            const errorData = await response.json();
            message = errorData?.error?.message || message;
            // eslint-disable-next-line no-empty
          } catch { }

          if (retriable && attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
            await new Promise((res) => setTimeout(res, delay));
            continue;
          }

          throw new Error(`OpenAI request failed (${response.status}): ${message}`);
        }

        // Parse response (matching iOS lines 199-227)
        const data = await response.json();
        const content = data.content;

        if (!content) {
          throw new Error('OpenAI response missing content');
        }

        console.log('[OpenAI] Request success:', {
          model: data.model,
          finishReason: data.finishReason,
          contentLength: content.length,
          attempt,
        });

        return content;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        clearTimeout(timeoutHandle);
        throw err;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      lastError = err;

      // Check if error is retriable (matching iOS lines 252-262)
      const isAbort = err?.name === 'AbortError';
      const isNetwork = err instanceof TypeError || /Network request failed/i.test(String(err?.message || ''));

      if ((isAbort || isNetwork) && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
        console.log(`[OpenAI] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }

      // Not retriable or max retries reached
      break;
    }
  }

  // All retries failed
  throw lastError || new Error('Unknown OpenAI error');
}
