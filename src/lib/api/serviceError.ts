import { analytics } from './analytics';

import { logger } from "@/utils/logger";
/**
 * Standardized error class for all Masterly services
 * Provides consistent error handling, user messages, and telemetry
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public service: string,
    public code: string,
    public userMessage: string,
    public shouldRetry: boolean = false,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ServiceError';
  }

  /**
   * Creates a ServiceError for edge function failures
   */
  static edgeFunction(
    functionName: string,
    originalError: Error,
    shouldRetry: boolean = true
  ): ServiceError {
    const isUnavailable = originalError.message?.includes('Edge Function') ||
      originalError.name === 'FunctionsHttpError';

    if (isUnavailable) {
      return new ServiceError(
        `Edge function ${functionName} is not available`,
        'edge-functions',
        'UNAVAILABLE',
        'This feature is temporarily unavailable. Please try again later.',
        false,
        originalError
      );
    }

    return new ServiceError(
      `Edge function ${functionName} failed: ${originalError.message}`,
      'edge-functions',
      'FUNCTION_ERROR',
      'Something went wrong processing your request. Please try again.',
      shouldRetry,
      originalError
    );
  }

  /**
   * Creates a ServiceError for database operations
   */
  static database(
    operation: string,
    originalError: Error,
    shouldRetry: boolean = true
  ): ServiceError {
    const isTimeout = originalError.message?.includes('aborted') ||
      originalError.message?.includes('timeout');

    if (isTimeout) {
      return new ServiceError(
        `Database operation ${operation} timed out`,
        'database',
        'TIMEOUT',
        'The request is taking longer than expected. Please check your connection and try again.',
        true,
        originalError
      );
    }

    return new ServiceError(
      `Database operation ${operation} failed: ${originalError.message}`,
      'database',
      'QUERY_ERROR',
      'Unable to access your data right now. Please try again.',
      shouldRetry,
      originalError
    );
  }

  /**
   * Creates a ServiceError for authentication issues
   */
  static authentication(
    operation: string,
    originalError?: Error
  ): ServiceError {
    return new ServiceError(
      `Authentication failed for ${operation}`,
      'authentication',
      'AUTH_FAILED',
      'Please sign in and try again.',
      false,
      originalError
    );
  }

  /**
   * Creates a ServiceError for validation failures
   */
  static validation(
    field: string,
    reason: string
  ): ServiceError {
    return new ServiceError(
      `Validation failed for ${field}: ${reason}`,
      'validation',
      'INVALID_INPUT',
      `Please check your ${field} and try again.`,
      false
    );
  }

  /**
   * Creates a ServiceError for content quality issues
   */
  static contentQuality(
    contentType: string,
    issues: string[]
  ): ServiceError {
    return new ServiceError(
      `Content quality issues detected in ${contentType}: ${issues.join(', ')}`,
      'content-quality',
      'QUALITY_FAILED',
      'The generated content needs improvement. Please try again.',
      true
    );
  }

  /**
   * Creates a ServiceError for configuration issues
   */
  static configuration(
    configName: string,
    originalError?: Error
  ): ServiceError {
    return new ServiceError(
      `Configuration error: ${configName}`,
      'configuration',
      'CONFIG_ERROR',
      'Service configuration issue. Please contact support.',
      false,
      originalError
    );
  }

  /**
   * Creates a ServiceError for external API failures
   */
  static external(
    apiName: string,
    errorMessage: string,
    shouldRetry: boolean = true
  ): ServiceError {
    return new ServiceError(
      `External API ${apiName} failed: ${errorMessage}`,
      'external-api',
      'EXTERNAL_ERROR',
      'External service is temporarily unavailable. Please try again.',
      shouldRetry
    );
  }

  /**
   * Creates a ServiceError for processing failures
   */
  static processing(
    processType: string,
    errorMessage: string,
    shouldRetry: boolean = true
  ): ServiceError {
    return new ServiceError(
      `Processing error in ${processType}: ${errorMessage}`,
      'processing',
      'PROCESSING_ERROR',
      'Content processing failed. Please try again.',
      shouldRetry
    );
  }

  /**
   * Logs the error with appropriate telemetry
   */
  log(): void {
    logger.error(`[SERVICE ERROR] ${this.service}:${this.code}`, {
      message: this.message,
      userMessage: this.userMessage,
      shouldRetry: this.shouldRetry,
      originalError: this.originalError?.message,
      stack: this.stack
    });

    // Track error in analytics
    analytics.trackEvent('service_error', {
      service: this.service,
      code: this.code,
      shouldRetry: this.shouldRetry,
      userMessage: this.userMessage
    });
  }

  /**
   * Returns a user-friendly error message
   */
  getUserMessage(): string {
    return this.userMessage;
  }

  /**
   * Determines if the operation should be retried
   */
  canRetry(): boolean {
    return this.shouldRetry;
  }
}

/**
 * Enhanced telemetry wrapper that uses ServiceError for consistent error handling
 */
export const withServiceTelemetry = async <T>(
  operation: () => Promise<T>,
  serviceName: string,
  operationName: string
): Promise<T> => {
  const startTime = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - startTime;

    // Log successful operation (only for slow operations to reduce noise)
    if (duration > 1000) {
      logger.info(`[SERVICE SUCCESS] ${serviceName}.${operationName}: ${duration}ms`);
    }

    // Track performance metrics (only for main operations to reduce overhead)
    if (serviceName === 'contentGeneration' || serviceName === 'api' || duration > 2000) {
      analytics.trackEvent('service_performance', {
        service: serviceName,
        operation: operationName,
        duration,
        success: true
      });
    }

    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;

    // Create appropriate ServiceError
    let serviceError: ServiceError;

    if (error instanceof ServiceError) {
      serviceError = error;
    } else if (error.message?.includes('Edge Function') || error.name === 'FunctionsHttpError') {
      serviceError = ServiceError.edgeFunction(operationName, error);
    } else if (error.message?.includes('aborted') || error.message?.includes('timeout')) {
      serviceError = ServiceError.database(operationName, error);
    } else if (error.status === 401 || error.message?.includes('Authentication')) {
      serviceError = ServiceError.authentication(operationName, error);
    } else {
      serviceError = new ServiceError(
        `Service ${serviceName}.${operationName} failed: ${error.message}`,
        serviceName,
        'UNKNOWN_ERROR',
        'Something went wrong. Please try again.',
        true,
        error
      );
    }

    // Log the error with telemetry
    serviceError.log();

    // Track error performance
    analytics.trackEvent('service_performance', {
      service: serviceName,
      operation: operationName,
      duration,
      success: false,
      errorCode: serviceError.code
    });

    throw serviceError;
  }
};