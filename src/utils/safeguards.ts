/**
 * Centralized Safety System for Crash Prevention
 *
 * Provides unified error-safe wrappers for:
 * - Callbacks passed to Reanimated runOnJS
 * - Gesture handler callbacks
 * - Animation completion handlers
 * - React state updates
 * - Async operations
 *
 * All wrappers catch exceptions and log via Sentry to prevent
 * crashing through Hermes engine's unhandled exception system.
 */

import { logger } from './logger';

/**
 * Wraps a callback to catch exceptions before they escape to Hermes
 * Used for: Reanimated runOnJS callbacks, gesture handlers, animations
 *
 * @param fn - Callback function to protect
 * @param context - Location string for logging (e.g., "SwipeFlashcard.onSwipe")
 * @returns Protected callback that won't throw
 */
export function safeCallback<T extends (...args: any[]) => any>(
  fn: T | undefined | null,
  context: string
): T {
  return ((...args: any[]) => {
    try {
      if (!fn) {
        logger.warn(`[SafeGuards] Callback is undefined at ${context}`);
        return undefined;
      }
      return fn(...args);
    } catch (error) {
      logger.error(`[SafeGuards] Callback error at ${context}:`, error);
      return undefined;
    }
  }) as T;
}

/**
 * Wraps an async callback to catch promise rejections
 * Used for: Async button press handlers, async operations in gestures
 *
 * @param fn - Async callback to protect
 * @param context - Location string for logging
 * @returns Protected async callback
 */
export function safeAsyncCallback<T extends (...args: any[]) => Promise<any>>(
  fn: T | undefined | null,
  context: string
): T {
  return (async (...args: any[]) => {
    try {
      if (!fn) {
        logger.warn(`[SafeGuards] Async callback is undefined at ${context}`);
        return undefined;
      }
      return await fn(...args);
    } catch (error) {
      logger.error(`[SafeGuards] Async callback error at ${context}:`, error);
      return undefined;
    }
  }) as T;
}

/**
 * Specialized wrapper for React setState functions used in runOnJS
 * Prevents setState errors from crashing animations
 *
 * @param setState - React setState function
 * @param context - Location string for logging
 * @returns Protected setState function
 */
export function safeSetState<T>(
  setState: React.Dispatch<React.SetStateAction<T>> | undefined,
  context: string
): React.Dispatch<React.SetStateAction<T>> {
  return ((value: T | ((prev: T) => T)) => {
    try {
      if (!setState) {
        logger.warn(`[SafeGuards] setState is undefined at ${context}`);
        return;
      }
      setState(value);
    } catch (error) {
      logger.error(`[SafeGuards] setState error at ${context}:`, error);
    }
  }) as React.Dispatch<React.SetStateAction<T>>;
}

/**
 * Wrapper for callbacks that will be used with runOnJS
 * Optimized for Reanimated animation callbacks with completion handlers
 *
 * @param callback - Callback to execute
 * @param context - Location string for logging
 * @returns Protected callback
 */
export function safeAnimationCallback<T extends (...args: any[]) => void>(
  callback: T | undefined,
  context: string
): T {
  return ((...args: any[]) => {
    try {
      if (!callback) return;
      callback(...args);
    } catch (error) {
      logger.error(`[SafeGuards] Animation callback error at ${context}:`, error);
    }
  }) as T;
}

/**
 * Wrapper for gesture handler callbacks
 * Prevents gesture errors from escaping to Hermes
 *
 * @param callback - Gesture handler callback
 * @param context - Location string for logging (e.g., "ScreenLayout.panGesture")
 * @returns Protected gesture callback
 */
export function safeGestureCallback<T extends (event: any) => void>(
  callback: T | undefined,
  context: string
): T {
  return (((event: any) => {
    try {
      if (!callback) {
        logger.warn(`[SafeGuards] Gesture callback is undefined at ${context}`);
        return;
      }
      callback(event);
    } catch (error) {
      logger.error(`[SafeGuards] Gesture callback error at ${context}:`, error);
    }
  }) as any) as T;
}

/**
 * Wrapper for navigation callbacks
 * Prevents navigation errors from crashing the app
 *
 * @param callback - Navigation callback
 * @param context - Location string for logging
 * @returns Protected navigation callback
 */
export function safeNavigationCallback(
  callback: (() => void) | undefined,
  context: string
): () => void {
  return () => {
    try {
      if (!callback) {
        logger.warn(`[SafeGuards] Navigation callback is undefined at ${context}`);
        return;
      }
      callback();
    } catch (error) {
      logger.error(`[SafeGuards] Navigation callback error at ${context}:`, error);
    }
  };
}

/**
 * Wrapper for event handlers that might throw
 * Generic protection for any callback type
 *
 * @param callback - Any callback function
 * @param context - Location string for logging
 * @param fallback - Optional fallback return value
 * @returns Protected callback
 */
export function wrapCallback<T extends (...args: any[]) => any>(
  callback: T | undefined,
  context: string,
  fallback?: any
): T {
  return ((...args: any[]) => {
    try {
      if (!callback) {
        return fallback;
      }
      return callback(...args);
    } catch (error) {
      logger.error(`[SafeGuards] Wrapped callback error at ${context}:`, error);
      return fallback;
    }
  }) as T;
}

/**
 * Batch protect multiple callbacks at once
 * Useful for multiple handlers in a component
 *
 * @param callbacks - Map of callbacks to protect
 * @param contextPrefix - Prefix for all log contexts
 * @returns Map of protected callbacks
 */
export function protectCallbacks<T extends Record<string, (...args: any[]) => any>>(
  callbacks: T,
  contextPrefix: string
): T {
  const protected_ = {} as T;
  for (const [key, fn] of Object.entries(callbacks)) {
    protected_[key as keyof T] = safeCallback(fn, `${contextPrefix}.${key}`) as any;
  }
  return protected_;
}
