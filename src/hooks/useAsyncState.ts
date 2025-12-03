import { useState, useRef, useCallback, useEffect } from 'react';
import { CleanupManager } from '@/utils/cleanupUtils';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

export interface UseAsyncStateOptions<T> {
  initialData?: T;
  // How long to keep data fresh before considering it stale (in ms)
  staleTime?: number;
  // Whether to retry failed requests
  retry?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  // Whether to deduplicate concurrent requests
  deduplicate?: boolean;
  // Whether to persist loading state across re-executions
  persistLoading?: boolean;
}

export interface AsyncStateResult<T> {
  state: AsyncState<T>;
  execute: (force?: boolean) => Promise<T | null>;
  reset: () => void;
  setData: (data: T) => void;
  setError: (error: string) => void;
  isStale: () => boolean;
  refresh: () => Promise<T | null>;
}

/**
 * Centralized async state management hook with built-in:
 * - Race condition prevention
 * - Request deduplication
 * - Retry logic
 * - Stale data handling
 * - Proper cleanup
 */
export function useAsyncState<T>(
  asyncFn: () => Promise<T>,
  options: UseAsyncStateOptions<T> = {}
): AsyncStateResult<T> {
  const {
    initialData = null,
    staleTime = 5 * 60 * 1000, // 5 minutes default
    retry = true,
    retryAttempts = 2,
    retryDelay = 1000,
    deduplicate = true,
    persistLoading = false,
  } = options;

  // State management
  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    loading: false,
    error: null,
    lastUpdated: initialData ? Date.now() : null,
  });

  // Refs for race condition prevention
  const mountedRef = useRef(true);
  const currentRequestRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  const cleanupManager = useRef(new CleanupManager());

  // Cleanup on unmount
  useEffect(() => {
    const cleanupManagerRef = cleanupManager.current;
    return () => {
      mountedRef.current = false;
      cleanupManagerRef.cleanup();
    };
  }, []);

  // Safe state updater
  const safeSetState = useCallback((updater: Partial<AsyncState<T>>) => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, ...updater }));
    }
  }, []);

  // Check if data is stale
  const isStale = useCallback(() => {
    if (!state.lastUpdated) return true;
    return Date.now() - state.lastUpdated > staleTime;
  }, [state.lastUpdated, staleTime]);

  // Execute async function with all safety measures
  const execute = useCallback(async (force = false): Promise<T | null> => {
    // Don't execute if component is unmounted
    if (!mountedRef.current) {
      return null;
    }

    // Check if we should skip this execution
    if (!force && !isStale() && state.data && !state.error) {
      return state.data;
    }

    // Generate unique request ID for deduplication
    const requestId = Date.now().toString() + Math.random().toString(36);

    // If deduplicate is enabled and there's already a request in progress, wait for it
    if (deduplicate && currentRequestRef.current && !force) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!currentRequestRef.current || !mountedRef.current) {
            clearInterval(checkInterval);
            resolve(state.data);
          }
        }, 100);

        // Timeout after 30 seconds
        cleanupManager.current.setTimeout(() => {
          clearInterval(checkInterval);
          resolve(null);
        }, 30000);
      });
    }

    currentRequestRef.current = requestId;
    retryCountRef.current = 0;

    // Set loading state (conditionally based on persistLoading option)
    if (!persistLoading || !state.loading) {
      safeSetState({ loading: true, error: null });
    }

    const executeAttempt = async (attemptCount: number): Promise<T | null> => {
      try {
        const result = await asyncFn();

        // Check if this request is still current and component is mounted
        if (currentRequestRef.current !== requestId || !mountedRef.current) {
          return null;
        }

        // Success - update state
        safeSetState({
          data: result,
          loading: false,
          error: null,
          lastUpdated: Date.now(),
        });

        currentRequestRef.current = null;
        return result;

      } catch (error) {
        // Check if this request is still current and component is mounted
        if (currentRequestRef.current !== requestId || !mountedRef.current) {
          return null;
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // If retry is enabled and we haven't exceeded max attempts
        if (retry && attemptCount < retryAttempts) {
          retryCountRef.current = attemptCount + 1;

          // Wait before retrying (with exponential backoff)
          await new Promise<void>(resolve => {
            cleanupManager.current.setTimeout(() => resolve(), retryDelay * Math.pow(2, attemptCount));
          });

          // Retry if component is still mounted and request is still current
          if (mountedRef.current && currentRequestRef.current === requestId) {
            return executeAttempt(attemptCount + 1);
          }
        }

        // Failed after all retries or retry disabled
        safeSetState({
          loading: false,
          error: errorMessage,
        });

        currentRequestRef.current = null;
        throw error;
      }
    };

    try {
      return await executeAttempt(0);
    } catch (error) {
      return null;
    }
  }, [asyncFn, isStale, state.data, state.error, state.loading, deduplicate, persistLoading, retry, retryAttempts, retryDelay, safeSetState]);

  // Reset state to initial values
  const reset = useCallback(() => {
    if (mountedRef.current) {
      currentRequestRef.current = null;
      retryCountRef.current = 0;
      setState({
        data: initialData,
        loading: false,
        error: null,
        lastUpdated: initialData ? Date.now() : null,
      });
    }
  }, [initialData]);

  // Manually set data
  const setData = useCallback((data: T) => {
    safeSetState({
      data,
      error: null,
      lastUpdated: Date.now(),
    });
  }, [safeSetState]);

  // Manually set error
  const setError = useCallback((error: string) => {
    safeSetState({
      error,
      loading: false,
    });
  }, [safeSetState]);

  // Refresh data (force refresh)
  const refresh = useCallback(() => {
    return execute(true);
  }, [execute]);

  return {
    state,
    execute,
    reset,
    setData,
    setError,
    isStale,
    refresh,
  };
}

