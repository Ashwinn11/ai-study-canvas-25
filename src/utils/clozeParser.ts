/**
 * Cloze Deletion Parser
 *
 * Parses cloze deletion syntax ({{c1::text}}, {{c2::text}}, etc.) and provides
 * utilities for rendering question and answer sides of flashcards.
 */

export interface ClozeSegment {
  text: string;
  isCloze: boolean;
  clozeNumber?: number;
  isBold?: boolean;
}

export interface ParsedCloze {
  segments: ClozeSegment[];
  hasCloze: boolean;
  answers: string[];
}

/**
 * Parses cloze deletion syntax from a string
 * Example: "PCOS is often linked with {{c1::obesity}} and {{c2::genetics}}."
 *
 * @param text - The text containing cloze deletion syntax
 * @returns Parsed cloze data with segments, flags, and extracted answers
 */
export function parseCloze(text: string): ParsedCloze {
  if (!text) {
    return { segments: [], hasCloze: false, answers: [] };
  }

  const segments: ClozeSegment[] = [];
  const answers: string[] = [];
  let hasCloze = false;

  // Regex to match {{cN::text}} patterns
  const clozeRegex = /\{\{c(\d+)::([^}]+)\}\}/g;
  let lastIndex = 0;
  let match;

  while ((match = clozeRegex.exec(text)) !== null) {
    hasCloze = true;
    const clozeNumber = parseInt(match[1], 10);
    const clozeText = match[2];

    // Add text before this cloze deletion
    if (match.index > lastIndex) {
      segments.push({
        text: text.substring(lastIndex, match.index),
        isCloze: false
      });
    }

    // Add the cloze deletion segment
    segments.push({
      text: clozeText,
      isCloze: true,
      clozeNumber
    });

    answers.push(clozeText);
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last cloze deletion
  if (lastIndex < text.length) {
    segments.push({
      text: text.substring(lastIndex),
      isCloze: false
    });
  }

  // If no cloze deletions found, return the entire text as a single segment
  if (!hasCloze) {
    segments.push({
      text: text,
      isCloze: false
    });
  }

  return { segments, hasCloze, answers };
}

/**
 * Renders question text by hiding cloze deletions
 * Example: "PCOS is often linked with {{c1::obesity}} and {{c2::genetics}}."
 *       -> "PCOS is often linked with _______ and _______."
 *
 * @param text - The text containing cloze deletion syntax
 * @param placeholder - The placeholder to use for hidden text (default: "_______")
 * @returns Text with cloze deletions replaced by placeholders
 */
export function renderClozeQuestion(text: string, placeholder: string = '_______'): string {
  const parsed = parseCloze(text);

  if (!parsed.hasCloze) {
    return text;
  }

  return parsed.segments
    .map(segment => segment.isCloze ? placeholder : segment.text)
    .join('');
}

/**
 * Renders answer text by revealing cloze deletions
 * Example: "PCOS is often linked with {{c1::obesity}} and {{c2::genetics}}."
 *       -> "PCOS is often linked with obesity and genetics."
 *
 * @param text - The text containing cloze deletion syntax
 * @returns Text with cloze syntax removed, showing the answers
 */
export function renderClozeAnswer(text: string): string {
  const parsed = parseCloze(text);

  return parsed.segments
    .map(segment => segment.text)
    .join('');
}

/**
 * Returns segments for answer rendering with bold highlighting for cloze answers
 * Use this for rendering with React Native Text components to support styling
 *
 * @param text - The text containing cloze deletion syntax
 * @returns Array of segments with isBold flag for cloze answers
 */
export function getClozeAnswerSegments(text: string): ClozeSegment[] {
  const parsed = parseCloze(text);

  if (!parsed.hasCloze) {
    return [{ text, isCloze: false, isBold: false }];
  }

  return parsed.segments.map(segment => ({
    ...segment,
    isBold: segment.isCloze // Bold the answers that were hidden
  }));
}

/**
 * Checks if text contains cloze deletion syntax
 *
 * @param text - The text to check
 * @returns True if text contains cloze deletions
 */
export function hasClozeText(text: string): boolean {
  return /\{\{c\d+::[^}]+\}\}/.test(text);
}

/**
 * Extracts all cloze answers from text
 * Example: "PCOS is often linked with {{c1::obesity}} and {{c2::genetics}}."
 *       -> ["obesity", "genetics"]
 *
 * @param text - The text containing cloze deletion syntax
 * @returns Array of answer strings
 */
export function extractClozeAnswers(text: string): string[] {
  const parsed = parseCloze(text);
  return parsed.answers;
}
