import { useResponsiveDimensions } from "@/utils/responsiveUtils";
import { colors } from "@/theme";

/**
 * usePillarboxConstraints
 *
 * Provides pillarboxing constraints for modals and overlays that render at the root level.
 * This ensures they respect the same maxWidth constraints as ResponsiveLayout.
 *
 * Returns:
 * - maxWidth: Maximum width for content (undefined if no constraint)
 * - backgroundColor: Background color for pillarbox bars
 * - isConstrained: Whether pillarboxing is active
 */
export const usePillarboxConstraints = (
  customMaxWidth?: number,
  customBackgroundColor?: string,
) => {
  const { width, height } = useResponsiveDimensions();

  // Same logic as ResponsiveLayout: only apply constraint on landscape/wide screens
  // Default maxWidth: 820 (same as App.tsx ResponsiveLayout)
  const defaultMaxWidth = width > height ? 820 : undefined;
  const maxWidth = customMaxWidth ?? defaultMaxWidth;
  const backgroundColor = customBackgroundColor ?? colors.surfaceVariant;
  const isConstrained = maxWidth !== undefined && width > maxWidth;

  return {
    maxWidth,
    backgroundColor,
    isConstrained,
  };
};
