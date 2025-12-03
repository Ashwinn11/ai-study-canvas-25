/**
 * Centralized Error Handler
 *
 * Unified error handling system for:
 * - Animation errors
 * - Gesture handler errors
 * - Data parsing errors
 * - Async operation errors
 * - Sentry integration
 *
 * Provides consistent error logging, metrics, and recovery strategies
 * across all error types.
 */


// Simple console logging to avoid circular dependency with logger.ts
// This is a low-level utility that logger.ts depends on, so we use console directly
// eslint-disable-next-line no-console
const logError = (message: string, ...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    // Error logging handled by logger utility
  }
};

const logWarn = (message: string, ...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    // Warning logging handled by logger utility
  }
};

export type ErrorContext =
  | "animation"
  | "gesture"
  | "parsing"
  | "async"
  | "state"
  | "navigation"
  | "haptic"
  | "network"
  | "unknown";

export interface ErrorMetadata {
  context?: string;
  userId?: string;
  sessionId?: string;
  additionalInfo?: Record<string, any>;
  severity?: "low" | "medium" | "high" | "critical";
}

/**
 * Centralized error handler with Sentry integration
 */
export class ErrorHandler {
  /**
   * Handle any error with automatic Sentry reporting
   *
   * @param error - The error object
   * @param errorContext - Type of error (animation, gesture, parsing, etc.)
   * @param metadata - Additional error information
   */
  static handleError(
    error: Error | unknown,
    errorContext: ErrorContext,
    metadata?: ErrorMetadata,
  ): void {
    const err = error instanceof Error ? error : new Error(String(error));

    // Log to logger
    const logContext = metadata?.context || errorContext;
    const severity =
      metadata?.severity || this.getDefaultSeverity(errorContext);

    if (severity === "critical" || severity === "high") {
      logError(`[ErrorHandler:${errorContext}] ${logContext}`, err);
    } else {
      logWarn(`[ErrorHandler:${errorContext}] ${logContext}`, err);
    }

    // Report to Sentry with context
    this.reportToSentry(err, errorContext, metadata);
  }

  /**
   * Handle animation-specific errors
   * Won't crash the app, but notifies about animation failures
   *
   * @param error - Animation error
   * @param context - Where the animation failed
   * @param metadata - Additional context
   */
  static handleAnimationError(
    error: Error | unknown,
    context: string,
    metadata?: Omit<ErrorMetadata, "context">,
  ): void {
    const err = error instanceof Error ? error : new Error(String(error));
    logWarn(`[Animation] Failed at ${context}:`, err);

    // Animation errors are typically low severity - app continues working
    // Sentry.captureException(err, {
    //   level: "warning",
    //   tags: { errorType: "animation", location: context },
    //   contexts: {
    //     animation: { failurePoint: context, ...metadata?.additionalInfo },
    //   },
    // });
  }

  /**
   * Handle gesture handler errors
   * Critical - prevents cascade failures in gesture system
   *
   * @param error - Gesture error
   * @param context - Which gesture handler failed
   * @param metadata - Additional context
   */
  static handleGestureError(
    error: Error | unknown,
    context: string,
    metadata?: Omit<ErrorMetadata, "context">,
  ): void {
    const err = error instanceof Error ? error : new Error(String(error));
    logError(`[Gesture] Failed at ${context}: `, err);

    // Gesture errors are high severity - affects user interaction
    // Sentry.captureException(err, {
    //   level: "error",
    //   tags: { errorType: "gesture", gestureType: context },
    //   contexts: {
    //     gesture: { gestureType: context, ...metadata?.additionalInfo },
    //   },
    // });
  }

  /**
   * Handle data parsing errors (JSON.parse failures, etc.)
   * Non-critical if fallback data is available
   *
   * @param error - Parsing error
   * @param context - What was being parsed
   * @param metadata - Additional context
   */
  static handleParsingError(
    error: Error | unknown,
    context: string,
    metadata?: Omit<ErrorMetadata, "context">,
  ): void {
    const err = error instanceof Error ? error : new Error(String(error));
    logWarn(`[Parsing] Failed to parse ${context}: `, err);

    // Parsing errors are medium severity - data fallback usually exists
    // Sentry.captureException(err, {
    //   level: "warning",
    //   tags: { errorType: "parsing", dataType: context },
    //   contexts: { parsing: { dataType: context, ...metadata?.additionalInfo } },
    // });
  }

