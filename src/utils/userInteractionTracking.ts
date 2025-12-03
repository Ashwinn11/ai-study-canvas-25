import { trackEvent } from '@/lib/api/sentry';

/**
 * User interaction tracking utilities
 * Centralizes tracking of key user actions throughout the app
 */

export interface InteractionEvent {
  action: string;
  category?: string;
  label?: string;
  value?: number;
  properties?: Record<string, any>;
}

class UserInteractionTracker {
  /**
   * Track a user interaction/event
   */
  track(event: InteractionEvent) {
    try {
      trackEvent(event.action, {
        category: event.category,
        label: event.label,
        value: event.value,
        ...event.properties,
      });
    } catch (error) {
      console.error('Failed to track user interaction:', error);
    }
  }

  /**
   * Track page view
   */
  trackPageView(pageName: string, properties?: Record<string, any>) {
    this.track({
      action: 'page_view',
      category: 'navigation',
      label: pageName,
      properties,
    });
  }

  /**
   * Track button click
   */
  trackButtonClick(buttonName: string, context?: string) {
    this.track({
      action: 'button_click',
      category: 'ui_interaction',
      label: buttonName,
      properties: { context },
    });
  }

  /**
   * Track form submission
   */
  trackFormSubmission(formName: string, success: boolean, properties?: Record<string, any>) {
    this.track({
      action: 'form_submission',
      category: 'form',
      label: formName,
      properties: { success, ...properties },
    });
  }

  /**
   * Track file upload
   */
  trackFileUpload(fileName: string, fileSize: number, fileType: string, success: boolean) {
    this.track({
      action: 'file_upload',
      category: 'file_operations',
      label: fileName,
      value: fileSize,
      properties: { fileType, success },
    });
  }

  /**
   * Track search query
   */
  trackSearch(query: string, resultsCount?: number) {
    this.track({
      action: 'search',
      category: 'content_discovery',
      label: query,
      value: resultsCount,
    });
  }

  /**
   * Track content creation
   */
  trackContentCreation(contentType: string, contentId?: string) {
    this.track({
      action: 'content_created',
      category: 'content',
      label: contentType,
      properties: { contentId },
    });
  }

  /**
   * Track error occurrence
   */
  trackError(errorType: string, errorMessage?: string, context?: Record<string, any>) {
    this.track({
      action: 'error_occurred',
      category: 'error',
      label: errorType,
      properties: { errorMessage, ...context },
    });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(featureName: string, properties?: Record<string, any>) {
    this.track({
      action: 'feature_used',
      category: 'feature',
      label: featureName,
      properties,
    });
  }

  /**
   * Track session start
   */
  trackSessionStart(userId?: string) {
    this.track({
      action: 'session_start',
      category: 'session',
      properties: { userId },
    });
  }

  /**
   * Track session end
   */
  trackSessionEnd(sessionDuration?: number, userId?: string) {
    this.track({
      action: 'session_end',
      category: 'session',
      value: sessionDuration,
      properties: { userId },
    });
  }
}

export const interactionTracker = new UserInteractionTracker();

// Convenience functions
export const trackPageView = (pageName: string, properties?: Record<string, any>) => {
  interactionTracker.trackPageView(pageName, properties);
};

export const trackButtonClick = (buttonName: string, context?: string) => {
  interactionTracker.trackButtonClick(buttonName, context);
};

export const trackFormSubmission = (formName: string, success: boolean, properties?: Record<string, any>) => {
  interactionTracker.trackFormSubmission(formName, success, properties);
};

export const trackFileUpload = (fileName: string, fileSize: number, fileType: string, success: boolean) => {
  interactionTracker.trackFileUpload(fileName, fileSize, fileType, success);
};

export const trackSearch = (query: string, resultsCount?: number) => {
  interactionTracker.trackSearch(query, resultsCount);
};

export const trackContentCreation = (contentType: string, contentId?: string) => {
  interactionTracker.trackContentCreation(contentType, contentId);
};

export const trackError = (errorType: string, errorMessage?: string, context?: Record<string, any>) => {
  interactionTracker.trackError(errorType, errorMessage, context);
};

export const trackFeatureUsage = (featureName: string, properties?: Record<string, any>) => {
  interactionTracker.trackFeatureUsage(featureName, properties);
};

export const trackSessionStart = (userId?: string) => {
  interactionTracker.trackSessionStart(userId);
};

export const trackSessionEnd = (sessionDuration?: number, userId?: string) => {
  interactionTracker.trackSessionEnd(sessionDuration, userId);
};