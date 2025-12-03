import { safeJSONParse } from "@/utils/safeJson";
import { ErrorHandler } from "@/utils/errorHandler";
// Lightweight, robust helpers for extracting JSON objects/arrays from LLM text
// Avoids brittle regex-only parsing and tolerates code fences and pre/post text.

type Validator<T> = (value: unknown) => value is T;

const stripCodeFences = (input: string): string => {
  return input
    .replace(/```json[\r\n]*/gi, "")
    .replace(/```[\r\n]*/g, "")
    .trim();
};

const tryParse = <T = any>(text: string): T | null => {
  return safeJSONParse(text, null, "aiParsing.tryParse") as T | null;
};

// Finds the first balanced JSON object starting at some '{' or the first balanced array starting at '['.
// Handles quotes and escapes to avoid counting braces in strings.
const findBalancedJsonSubstring = (
  input: string,
  startChar: "{" | "[",
): string | null => {
  const endChar = startChar === "{" ? "}" : "]";
  const startIndex = input.indexOf(startChar);
  if (startIndex === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < input.length; i++) {
    const ch = input[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === startChar) depth++;
    else if (ch === endChar) depth--;

    if (depth === 0) {
      return input.slice(startIndex, i + 1);
    }
  }
  return null;
};

// Find a balanced array literal that appears after a given JSON-like key name, e.g., "questions": [ ... ]
const findArrayAfterKey = (input: string, key: string): string | null => {
  const keyIdx = input.indexOf(`"${key}"`);
  if (keyIdx === -1) return null;
  // Find the first '[' after the key occurrence
  const bracketIdx = input.indexOf("[", keyIdx);
  if (bracketIdx === -1) return null;

  // Reuse balancing logic starting at this '['
  const slice = input.slice(bracketIdx);
  const arr = findBalancedJsonSubstring(slice, "[");
  return arr;
};

export function extractJsonFromText<T = any>(
  raw: string,
  validator?: Validator<T>,
): T {
  const text = stripCodeFences(raw);

  // Stage 1: Try whole text as-is (fastest path)
  let parsed = tryParse<T>(text);
  if (parsed && (!validator || validator(parsed))) {
    return parsed;
  }

  // Stage 2: Try balanced substring extraction (handles extra text)
  // 2a) Try array substring FIRST (arrays are more common in AI responses)
  const arr = findBalancedJsonSubstring(text, "[");
  if (arr) {
    parsed = tryParse<T>(arr);
    if (parsed && (!validator || validator(parsed))) {
      return parsed;
    }
  }

  // 2b) Try object substring as fallback
  const obj = findBalancedJsonSubstring(text, "{");
  if (obj) {
    parsed = tryParse<T>(obj);
    if (parsed && (!validator || validator(parsed))) {
      return parsed;
    }
  }

  // Stage 3: Targeted key-based extraction for common wrappers
  const candidateKeys = [
    "questions",
    "flashcards",
    "cards",
    "items",
    "data",
    "results",
  ];
  for (const key of candidateKeys) {
    try {
      const arr = findArrayAfterKey(text, key);
      if (!arr) continue;
      const parsed = tryParse<any>(arr);
      if (parsed && Array.isArray(parsed)) {
        return parsed as unknown as T;
      }
      // Try salvage if the array is malformed (e.g., last element truncated)
      const salvaged = salvageArrayOfObjects(arr);
      if (salvaged && Array.isArray(salvaged)) {
        return salvaged as unknown as T;
      }
    } catch (error) {
      // Ignore salvage errors, continue to next stage
    }
  }

  // Stage 4: Advanced repair - try to fix common JSON issues
  const repaired = attemptJsonRepair(text);
  if (repaired) {
    parsed = tryParse<T>(repaired);
    if (parsed && (!validator || validator(parsed))) {
      return parsed;
    }
  }

  // Stage 5: Last resort - extract just the value from key-value pairs
  for (const key of candidateKeys) {
    try {
      const regex = new RegExp(
        `"${key}"\\s*:\\s*({[\\s\\S]*?}|\\[[\\s\\S]*?\\])`,
        "i",
      );
      const match = text.match(regex);
      if (match && match[1]) {
        parsed = tryParse<any>(match[1]);
        if (parsed) {
          // If we got an object with the key, unwrap it
          if (
            typeof parsed === "object" &&
            !Array.isArray(parsed) &&
            (parsed as any)[key]
          ) {
            return (parsed as any)[key] as T;
          }
          return parsed as T;
        }
      }
    } catch (error) {
      // Ignore parsing errors during fallback attempts
    }
  }

  if (process.env.NODE_ENV === 'development') {
    // Error logged through error handling system
  }
  throw new Error("No valid JSON found in text after all parsing attempts");
}

