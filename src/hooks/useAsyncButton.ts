import { useState, useCallback } from 'react';

export interface UseAsyncButtonOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  preventMultipleCalls?: boolean;
}

export interface UseAsyncButtonResult {
  loading: boolean;
  execute: (asyncOperation: () => Promise<void>) => Promise<void>;
}

/**
 * Hook for managing loading states in async button operations
 *
 * @param options Configuration options for the async button
 * @returns Object containing loading state and execute function
 *
 * @example
 * ```tsx
 * const { showError } = useModalHelpers();
 * const { loading, execute } = useAsyncButton({
 *   onError: (error) => showError(error.message)
 * });
 *
 * const handleSave = () => execute(async () => {
 *   await saveData();
 * });
 *
 * return (
 *   <ActionButton
 *     title="Save"
 *     onPress={handleSave}
 *     loading={loading}
 *     loadingText="Saving..."
 *   />
 * );
 * ```
 */
export const useAsyncButton = (options: UseAsyncButtonOptions = {}): UseAsyncButtonResult => {
  const { onSuccess, onError, preventMultipleCalls = true } = options;
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async (asyncOperation: () => Promise<void>) => {
    // Prevent multiple calls if enabled
    if (preventMultipleCalls && loading) {
      return;
    }

    try {
      setLoading(true);
      await asyncOperation();
      onSuccess?.();
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error));
      onError?.(errorInstance);
      throw error; // Re-throw to allow component-specific error handling
    } finally {
      setLoading(false);
    }
  }, [loading, onSuccess, onError, preventMultipleCalls]);

  return {
    loading,
    execute
  };
};

// For backwards compatibility, re-export the full-featured useAsyncState from useAsyncState.ts
// This file is kept for convenience but all new code should use useAsyncState directly
export { useAsyncState } from './useAsyncState';