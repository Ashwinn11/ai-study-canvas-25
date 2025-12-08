/* eslint-disable no-console */

interface LogLevelMap {
  DEBUG: number;
  INFO: number;
  WARN: number;
  ERROR: number;
}

type LogLevelName = keyof LogLevelMap;
type SentryLevel = "debug" | "info" | "warning" | "error";

const LOG_LEVELS: LogLevelMap = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const SENTRY_LEVEL_MAP: Record<LogLevelName, SentryLevel> = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warning",
  ERROR: "error",
};

const originalConsole = {
  log: console.log.bind(console),
  info: console.info ? console.info.bind(console) : console.log.bind(console),
  warn: console.warn ? console.warn.bind(console) : console.log.bind(console),
  error: console.error
    ? console.error.bind(console)
    : console.log.bind(console),
  debug: console.debug
    ? console.debug.bind(console)
    : console.log.bind(console),
};

const parseLogLevel = (
  rawLevel: string | undefined,
  fallback: LogLevelName,
): number => {
  if (!rawLevel) {
    return LOG_LEVELS[fallback];
  }

  const normalized = rawLevel.toUpperCase();

  if (Object.prototype.hasOwnProperty.call(LOG_LEVELS, normalized)) {
    return LOG_LEVELS[normalized as LogLevelName];
  }

  return LOG_LEVELS[fallback];
};

const truncate = (value: string, limit: number = 500): string => {
  if (value.length <= limit) {
    return value;
  }

  const safeLimit = Math.max(limit - 3, 0);
  return `${value.slice(0, safeLimit)}...`;
};

const serializeArg = (value: any): any => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (value === undefined) {
    return "undefined";
  }

  if (value === null) {
    return null;
  }

  if (typeof value === "function") {
    return `[Function ${value.name || "anonymous"}]`;
  }

  if (typeof value === "symbol") {
    return value.toString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "object") {
    try {
      const stringified = JSON.stringify(value);
      if (stringified) {
        try {
          return JSON.parse(stringified);
        } catch {
          return value;
        }
      }
    } catch {
      // Silently handle JSON errors to avoid circular dependency
    }
    return { type: Object.prototype.toString.call(value) };
  }

  return value;
};

const stringifyArg = (value: any): string => {
  if (typeof value === "string") {
    return value;
  }

  const serialized = serializeArg(value);

  if (typeof serialized === "string") {
    return serialized;
  }

  try {
    return JSON.stringify(serialized);
  } catch {
    return String(serialized);
  }
};

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private logLevel = parseLogLevel(
    process.env.NEXT_PUBLIC_LOG_LEVEL || process.env.EXPO_PUBLIC_LOG_LEVEL,
    this.isDevelopment ? "INFO" : "WARN",
  );
  private breadcrumbLevel = parseLogLevel(
    process.env.NEXT_PUBLIC_LOG_BREADCRUMB_LEVEL || process.env.EXPO_PUBLIC_LOG_BREADCRUMB_LEVEL,
    this.isDevelopment ? "INFO" : "INFO",
  );

  private shouldLog(level: number): boolean {
    return level >= this.logLevel;
  }

  private shouldAddBreadcrumb(level: number): boolean {
    return level >= this.breadcrumbLevel;
  }

  private formatMessage(levelName: LogLevelName | "DEV", args: any[]): void {
    if (!this.isDevelopment) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${levelName}]`;

    originalConsole.log(prefix, ...args);
  }

  private addBreadcrumb(levelName: LogLevelName, args: any[]): void {
    if (!this.shouldAddBreadcrumb(LOG_LEVELS[levelName])) {
      return;
    }

    // Try to use Sentry if available
    if (typeof window !== 'undefined') {
      // Client-side: use Sentry browser SDK
      try {
        const Sentry = (window as any).Sentry;
        if (Sentry && Sentry.addBreadcrumb) {
          const message = args.map(stringifyArg).join(' ');
          Sentry.addBreadcrumb({
            message: truncate(message, 500),
            level: SENTRY_LEVEL_MAP[levelName],
            timestamp: Date.now() / 1000,
          });
        }
      } catch (error) {
        // Silently fail if Sentry is not available
      }
    }
  }

  private handle(levelName: LogLevelName, args: any[]): void {
    const level = LOG_LEVELS[levelName];

    if (this.shouldLog(level)) {
      this.formatMessage(levelName, args);
    }

    this.addBreadcrumb(levelName, args);
  }

  debug(...args: any[]): void {
    this.handle("DEBUG", args);
  }

  info(...args: any[]): void {
    this.handle("INFO", args);
  }

  warn(...args: any[]): void {
    this.handle("WARN", args);
    if (
      !this.isDevelopment &&
      process.env.EXPO_PUBLIC_LOG_ECHO_WARNINGS === "true"
    ) {
      originalConsole.warn("[WARN]", ...args);
    }
  }

  error(...args: any[]): void {
    this.handle("ERROR", args);

    // Send errors to Sentry
    if (!this.isDevelopment) {
      try {
        if (typeof window !== 'undefined') {
          const Sentry = (window as any).Sentry;
          if (Sentry && Sentry.captureException) {
            // Find the first Error object in args
            const error = args.find(arg => arg instanceof Error);
            if (error) {
              Sentry.captureException(error, {
                extra: {
                  args: args.filter(arg => !(arg instanceof Error)).map(serializeArg),
                },
              });
            } else {
              // If no Error object, capture as message
              const message = args.map(stringifyArg).join(' ');
              Sentry.captureMessage(message, 'error');
            }
          }
        }
      } catch (sentryError) {
        // Silently fail if Sentry is not available
      }

      originalConsole.error("[ERROR]", ...args);
    }
  }

  log(...args: any[]): void {
    this.info(...args);
  }

  devLog(...args: any[]): void {
    this.formatMessage("DEV", args);
  }
}

export const logger = new Logger();

let loggingInitialized = false;

export const initializeLogging = (): void => {
  if (loggingInitialized) {
    return;
  }

  loggingInitialized = true;

  const methodMap: Array<[keyof Console, (...args: any[]) => void]> = [
    ["log", (...args: any[]) => logger.info(...args)],
    ["info", (...args: any[]) => logger.info(...args)],
    ["warn", (...args: any[]) => logger.warn(...args)],
    ["error", (...args: any[]) => logger.error(...args)],
    ["debug", (...args: any[]) => logger.debug(...args)],
  ];

  methodMap.forEach(([method, handler]) => {
    (console as any)[method] = handler;
  });
};

export const devLog = (...args: any[]): void => {
  logger.devLog(...args);
};

export const safeConsole = {
  log: (...args: any[]) => logger.info(...args),
  info: (...args: any[]) => logger.info(...args),
  warn: (...args: any[]) => logger.warn(...args),
  error: (...args: any[]) => logger.error(...args),
  debug: (...args: any[]) => logger.debug(...args),
};
