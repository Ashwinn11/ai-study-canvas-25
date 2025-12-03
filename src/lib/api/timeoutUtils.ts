import { logger } from "@/utils/logger";
/**
 * Timeout and retry utilities for network operations
 * Ensures fast-fail behavior for operations that should complete quickly
 */

export class TimeoutError extends Error {
  constructor(message: string, public readonly timeoutMs: number) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Wraps a promise with a timeout using AbortController
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param operationName - Name for logging/error messages
 * @returns Promise that rejects with TimeoutError if timeout is exceeded
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string = 'Operation'
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new TimeoutError(
        `${operationName} timed out after ${timeoutMs}ms`,
        timeoutMs
      );
      logger.error(`[Timeout] ${error.message}`);
      reject(error);
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Wraps a function with retry logic and exponential backoff
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 2)
 * @param baseDelayMs - Base delay between retries in milliseconds (default: 1000)
 * @param operationName - Name for logging
 * @returns Promise with the function result
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelayMs: number = 1000,
  operationName: string = 'Operation'
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        logger.debug(`[TimeoutUtils] Retrying ${operationName}, attempt ${attempt}/${maxRetries}`);
      }
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on certain errors
      if (!shouldRetry(error)) {
        throw lastError;
      }

      // Don't delay after the last attempt
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s...
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        await sleep(delayMs);
      }
    }
  }

  logger.error(`[Retry] ${operationName} - Failed after ${maxRetries + 1} attempts`);
  throw lastError || new Error('Unknown error during retry');
}

/**
 * Determines if an error is retryable
 */
function shouldRetry(error: unknown): boolean {
  if (error instanceof TimeoutError) {
    return true; // Retry timeouts
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors - retry
    if (
      message.includes('network') ||
      message.includes('fetch failed') ||
      message.includes('connection') ||
      error.name === 'AbortError'
    ) {
      return true;
    }

    // Rate limiting - retry
    if (message.includes('429') || message.includes('rate limit')) {
      return true;
    }

    // Server errors (5xx) - retry
    if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
      return true;
    }

    // Client errors (4xx except 429) - don't retry
    if (message.includes('400') || message.includes('401') || message.includes('403') || message.includes('404')) {
      return false;
    }
  }

  // Default: retry on unknown errors
  return true;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with timeout
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 */
export async function fetchWithTimeout(
  url: string | Request | URL,
  options?: RequestInit,
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError(`Fetch timed out after ${timeoutMs}ms`, timeoutMs);
    }
    throw error;
  }
}

/**
 * Combines timeout and retry for convenience
 * @param fn - Async function to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param maxRetries - Maximum retry attempts
 * @param operationName - Name for logging
 */
export async function withTimeoutAndRetry<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  maxRetries: number = 2,
  operationName: string = 'Operation'
): Promise<T> {
  return withRetry(
    () => withTimeout(fn(), timeoutMs, operationName),
    maxRetries,
    1000,
    operationName
  );
}
