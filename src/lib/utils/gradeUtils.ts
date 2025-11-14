/**
 * Grade Utilities - Centralized 9-Grade System (A+, A, B+, B, C+, C, D+, D, F)
 * Used consistently across exam reports and completion modals
 * COPIED FROM iOS app at /tmp/masterly-ios/utils/gradeUtils.ts
 */

export const GRADE_SCALE = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'] as const;
export type GradeType = typeof GRADE_SCALE[number];

/**
 * Convert percentage score to letter grade
 * @param percentage 0-100
 * @returns Letter grade: A+, A, B+, B, C+, C, D+, D, or F
 */
export function scoreToGrade(percentage: number): GradeType {
  if (percentage >= 97) return 'A+';
  if (percentage >= 90) return 'A';
  if (percentage >= 87) return 'B+';
  if (percentage >= 80) return 'B';
  if (percentage >= 77) return 'C+';
  if (percentage >= 70) return 'C';
  if (percentage >= 67) return 'D+';
  if (percentage >= 60) return 'D';
  return 'F';
}

/**
 * Convert letter grade to numeric value for averaging
 * Used for calculating average grades across multiple exams
 * Scale: A+=9, A=8, B+=7, B=6, C+=5, C=4, D+=3, D=2, F=1
 */
export function gradeToNumber(grade: string): number {
  switch (grade?.toUpperCase()) {
    case 'A+':
      return 9;
    case 'A':
      return 8;
    case 'B+':
      return 7;
    case 'B':
      return 6;
    case 'C+':
      return 5;
    case 'C':
      return 4;
    case 'D+':
      return 3;
    case 'D':
      return 2;
    case 'F':
      return 1;
    default:
      return 0;
  }
}

/**
 * Convert numeric average back to letter grade
 * Inverse of gradeToNumber for display purposes
 */
export function numberToGrade(avg: number): GradeType {
  if (avg >= 8.5) return 'A+';
  if (avg >= 7.5) return 'A';
  if (avg >= 6.5) return 'B+';
  if (avg >= 5.5) return 'B';
  if (avg >= 4.5) return 'C+';
  if (avg >= 3.5) return 'C';
  if (avg >= 2.5) return 'D+';
  if (avg >= 1.5) return 'D';
  return 'F';
}

/**
 * Get percentage range for a letter grade
 * Useful for displaying grade information
 */
export function getGradeRange(grade: GradeType): { min: number; max: number } {
  switch (grade) {
    case 'A+':
      return { min: 97, max: 100 };
    case 'A':
      return { min: 90, max: 96 };
    case 'B+':
      return { min: 87, max: 89 };
    case 'B':
      return { min: 80, max: 86 };
    case 'C+':
      return { min: 77, max: 79 };
    case 'C':
      return { min: 70, max: 76 };
    case 'D+':
      return { min: 67, max: 69 };
    case 'D':
      return { min: 60, max: 66 };
    case 'F':
      return { min: 0, max: 59 };
  }
}

/**
 * Check if grade is an excellent grade (A+ or A)
 */
export function isExcellentGrade(grade: string): boolean {
  return grade === 'A+' || grade === 'A';
}

/**
 * Check if grade is a top achievement (A+ only)
 */
export function isTopAchievement(grade: string): boolean {
  return grade === 'A+';
}

/**
 * Get color for grade display (Tailwind classes)
 * Used in UI components to show grades with appropriate visual feedback
 */
export function getGradeColor(grade: string): string {
  switch (grade?.toUpperCase()) {
    case 'A+':
    case 'A':
      return 'text-green-400'; // Green - excellent
    case 'B+':
    case 'B':
      return 'text-blue-400'; // Blue - good
    case 'C+':
    case 'C':
      return 'text-purple-400'; // Purple - acceptable
    case 'D+':
    case 'D':
      return 'text-orange-400'; // Orange - needs improvement
    case 'F':
      return 'text-red-400'; // Red - failing
    default:
      return 'text-gray-400';
  }
}

/**
 * Get background color for grade display (Tailwind classes)
 */
export function getGradeBgColor(grade: string): string {
  switch (grade?.toUpperCase()) {
    case 'A+':
    case 'A':
      return 'bg-green-500';
    case 'B+':
    case 'B':
      return 'bg-blue-500';
    case 'C+':
    case 'C':
      return 'bg-purple-500';
    case 'D+':
    case 'D':
      return 'bg-orange-500';
    case 'F':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

/**
 * Get motivational message based on grade
 */
export function getGradeMessage(grade: string): string {
  switch (grade?.toUpperCase()) {
    case 'A+':
      return "Outstanding! You're performing at the highest level! 🌟";
    case 'A':
      return "Excellent! You're crushing it at A-level! 💪";
    case 'B+':
      return "Great job! You're doing really well! 🚀";
    case 'B':
      return "Solid performance! You're on the right track! 📈";
    case 'C+':
      return "Good work! Keep pushing forward! 📚";
    case 'C':
      return "You're making progress! Keep practicing! 💡";
    case 'D+':
    case 'D':
      return "You're building the foundation. Stay consistent! 🔨";
    case 'F':
      return "Every master was once a beginner. Try again! 🌱";
    default:
      return "Keep learning, keep growing! 🌱";
  }
}