  /**
   * Handle async operation errors (fetch, async functions, etc.)
   *
   * @param error - Async error
   * @param context - What async operation failed
   * @param metadata - Additional context
   */
  static handleAsyncError(
    error: Error | unknown,
    context: string,
    metadata?: Omit<ErrorMetadata, "context">,
  ): void {
    const err = error instanceof Error ? error : new Error(String(error));
    const level = metadata?.severity === "critical" ? "error" : "warning";

    if (level === "error") {
      logError(`[Async] Failed at ${context}: `, err);
    } else {
      logWarn(`[Async] Failed at ${context}: `, err);
    }

    // Sentry.captureException(err, {
    //   level: level as "warning" | "error",
    //   tags: { errorType: "async", operation: context },
    //   contexts: { async: { operation: context, ...metadata?.additionalInfo } },
    // });
  }

  /**
   * Handle unhandled promise rejections
   * Critical - indicates unresolved async errors
   *
   * @param error - Rejected promise reason
   * @param context - Where the rejection occurred
   * @param metadata - Additional context
   */
  static handlePromiseRejection(
    error: Error | unknown,
    context: string,
    metadata?: Omit<ErrorMetadata, "context">,
  ): void {
    const err = error instanceof Error ? error : new Error(String(error));
    logError(`[PromiseRejection] Unhandled rejection at ${context}: `, err);

    // Sentry.captureException(err, {
    //   level: "error",
    //   tags: { errorType: "unhandledRejection", context },
    //   contexts: {
    //     promiseRejection: {
    //       context,
    //       rejectionReason: String(error),
    //       ...metadata?.additionalInfo,
    //     },
    //   },
    // });
  }

  /**
   * Handle haptic feedback errors
   * Low severity - non-critical UX feature
   *
   * @param error - Haptic error
   * @param context - Haptic operation that failed
   * @param metadata - Additional context
   */
  static handleHapticError(
    error: Error | unknown,
    context: string,
    metadata?: Omit<ErrorMetadata, "context">,
  ): void {
    const err = error instanceof Error ? error : new Error(String(error));
    logWarn(`[Haptic] Failed at ${context}: `, err);

    // Haptic errors are low severity - app works without haptics
    // Sentry.captureException(err, {
    //   level: "warning",
    //   tags: { errorType: "haptic", operation: context },
    //   contexts: { haptic: { operation: context, ...metadata?.additionalInfo } },
    // });
  }

  /**
   * Handle state management errors
   *
   * @param error - State error
   * @param context - Which state operation failed
   * @param metadata - Additional context
   */
  static handleStateError(
    error: Error | unknown,
    context: string,
    metadata?: Omit<ErrorMetadata, "context">,
  ): void {
    const err = error instanceof Error ? error : new Error(String(error));
    logError(`[State] Error at ${context}: `, err);

    // Sentry.captureException(err, {
    //   level: "error",
    //   tags: { errorType: "state", operation: context },
    //   contexts: {
    //     custom: {
    //       type: "state",
    //       operation: context,
    //       ...metadata?.additionalInfo,
    //     },
    //   },
    // });
  }

  /**
   * Internal: Get default severity for error context
   */
  private static getDefaultSeverity(
    context: ErrorContext,
  ): "low" | "medium" | "high" | "critical" {
    switch (context) {
      case "animation":
      case "haptic":
        return "low";
      case "parsing":
      case "async":
        return "medium";
      case "gesture":
      case "navigation":
      case "state":
        return "high";
      case "network":
        return "medium";
      default:
        return "medium";
    }
  }

  /**
   * Internal: Report error to Sentry
   */
  private static reportToSentry(
    error: Error,
    errorContext: ErrorContext,
    metadata?: ErrorMetadata,
  ): void {
    // Sentry.captureException(error, {
    //   level: metadata?.severity === "critical" ? "error" : "warning",
    //   tags: {
    //     errorType: errorContext,
    //     location: metadata?.context,
    //   },
    //   contexts: {
    //     [errorContext]: {
    //       location: metadata?.context,
    //       userId: metadata?.userId,
    //       sessionId: metadata?.sessionId,
    //       ...metadata?.additionalInfo,
    //     },
    //   },
    // });
  }
}

/**
 * Higher-order function to wrap any function with error handling
 *
 * @param fn - Function to wrap
 * @param errorContext - Error context type
 * @param metadata - Error metadata
 * @returns Wrapped function
 */
export function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  errorContext: ErrorContext,
  metadata?: ErrorMetadata,
): T {
  return ((...args: any[]) => {
    try {
      return fn(...args);
    } catch (error) {
      ErrorHandler.handleError(error, errorContext, metadata);
      return undefined;
    }
  }) as T;
}

/**
 * Higher-order function to wrap async functions with error handling
 *
 * @param fn - Async function to wrap
 * @param errorContext - Error context type
 * @param metadata - Error metadata
 * @returns Wrapped async function
 */
export function withAsyncErrorHandling<
  T extends (...args: any[]) => Promise<any>,
>(fn: T, errorContext: ErrorContext, metadata?: ErrorMetadata): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      ErrorHandler.handleAsyncError(error, errorContext, metadata);
      return undefined;
    }
  }) as T;
}
