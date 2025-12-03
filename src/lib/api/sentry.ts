// Web stub for Sentry - use @sentry/nextjs in production
// For now, all functions are no-ops

export const initSentry = () => {
  // Stub implementation - no Sentry initialization for web
};

export const trackEvent = (name: string, data?: Record<string, any>) => {
  // Stub implementation
};

export const trackError = (
  error: unknown,
  context?: string,
  data?: Record<string, any>,
  severity: "low" | "medium" | "high" | "critical" = "medium",
) => {
  // Stub implementation
};

export const identifyUser = (userId: string, email?: string) => {
  // Stub implementation
};

export const clearUser = () => {
  // Stub implementation
};

export const setContext = (key: string, value: Record<string, any>) => {
  // Stub implementation
};

export const trackCriticalError = (
  error: unknown,
  context: string,
  data?: Record<string, any>,
  severity: "low" | "medium" | "high" | "critical" = "medium",
) => {
  // Stub implementation
};

export const trackNetworkIssue = (
  type: "offline" | "online" | "slow" | "timeout",
  context?: string,
  data?: Record<string, any>,
) => {
  // Stub implementation
};

export const trackStorageError = (
  operation: "read" | "write" | "clear" | "quota_exceeded",
  key?: string,
  error?: unknown,
) => {
  // Stub implementation
};

export const trackPerformanceIssue = (
  type:
    | "memory_warning"
    | "high_memory_usage"
    | "slow_render"
    | "component_timeout",
  context?: string,
  data?: Record<string, any>,
) => {
  // Stub implementation
};

export const trackBackgroundTaskIssue = (
  type: "execution_limit" | "resource_constraint" | "os_termination",
  taskId?: string,
  data?: Record<string, any>,
) => {
  // Stub implementation
};
