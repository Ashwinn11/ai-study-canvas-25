/**
 * Standardized Error Class for Service Layer
 * Matches iOS app: /masterly/services/serviceError.ts
 *
 * Provides consistent error handling across all services
 * with proper error codes, user messages, and retry logic
 */

export class ServiceError extends Error {
  constructor(
    message: string,
    public service: string,
    public code: string,
    public userMessage: string,
    public shouldRetry: boolean = false
  ) {
    super(message);
    this.name = 'ServiceError';
    Object.setPrototypeOf(this, ServiceError.prototype);
  }

  /**
   * Create a database operation error
   */
  static database(
    operation: string,
    error: Error | unknown,
    shouldRetry: boolean = true
  ): ServiceError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new ServiceError(
      `Database ${operation} failed: ${errorMessage}`,
      'database',
      'DB_ERROR',
      `Unable to complete database operation. Please try again.`,
      shouldRetry
    );
  }

  /**
   * Create an authentication error
   */
  static auth(
    operation: string,
    error: Error | unknown,
    shouldRetry: boolean = false
  ): ServiceError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new ServiceError(
      `Authentication failed: ${errorMessage}`,
      'auth',
      'AUTH_ERROR',
      `Please log in to continue.`,
      shouldRetry
    );
  }

  /**
   * Create a validation error
   */
  static validation(
    field: string,
    message: string,
    shouldRetry: boolean = false
  ): ServiceError {
    return new ServiceError(
      `Validation error on ${field}: ${message}`,
      'validation',
      'VALIDATION_ERROR',
      `Invalid input: ${message}`,
      shouldRetry
    );
  }

  /**
   * Create a network error
   */
  static network(
    operation: string,
    error: Error | unknown,
    shouldRetry: boolean = true
  ): ServiceError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new ServiceError(
      `Network error during ${operation}: ${errorMessage}`,
      'network',
      'NETWORK_ERROR',
      `Network error. Please check your connection and try again.`,
      shouldRetry
    );
  }

  /**
   * Create an API error
   */
  static api(
    endpoint: string,
    statusCode: number,
    error: Error | unknown,
    shouldRetry: boolean = true
  ): ServiceError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const userMessage =
      statusCode === 429
        ? 'Too many requests. Please wait before trying again.'
        : statusCode >= 500
          ? 'Server error. Please try again later.'
          : 'API request failed. Please try again.';

    return new ServiceError(
      `API error from ${endpoint} (${statusCode}): ${errorMessage}`,
      'api',
      `API_ERROR_${statusCode}`,
      userMessage,
      shouldRetry
    );
  }

  /**
   * Create a not found error
   */
  static notFound(
    resource: string,
    identifier: string
  ): ServiceError {
    return new ServiceError(
      `${resource} not found: ${identifier}`,
      'database',
      'NOT_FOUND',
      `${resource} not found.`,
      false
    );
  }

  /**
   * Create a permission error
   */
  static permission(
    operation: string,
    resource: string
  ): ServiceError {
    return new ServiceError(
      `Permission denied for ${operation} on ${resource}`,
      'auth',
      'PERMISSION_DENIED',
      `You do not have permission to perform this action.`,
      false
    );
  }

  /**
   * Create a timeout error
   */
  static timeout(
    operation: string,
    timeoutMs: number
  ): ServiceError {
    return new ServiceError(
      `Operation ${operation} timed out after ${timeoutMs}ms`,
      'timeout',
      'TIMEOUT',
      `Operation took too long. Please try again.`,
      true
    );
  }

  /**
   * Check if error is a ServiceError
   */
  static isServiceError(error: unknown): error is ServiceError {
    return error instanceof ServiceError;
  }

  /**
   * Get detailed error info for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      service: this.service,
      code: this.code,
      userMessage: this.userMessage,
      shouldRetry: this.shouldRetry,
      stack: this.stack,
    };
  }
}
