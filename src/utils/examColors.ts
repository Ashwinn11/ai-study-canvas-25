import { colors } from '@/theme';

// Four colors from design.json
const EXAM_COLORS = [
  colors.primary,    // #ff7664 - red/peach
  colors.info,       // #5398ff - blue
  colors.success,    // #6cc88b - green
  colors.secondary,  // #e093ff - purple
] as const;

// Cache to store exam ID -> color index mappings
const colorCache = new Map<string, number>();
let nextColorIndex = 0;

/**
 * Get a consistent color for an exam based on its ID
 * Distributes colors sequentially for better visual variety
 */
export const getExamColor = (examId: string): string => {
  // Check cache first
  if (colorCache.has(examId)) {
    return EXAM_COLORS[colorCache.get(examId)!];
  }

  // Assign next color in sequence
  const colorIndex = nextColorIndex % EXAM_COLORS.length;
  colorCache.set(examId, colorIndex);
  nextColorIndex++;

  return EXAM_COLORS[colorIndex];
};