// Attempt to repair common JSON issues
function attemptJsonRepair(text: string): string | null {
  try {
    let repaired = text.trim();

    // Fix trailing commas in arrays and objects
    repaired = repaired.replace(/,(\s*[}\]])/g, "$1");

    // Fix missing quotes around keys
    repaired = repaired.replace(/(\w+):/g, '"$1":');

    // Fix single quotes to double quotes
    repaired = repaired.replace(/'/g, '"');

    // Try to close unclosed brackets/braces
    const openBraces = (repaired.match(/{/g) || []).length;
    const closeBraces = (repaired.match(/}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;

    if (openBraces > closeBraces) {
      repaired += "}".repeat(openBraces - closeBraces);
    }
    if (openBrackets > closeBrackets) {
      repaired += "]".repeat(openBrackets - closeBrackets);
    }

    // Test if repair worked
    const test = tryParse(repaired);
    if (test) {
      return repaired;
    }
  } catch (e) {
    // Ignore repair errors
  }
  return null;
}

export function extractJsonArrayFromText<T = any>(
  raw: string,
  validator?: Validator<T[]>,
): T[] {
  const result = extractJsonFromText<T[]>(raw);
  if (Array.isArray(result)) return result as T[];
  if (validator && validator(result)) return result as T[];
  throw new Error("Parsed JSON is not an array");
}

export function safeExtractJson<T = any>(
  raw: string,
  validator?: Validator<T>,
): { data?: T; error?: string } {
  try {
    const data = extractJsonFromText<T>(raw, validator);
    return { data };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to extract JSON" };
  }
}
// Attempt to parse an array by extracting balanced object elements inside it.
// Salvages valid leading objects and drops a trailing incomplete one.
const salvageArrayOfObjects = (arrText: string): any[] | null => {
  const text = arrText.trim();
  if (!text.startsWith("[")) return null;
  let i = 1; // skip initial '['
  const out: any[] = [];
  const n = text.length;
  while (i < n) {
    // skip whitespace and commas
    while (i < n && /[\s,]/.test(text[i])) i++;
    if (i >= n) break;
    if (text[i] === "]") break; // end of array
    if (text[i] !== "{") {
      // unexpected token; abort salvage
      return out.length > 0 ? out : null;
    }

    // find balanced object starting at i
    const slice = text.slice(i);
    const objStr = findBalancedJsonSubstring(slice, "{");
    if (!objStr) {
      // trailing incomplete object; stop and return what we have
      return out.length > 0 ? out : null;
    }
    const parsed = safeJSONParse(
      objStr,
      null,
      "aiParsing.parseJsonArrayFromText",
    );
    if (parsed !== null) {
      out.push(parsed);
    } else {
      // malformed object; stop if we already have some
      ErrorHandler.handleParsingError(
        new Error("Failed to parse JSON object from text"),
        "aiParsing.parseJsonArrayFromText",
        { severity: "low", additionalInfo: { textLength: text.length } },
      );
      return out.length > 0 ? out : null;
    }
    i += objStr.length;
    // continue loop to next element
  }
  return out;
};
