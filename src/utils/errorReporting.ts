import { identifyUser, clearUser, trackEvent } from '@/lib/api/sentry';
import { logger } from "@/utils/logger";

export interface ErrorReport {
  error: Error;
  context?: Record<string, any>;
  tags?: Record<string, string>;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
}

export interface UserAction {
  action: string;
  properties?: Record<string, any>;
  category?: string;
}

class ErrorReportingService {
  /**
   * Report an error to Sentry
   */
  reportError(report: ErrorReport) {
    try {
      logger.error('Error reported:', report.error, report.context);
      
      // Send to Sentry if available
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(report.error, {
          contexts: report.context ? { custom: report.context } : undefined,
          tags: report.tags,
          level: report.level || 'error',
        });
      }
    } catch (err) {
      logger.error('Failed to report error:', err);
    }
  }

  /**
   * Track user action
   */
  trackAction(action: UserAction) {
    try {
      logger.info('User action:', action.action, action.properties);
      
      // Send to analytics if available
      trackEvent(action.action, action.properties);
    } catch (err) {
      logger.error('Failed to track action:', err);
    }
  }

  /**
   * Identify current user
   */
  identifyUser(userId: string, traits?: Record<string, any>) {
    try {
      logger.info('User identified:', userId);
      
      // Send to Sentry if available
      identifyUser(userId, traits?.email);
    } catch (err) {
      logger.error('Failed to identify user:', err);
    }
  }

  /**
   * Clear current user
   */
  clearUser() {
    try {
      logger.info('User cleared');
      
      // Clear from Sentry if available
      clearUser();
    } catch (err) {
      logger.error('Failed to clear user:', err);
    }
  }

  /**
   * Report a fatal error
   */
  reportFatalError(error: Error, context?: Record<string, any>) {
    this.reportError({
      error,
      context,
      level: 'fatal',
    });
  }

  /**
   * Report a warning
   */
  reportWarning(error: Error, context?: Record<string, any>) {
    this.reportError({
      error,
      context,
      level: 'warning',
    });
  }
}

export const errorReporting = new ErrorReportingService();

// Convenience functions
export const reportError = (error: Error, context?: Record<string, any>) => {
  errorReporting.reportError({ error, context });
};

export const reportFatalError = (error: Error, context?: Record<string, any>) => {
  errorReporting.reportFatalError(error, context);
};

export const reportWarning = (error: Error, context?: Record<string, any>) => {
  errorReporting.reportWarning(error, context);
};

export const trackUserAction = (action: string, properties?: Record<string, any>) => {
  errorReporting.trackAction({ action, properties });
};