// Lightweight content lint and readability helpers to surface common quality issues

export type LintIssue = { type: string; message: string };

const normalize = (s: string) =>
  s
    .toLocaleLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const tokenize = (s: string) => normalize(s).split(' ').filter(Boolean);

export function jaccardSimilarity(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  ta.forEach(t => { if (tb.has(t)) inter++; });
  const union = ta.size + tb.size - inter;
  return inter / union;
}

export function findNearDuplicates<T>(items: T[], key: (x: T) => string, threshold = 0.85): number[] {
  const removeIdx: Set<number> = new Set();
  for (let i = 0; i < items.length; i++) {
    if (removeIdx.has(i)) continue;
    for (let j = i + 1; j < items.length; j++) {
      if (removeIdx.has(j)) continue;
      const sim = jaccardSimilarity(key(items[i]), key(items[j]));
      if (sim >= threshold) removeIdx.add(j);
    }
  }
  return Array.from(removeIdx.values()).sort((a, b) => b - a);
}

export function isAtomicFlashcard(question: string, answer: string): boolean {
  const qMarks = (question.match(/\?/g) || []).length;
  if (qMarks > 1) return false;
  const conj = /( and | or |; )/i;
  if (conj.test(question) && question.split(',').length > 1) return false;
  const words = answer.trim().split(/\s+/);
  if (words.length > 40) return false; // too long for a single fact
  return true;
}

export function validateQuizQuestion(q: { options: string[]; correct_answer: number; explanation?: string }): LintIssue[] {
  const issues: LintIssue[] = [];
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    issues.push({ type: 'structure', message: 'Question must have exactly 4 options' });
  } else {
    const norms = q.options.map(o => normalize(o));
    const set = new Set(norms);
    if (set.size !== norms.length) issues.push({ type: 'options', message: 'Duplicate options detected' });
  }
  if (typeof q.correct_answer !== 'number' || q.correct_answer < 0 || q.correct_answer > 3) {
    issues.push({ type: 'answer', message: 'correct_answer index must be 0-3' });
  }
  const exp = (q.explanation || '').toLowerCase();
  if (exp.length < 10) issues.push({ type: 'explanation', message: 'Explanation is too short' });
  return issues;
}

export function readabilityStats(text: string): { words: number; sentences: number; lettersPer100: number; gradeEstimate: number } {
  const sentences = Math.max(1, (text.match(/[.!?]/g) || []).length);
  const words = Math.max(1, text.trim().split(/\s+/).length);
  const letters = (text.match(/[A-Za-z]/g) || []).length;
  const L = (letters / words) * 100; // letters per 100 words
  const S = (sentences / words) * 100; // sentences per 100 words
  // Coleman–Liau index
  const grade = 0.0588 * L - 0.296 * S - 15.8;
  return { words, sentences, lettersPer100: L, gradeEstimate: Math.max(0, Math.round(grade * 10) / 10) };
}

// Simple heuristics to detect gibberish-like text. Returns 0..1 (1 = very likely gibberish)
export function gibberishScore(text: string): number {
  if (!text || text.trim().length === 0) return 1;
  const raw = text.trim();
  const ascii = (raw.match(/[\x00-\x7F]/g) || []).length;
  const nonAscii = raw.length - ascii;
  const nonAsciiRatio = nonAscii / Math.max(1, raw.length);

  const words = raw.split(/\s+/).filter(Boolean);
  const longNoVowel = words.filter(w => w.length >= 6 && !/[aeiou]/i.test(w)).length;
  const noVowelRatio = longNoVowel / Math.max(1, words.length);

  const repeatedSeq = /(.)\1{3,}/.test(raw) ? 1 : 0; // e.g., aaaa
  const symbolHeavy = (/[^\w\s.,;:!?\-()\[\]']/g.test(raw) && (raw.match(/[^\w\s]/g) || []).length / Math.max(1, raw.length) > 0.15) ? 1 : 0;

  // Very short can be low gibberish by default
  if (words.length <= 3) return 0;

  const score = (
    0.45 * Math.min(1, noVowelRatio * 2) +
    0.25 * nonAsciiRatio +
    0.2 * repeatedSeq +
    0.1 * symbolHeavy
  );
  return Math.max(0, Math.min(1, score));
}

export function isLikelyGibberish(
  text: string,
  language?: string,
  threshold = 0.6
): boolean {
  const raw = text || "";
  const asciiCount = (raw.match(/[\x00-\x7F]/g) || []).length;
  const nonAsciiCount = raw.length - asciiCount;
  const nonAsciiRatio = nonAsciiCount / Math.max(1, raw.length);

  // Bypass gibberish check for non-English languages
  // The gibberishScore algorithm is English-centric (uses ASCII ratio and [aeiou] vowels)
  // Non-Latin scripts (Arabic, Chinese, Japanese, Hebrew, etc.) will incorrectly score high
  if (language) {
    // Normalize language code to base (strip dialects like en-US → en)
    const baseLang = language.toLowerCase().split('-')[0];
    if (baseLang !== 'en') {
      return false;
    }
  } else if (nonAsciiRatio > 0.3) {
    // If language is unknown but the text is predominantly non-ASCII,
    // assume it is non-English and skip the English-centric gibberish check
    return false;
  }
  // Only run the English-centric check if language is 'en' or undefined
  return gibberishScore(text) >= threshold;
}