/**
 * Hook for managing multiple async states with shared configuration
 */
export function useAsyncStates<T extends Record<string, () => Promise<any>>>(
  asyncFunctions: T,
  options: UseAsyncStateOptions<any> = {}
): {
  [K in keyof T]: AsyncStateResult<Awaited<ReturnType<T[K]>>>;
} {
  // This hook implementation is commented out due to React Rules of Hooks violation
  // Hooks cannot be called conditionally or inside loops/maps
  // Please refactor to call useAsyncState directly for each function instead
  
  // Example refactor:
  // const state1 = useAsyncState(asyncFunctions.key1, options);
  // const state2 = useAsyncState(asyncFunctions.key2, options);
  // return { state1, state2 };
  
  return {} as any;
}

/**
 * Hook for dependent async operations (when one depends on the result of another)
 */
export function useDependentAsyncState<T, U>(
  firstAsyncFn: () => Promise<T>,
  secondAsyncFn: (firstResult: T) => Promise<U>,
  options: UseAsyncStateOptions<U> = {}
): {
  firstState: AsyncStateResult<T>;
  secondState: AsyncStateResult<U>;
  executeSequence: () => Promise<U | null>;
} {
  const firstOptions: UseAsyncStateOptions<T> = {
    deduplicate: options.deduplicate,
    persistLoading: options.persistLoading,
    retry: options.retry,
    retryAttempts: options.retryAttempts,
    retryDelay: options.retryDelay,
    initialData: undefined
  };
  const firstState = useAsyncState(firstAsyncFn, firstOptions);
  const secondState = useAsyncState(
    () => secondAsyncFn(firstState.state.data!),
    { ...options, initialData: undefined }
  );

  const executeSequence = useCallback(async (): Promise<U | null> => {
    const firstResult = await firstState.execute();
    if (firstResult) {
      return await secondState.execute();
    }
    return null;
  }, [firstState, secondState]);

  return {
    firstState,
    secondState,
    executeSequence,
  };
}