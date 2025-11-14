/**
 * SM-2 Algorithm for Spaced Repetition
 * Based on SuperMemo SM-2 with custom modifications to match iOS app
 *
 * Quality Rating Mappings (Learning-First Approach):
 *
 * Flashcards (confidence-based swipes):
 * - Left swipe (forgot/don't know): quality 1 → interval resets to 1 day
 * - Up swipe (somewhat know/hesitant): quality 3 → slow progression (1→3→9 days)
 * - Right swipe (know it/confident): quality 4 → normal progression (1→6→15 days)
 *
 * Quizzes (correctness only, no confidence measure):
 * - Incorrect: quality 1 → interval resets to 1 day
 * - Correct: quality 3 → conservative progression (1→3→9 days)
 *
 * Note: We cap at quality 4 to encourage regular practice.
 * Quality 5 creates intervals too long for effective learning (270+ days after 5 reviews).
 */

export interface SM2Result {
  interval: number;
  repetitions: number;
  easinessFactor: number;
  nextDueDate: Date;
  qualityRating: number;
}

export interface SM2Input {
  quality: number; // 0-5
  repetitions: number;
  interval: number;
  easinessFactor: number;
}

/**
 * Quality scale constants for consistency across codebase
 */
export const QUALITY_SCALE = {
  FORGOT: 1,       // Flashcard: left swipe | Quiz: incorrect answer → resets to 1 day
  SOMEWHAT: 3,     // Flashcard: up swipe | Quiz: correct answer → 3 days on 2nd review
  CONFIDENT: 4,    // Flashcard: right swipe only → 6 days on 2nd review
} as const;

/**
 * Core SM2 Algorithm Implementation with Custom Modifications
 *
 * QUALITY SCALE THRESHOLDS:
 * - Quality < 3 (FORGOT): Interval resets to 1 day, repetitions reset to 0
 * - Quality 3 (SOMEWHAT): Conservative progression (3 days on 2nd repeat)
 * - Quality 4+ (CONFIDENT): Normal progression (6 days on 2nd repeat)
 *
 * CUSTOM MODIFICATION: Standard SM-2 gives 6 days for all quality >= 3 on second review.
 * We differentiate quality 3 vs 4+ to reflect user confidence levels.
 */
export function calculateSM2(input: SM2Input): SM2Result {
  let { quality, repetitions, interval, easinessFactor } = input;

  // Ensure quality is within 0-5 range
  quality = Math.max(0, Math.min(5, Math.round(quality)));

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      // CUSTOM SM2: Differentiate quality 3 vs 4+ on second review
      // Quality 3 ("somewhat") = 3 days (shorter interval, more practice)
      // Quality 4+ ("know well") = 6 days (standard SM2 interval)
      interval = quality === 3 ? 3 : 6;
    } else {
      interval = Math.round(interval * easinessFactor);
    }
    repetitions += 1;
  } else {
    // Incorrect response - reset
    repetitions = 0;
    interval = 1;
  }

  // Update easiness factor
  easinessFactor = Math.max(
    1.3,
    easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  // Round easiness factor to 2 decimal places
  easinessFactor = Math.round(easinessFactor * 100) / 100;

  // Calculate next due date
  const nextDueDate = new Date();
  nextDueDate.setDate(nextDueDate.getDate() + interval);
  // Set to start of day in local timezone
  nextDueDate.setHours(0, 0, 0, 0);

  return {
    interval,
    repetitions,
    easinessFactor,
    nextDueDate,
    qualityRating: quality,
  };
}

/**
 * Convert flashcard swipe direction to SM2 quality rating
 */
export function swipeToQuality(
  direction: 'left' | 'right' | 'up'
): number {
  switch (direction) {
    case 'left':
      return QUALITY_SCALE.FORGOT;      // 1 - Forgot
    case 'up':
      return QUALITY_SCALE.SOMEWHAT;    // 3 - Somewhat know
    case 'right':
      return QUALITY_SCALE.CONFIDENT;   // 4 - Know it well
    default:
      return QUALITY_SCALE.SOMEWHAT;
  }
}

/**
 * Convert quiz result to SM2 quality rating
 * Conservative quality scale for quizzes (no confidence measure)
 */
export function quizToQuality(isCorrect: boolean): number {
  return isCorrect
    ? QUALITY_SCALE.SOMEWHAT  // 3 - Correct (conservative)
    : QUALITY_SCALE.FORGOT;   // 1 - Incorrect (reset)
}

/**
 * Calculate streak and lapses based on quality
 */
export function updateStreakAndLapses(
  quality: number,
  currentStreak: number,
  currentLapses: number
): { streak: number; lapses: number } {
  if (quality >= 3) {
    // Correct answer
    return {
      streak: currentStreak + 1,
      lapses: currentLapses,
    };
  } else {
    // Incorrect answer
    return {
      streak: 0,
      lapses: currentLapses + 1,
    };
  }
}

/**
 * Get difficulty level based on easiness factor
 */
export function getDifficultyLevel(easinessFactor: number): 'easy' | 'medium' | 'hard' {
  if (easinessFactor >= 2.5) {
    return 'easy';
  } else if (easinessFactor >= 1.9) {
    return 'medium';
  } else {
    return 'hard';
  }
}

/**
 * Format interval to human-readable string
 */
export function formatInterval(interval: number): string {
  if (interval === 0) {
    return 'New';
  } else if (interval === 1) {
    return '1 day';
  } else if (interval < 7) {
    return `${interval} days`;
  } else if (interval < 30) {
    const weeks = Math.floor(interval / 7);
    return weeks === 1 ? '1 week' : `${weeks} weeks`;
  } else if (interval < 365) {
    const months = Math.floor(interval / 30);
    return months === 1 ? '1 month' : `${months} months`;
  } else {
    const years = Math.floor(interval / 365);
    return years === 1 ? '1 year' : `${years} years`;
  }
}

/**
 * Format date to YYYY-MM-DD in local timezone
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date as YYYY-MM-DD in local timezone
 */
export function getLocalDate(): string {
  return formatDateString(new Date());
}

/**
 * Get date N days from now as YYYY-MM-DD in local timezone
 */
export function getLocalDatePlusDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateString(date);
}
