// Simple console logging to avoid circular dependency with logger.ts
// This is a low-level utility that logger.ts depends on
const logError = (message: string, ...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    // Error logging handled at higher level
  }
};

// eslint-disable-next-line no-console
const logWarn = (message: string, ...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.warn(`[safeJson] ${message}`, ...args);
  }
};

/**
 * Safely parse JSON strings without crashing on invalid data
 * Falls back to provided default value if parsing fails
 *
 * @param jsonString - The JSON string to parse
 * @param fallback - Default value if parsing fails
 * @param context - Optional context for logging
 * @returns Parsed JSON or fallback value
 */
export function safeJSONParse<T>(
  jsonString: string | null | undefined,
  fallback: T,
  context?: string,
): T {
  if (!jsonString) {
    return fallback;
  }

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    logWarn(
      `JSON.parse failed${context ? ` in ${context}` : ""}`,
      error instanceof Error ? error.message : String(error),
    );
    return fallback;
  }
}

/**
 * Safely stringify JSON objects without crashing
 * Falls back to null if stringification fails
 *
 * @param value - The value to stringify
 * @param context - Optional context for logging
 * @returns JSON string or null
 */
export function safeJSONStringify(value: any, context?: string): string | null {
  try {
    return JSON.stringify(value);
  } catch (error) {
    logError(
      `JSON.stringify failed${context ? ` in ${context}` : ""}`,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

/**
 * Parse JSON with type validation
 * Ensures parsed object matches expected type
 *
 * @param jsonString - The JSON string to parse
 * @param fallback - Default value if parsing or validation fails
 * @param validator - Optional validator function
 * @param context - Optional context for logging
 * @returns Parsed and validated JSON or fallback value
 */
export function safeJSONParseWithValidation<T>(
  jsonString: string | null | undefined,
  fallback: T,
  validator?: (value: any) => boolean,
  context?: string,
): T {
  const parsed = safeJSONParse(jsonString, fallback, context);

  if (validator && !validator(parsed)) {
    logWarn(`JSON validation failed${context ? ` in ${context}` : ""}`, {
      parsed,
    });
    return fallback;
  }

  return parsed;
}
