/**
 * Utility functions for preventing memory leaks and ensuring proper cleanup
 */

/**
 * Creates a cancellable promise that can be cancelled to prevent state updates after unmount
 */
export class CancellablePromise<T> {
  private cancelled = false;
  private promise: Promise<T>;

  constructor(promise: Promise<T>) {
    this.promise = promise;
  }

  /**
   * Execute the promise only if not cancelled
   */
  then<TResult1 = T, TResult2 = never>(
    onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.promise.then(
      value => {
        if (this.cancelled) {
          return Promise.resolve(value as any);
        }
        return onFulfilled ? onFulfilled(value) : (value as any);
      },
      reason => {
        if (this.cancelled) {
          return Promise.reject(reason);
        }
        return onRejected ? onRejected(reason) : Promise.reject(reason);
      }
    );
  }

  catch<TResult = never>(
    onRejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<T | TResult> {
    return this.promise.catch(reason => {
      if (this.cancelled) {
        return Promise.reject(reason);
      }
      return onRejected ? onRejected(reason) : Promise.reject(reason);
    });
  }

  /**
   * Cancel the promise to prevent further execution
   */
  cancel(): void {
    this.cancelled = true;
  }

  /**
   * Check if the promise has been cancelled
   */
  isCancelled(): boolean {
    return this.cancelled;
  }
}

/**
 * Creates a cancellable promise from a regular promise
 */
export function makeCancellable<T>(promise: Promise<T>): CancellablePromise<T> {
  return new CancellablePromise(promise);
}

/**
 * Cleanup manager for managing multiple cleanup operations
 */
export class CleanupManager {
  private cleanupFunctions: (() => void)[] = [];
  private timeouts: Set<NodeJS.Timeout> = new Set();
  private intervals: Set<NodeJS.Timeout> = new Set();
  private abortControllers: Set<AbortController> = new Set();
  private cancellablePromises: Set<CancellablePromise<any>> = new Set();

  /**
   * Add a cleanup function to be called when cleanup() is invoked
   */
  addCleanup(cleanupFn: () => void): void {
    this.cleanupFunctions.push(cleanupFn);
  }

  /**
   * Create a managed timeout that will be automatically cleared
   */
  setTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const timeout = setTimeout(() => {
      this.timeouts.delete(timeout);
      callback();
    }, delay);
    this.timeouts.add(timeout);
    return timeout;
  }

  /**
   * Create a managed interval that will be automatically cleared
   */
  setInterval(callback: () => void, delay: number): NodeJS.Timeout {
    const interval = setInterval(callback, delay);
    this.intervals.add(interval);
    return interval;
  }

  /**
   * Create a managed AbortController that will be automatically aborted
   */
  createAbortController(): AbortController {
    const controller = new AbortController();
    this.abortControllers.add(controller);
    return controller;
  }

  /**
   * Create a managed cancellable promise
   */
  makeCancellable<T>(promise: Promise<T>): CancellablePromise<T> {
    const cancellable = new CancellablePromise(promise);
    this.cancellablePromises.add(cancellable);
    return cancellable;
  }

  /**
   * Manually clear a specific timeout
   */
  clearTimeout(timeout: NodeJS.Timeout): void {
    clearTimeout(timeout);
    this.timeouts.delete(timeout);
  }

  /**
   * Manually clear a specific interval
   */
  clearInterval(interval: NodeJS.Timeout): void {
    clearInterval(interval);
    this.intervals.delete(interval);
  }

  /**
   * Manually abort a specific controller
   */
  abortController(controller: AbortController): void {
    controller.abort();
    this.abortControllers.delete(controller);
  }

  /**
   * Manually cancel a specific promise
   */
  cancelPromise(promise: CancellablePromise<any>): void {
    promise.cancel();
    this.cancellablePromises.delete(promise);
  }

  /**
   * Perform comprehensive cleanup of all managed resources
   */
  cleanup(): void {
    // Clear all timeouts
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();

    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();

    // Abort all controllers
    this.abortControllers.forEach(controller => {
      try {
        controller.abort();
      } catch (error) {
        logger.warn('Error aborting controller:', error);
      }
    });
    this.abortControllers.clear();

    // Cancel all promises
    this.cancellablePromises.forEach(promise => {
      try {
        promise.cancel();
      } catch (error) {
        logger.warn('Error cancelling promise:', error);
      }
    });
    this.cancellablePromises.clear();

    // Execute all cleanup functions
    this.cleanupFunctions.forEach(cleanupFn => {
      try {
        cleanupFn();
      } catch (error) {
        logger.warn('Error in cleanup function:', error);
      }
    });
    this.cleanupFunctions = [];
  }

  /**
   * Get statistics about managed resources
   */
  getStats(): {
    timeouts: number;
    intervals: number;
    abortControllers: number;
    cancellablePromises: number;
    cleanupFunctions: number;
  } {
    return {
      timeouts: this.timeouts.size,
      intervals: this.intervals.size,
      abortControllers: this.abortControllers.size,
      cancellablePromises: this.cancellablePromises.size,
      cleanupFunctions: this.cleanupFunctions.length,
    };
  }
}

/**
 * Hook for creating a cleanup manager that automatically cleans up on unmount
 */
import { useEffect, useRef } from 'react';

import { logger } from "@/utils/logger";
export function useCleanupManager(): CleanupManager {
  const cleanupManagerRef = useRef<CleanupManager>(new CleanupManager());

  useEffect(() => {
    return () => {
      cleanupManagerRef.current.cleanup();
    };
  }, []);

  return cleanupManagerRef.current;
}

/**
 * Safe setState function that only updates if component is still mounted
 */
export function createSafeSetState<T>(
  setState: React.Dispatch<React.SetStateAction<T>>,
  mountedRef: React.MutableRefObject<boolean>
) {
  return (value: React.SetStateAction<T>) => {
    if (mountedRef.current) {
      setState(value);
    }
  };
}

/**
 * Safe async function executor that prevents execution after unmount
 */
export async function safeAsyncExecute<T>(
  asyncFn: () => Promise<T>,
  mountedRef: React.MutableRefObject<boolean>
): Promise<T | null> {
  if (!mountedRef.current) {
    return null;
  }

  try {
    const result = await asyncFn();
    return mountedRef.current ? result : null;
  } catch (error) {
    if (mountedRef.current) {
      throw error;
    }
    return null;
  }
}