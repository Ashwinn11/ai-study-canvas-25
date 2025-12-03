/**
 * Date/Time Utility Functions
 *
 * All functions use the user's LOCAL timezone, not UTC.
 * This ensures dates are consistent with user expectations.
 */

/**
 * Get current date in local timezone as YYYY-MM-DD string
 * @returns Local date string (e.g., "2025-10-19")
 */
export function getLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get start of today (midnight) in local timezone
 * @returns Date object set to local midnight
 */
export function getLocalMidnight(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

/**
 * Add days to a date in local timezone
 * @param date Starting date
 * @param days Number of days to add
 * @returns New date with days added
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add days to current date and return as YYYY-MM-DD string
 * @param days Number of days to add to today
 * @returns Local date string
 */
export function getLocalDatePlusDays(days: number): string {
  const date = addDays(new Date(), days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert Date object to YYYY-MM-DD string in local timezone
 * @param date Date object
 * @returns Local date string
 */
export function dateToLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse ISO timestamp to local date string (YYYY-MM-DD)
 * @param isoString ISO 8601 timestamp
 * @returns Local date string
 */
export function isoToLocalDate(isoString: string): string {
  const date = new Date(isoString);
  return dateToLocalDateString(date);
}

/**
 * Get start of week (Sunday) in local timezone
 * @returns Date object set to local Sunday midnight
 */
export function getLocalStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - day);
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
}

/**
 * Compare two date strings (YYYY-MM-DD format)
 * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareDateStrings(date1: string, date2: string): number {
  if (date1 < date2) return -1;
  if (date1 > date2) return 1;
  return 0;
}

/**
 * Check if a date string is today in local timezone
 * @param dateString YYYY-MM-DD format
 * @returns true if date is today
 */
export function isToday(dateString: string): boolean {
  return dateString === getLocalDate();
}

/**
 * Check if a date string is in the past (before today)
 * @param dateString YYYY-MM-DD format
 * @returns true if date is before today
 */
export function isPast(dateString: string): boolean {
  return dateString < getLocalDate();
}

/**
 * Check if a date string is in the future (after today)
 * @param dateString YYYY-MM-DD format
 * @returns true if date is after today
 */
export function isFuture(dateString: string): boolean {
  return dateString > getLocalDate();
}

/**
 * Get relative time string from ISO timestamp (e.g., "2h ago", "1d ago")
 * @param isoString ISO 8601 timestamp
 * @returns Relative time string (e.g., "Just now", "5m ago", "2h ago")
 */
export function getTimeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return seconds < 30 ? "Just now" : `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks}w ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months}mo ago`;
  }

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}
