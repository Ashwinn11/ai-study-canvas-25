/**
 * Telemetry module - now powered by Sentry
 * This maintains the same API as before but uses Sentry for tracking
 */
import { trackEvent, trackError } from '@/lib/api/sentry';

type TelemetryPayload = Record<string, unknown>;

/**
 * Record a user event or action
 * @deprecated Use trackEvent from @/services/sentry directly for new code
 */
export const recordEvent = (name: string, payload: TelemetryPayload = {}) => {
  trackEvent(name, payload);
};

/**
 * Record an error
 * @deprecated Use trackError from @/services/sentry directly for new code
 */
export const recordError = (
  name: string,
  error: unknown,
  payload: TelemetryPayload = {},
) => {
  trackError(error, name, payload);
};
