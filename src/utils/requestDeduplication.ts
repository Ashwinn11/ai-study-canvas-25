/**
 * Request deduplication utility to prevent duplicate API calls
 * Particularly useful for preventing multiple identical requests when components re-render
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
  abortController?: AbortController;
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private cache = new Map<string, { data: any; timestamp: number }>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default cache TTL

  /**
   * Execute a request with deduplication
   * If an identical request is already in progress, return the existing promise
   * If cached data exists and is still valid, return cached data
   */
  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: {
      ttl?: number; // Cache time-to-live in milliseconds
      force?: boolean; // Force new request even if cached data exists
      timeout?: number; // Request timeout in milliseconds
    } = {}
  ): Promise<T> {
    const { ttl = this.defaultTTL, force = false, timeout = 30000 } = options;

    // Check cache first (unless force is true)
    if (!force) {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.data;
      }
    }

    // Check if request is already in progress
    const existing = this.pendingRequests.get(key);
    if (existing && !force) {
      // Check if the existing request is not too old (avoid waiting forever)
      if (Date.now() - existing.timestamp < timeout) {
        return existing.promise;
      } else {
        // Cancel old request and proceed with new one
        if (existing.abortController) {
          existing.abortController.abort();
        }
        this.pendingRequests.delete(key);
      }
    }

    // Create abort controller for timeout and cancellation
    const abortController = new AbortController();

    // Set up timeout
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, timeout);

    // Create the request
    const promise = this.executeRequest(requestFn, abortController.signal)
      .then((result) => {
        // Success - cache the result and clean up
        clearTimeout(timeoutId);
        this.cache.set(key, { data: result, timestamp: Date.now() });
        this.pendingRequests.delete(key);
        return result;
      })
      .catch((error) => {
        // Error - clean up but don't cache
        clearTimeout(timeoutId);
        this.pendingRequests.delete(key);
        throw error;
      });

    // Store the pending request
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
      abortController,
    });

    return promise;
  }

  /**
   * Execute request with abort signal support
   */
  private async executeRequest<T>(
    requestFn: () => Promise<T>,
    abortSignal: AbortSignal
  ): Promise<T> {
    // Check if already aborted
    if (abortSignal.aborted) {
      throw new Error('Request was aborted before execution');
    }

    // Race between the request and abort signal
    return new Promise<T>((resolve, reject) => {
      // Handle abort
      const onAbort = () => {
        reject(new Error('Request was aborted'));
      };

      if (abortSignal.aborted) {
        onAbort();
        return;
      }

      abortSignal.addEventListener('abort', onAbort);

      // Execute the request
      requestFn()
        .then((result) => {
          abortSignal.removeEventListener('abort', onAbort);
          resolve(result);
        })
        .catch((error) => {
          abortSignal.removeEventListener('abort', onAbort);
          reject(error);
        });
    });
  }

  /**
   * Cancel a specific request
   */
  cancel(key: string): void {
    const pending = this.pendingRequests.get(key);
    if (pending) {
      if (pending.abortController) {
        pending.abortController.abort();
      }
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Cancel all pending requests
   */
  cancelAll(): void {
    for (const [key, pending] of this.pendingRequests.entries()) {
      if (pending.abortController) {
        pending.abortController.abort();
      }
    }
    this.pendingRequests.clear();
  }

  /**
   * Clear cache for a specific key
   */
  clearCache(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(ttl = this.defaultTTL): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get statistics about current state
   */
  getStats(): {
    pendingRequests: number;
    cachedItems: number;
    oldestPendingRequest: number | null;
    oldestCachedItem: number | null;
  } {
    const now = Date.now();

    let oldestPending: number | null = null;
    for (const pending of this.pendingRequests.values()) {
      const age = now - pending.timestamp;
      if (oldestPending === null || age > oldestPending) {
        oldestPending = age;
      }
    }

    let oldestCached: number | null = null;
    for (const cached of this.cache.values()) {
      const age = now - cached.timestamp;
      if (oldestCached === null || age > oldestCached) {
        oldestCached = age;
      }
    }

    return {
      pendingRequests: this.pendingRequests.size,
      cachedItems: this.cache.size,
      oldestPendingRequest: oldestPending,
      oldestCachedItem: oldestCached,
    };
  }

  /**
   * Set default TTL for cache
   */
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }
}

// Global instance for app-wide request deduplication
export const requestDeduplicator = new RequestDeduplicator();

/**
 * React hook for using request deduplication
 */
import { useEffect, useCallback } from 'react';

export function useRequestDeduplication() {
  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Don't cancel all requests on unmount as other components might be using them
      // Individual requests will timeout naturally
    };
  }, []);

  const deduplicate = useCallback(<T>(
    key: string,
    requestFn: () => Promise<T>,
    options?: Parameters<typeof requestDeduplicator.deduplicate>[2]
  ) => {
    return requestDeduplicator.deduplicate(key, requestFn, options);
  }, []);

  const cancel = useCallback((key: string) => {
    requestDeduplicator.cancel(key);
  }, []);

  const clearCache = useCallback((key: string) => {
    requestDeduplicator.clearCache(key);
  }, []);

  return {
    deduplicate,
    cancel,
    clearCache,
    getStats: () => requestDeduplicator.getStats(),
  };
}

/**
 * Helper function to generate consistent cache keys
 */
export function createCacheKey(
  namespace: string,
  params: Record<string, any> = {}
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${JSON.stringify(params[key])}`)
    .join('|');

  return `${namespace}${sortedParams ? `[${sortedParams}]` : ''}`;
}

/**
 * Hook for automatic cache key generation based on function parameters
 */
export function useAutoDeduplication<T extends any[], R>(
  namespace: string,
  requestFn: (...args: T) => Promise<R>,
  options?: Omit<Parameters<typeof requestDeduplicator.deduplicate>[2], 'force'>
) {
  const { deduplicate } = useRequestDeduplication();

  return useCallback(
    async (...args: T): Promise<R> => {
      const cacheKey = createCacheKey(namespace, { args });
      return deduplicate(cacheKey, () => requestFn(...args), options);
    },
    [namespace, requestFn, options, deduplicate]
  );
}

/**
 * Periodic cleanup function to prevent memory leaks
 * Should be called periodically by the app (e.g., every 10 minutes)
 */
export function performPeriodicCleanup(): void {
  requestDeduplicator.clearExpiredCache();
}