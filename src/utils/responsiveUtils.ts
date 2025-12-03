import { useMemo } from "react";

import { logger } from "@/utils/logger";
/**
 * CONTINUOUS SCALING FORMULA (not discrete breakpoints)
 * Reference device: iPhone 14 Pro Max (430pt logical width)
 * Formula: width / 430, clamped between 0.75 and 1.8
 *
 * Results:
 * - iPhone SE (375): 0.87x
 * - iPhone 16 (393): 0.91x
 * - iPhone 16 Pro Max (440): 1.02x
 * - iPad Mini (744): 1.73x
 * - iPad Pro 13" (1032): 1.8x (capped)
 */
export const REFERENCE_WIDTH = 430;
export const MIN_SCALE_FACTOR = 0.75;
export const MAX_SCALE_FACTOR = 1.8;

/** Device layout categories (for UI structure decisions, not scaling) */
export type DeviceCategory = "phone" | "tablet-small" | "tablet-large";

/** Device size breakpoints (DEPRECATED - used by legacy responsive utilities) */
type DeviceSize = "xs" | "sm" | "md";

/**
 * Get device category based on width
 * Used for decisions like: 1 column vs 2 columns vs 3 columns
 */
export const getDeviceCategory = (width: number): DeviceCategory => {
  if (width < 600) return "phone";
  if (width < 900) return "tablet-small";
  return "tablet-large";
};

/**
 * Responsive utilities hook with continuous scaling
 * Provides device-aware dimensions and scaling utilities
 */
export const useResponsiveDimensions = () => {
  const { width, height } = useWindowDimensions();
  const fontScale = PixelRatio.getFontScale();

  const deviceInfo = useMemo(() => {
    // Orientation detection
    const isLandscape = width > height;
    const orientation = isLandscape ? "landscape" : "portrait";

    // CONTINUOUS SCALING: width / reference_width, clamped
    const rawScale = width / REFERENCE_WIDTH;
    const scale = Math.max(
      MIN_SCALE_FACTOR,
      Math.min(rawScale, MAX_SCALE_FACTOR),
    );

    // Device category for layout decisions (1col vs 2col vs 3col)
    const deviceCategory = getDeviceCategory(width);

    // Core scaling utilities
    const scaleSize = (size: number): number => Math.round(size * scale);
    const scaleFontSize = (size: number): number =>
      Math.round(size * scale * fontScale);
    const scaleSpacing = (size: number): number => Math.round(size * scale);

    /**
     * CAPPED SCALING FOR UI COMPONENTS (buttons, icons, radius, etc.)
     *
     * PROBLEM: Full aggressive scaling (0.75x-1.8x) makes buttons:
     *   - iPad Mini: 56px × 1.73 = 97px (OVERSIZED, breaks layout)
     *   - iPhone SE: 56px × 0.87 = 49px (CRAMPED, barely above 44px minimum)
     *
     * SOLUTION: Use capped scaling (0.95x-1.1x) for UI components
     *   - iPhone SE: 56px × 0.95 = 53px (good, still above 44px minimum)
     *   - iPad Mini: 56px × 1.1 = 62px (reasonable, not oversized)
     *
     * This preserves visual hierarchy and touch target proportions across all devices
     * while still being responsive to screen size.
     */
    const scaleUI = (size: number): number => {
      const cappedScale = Math.max(0.95, Math.min(scale, 1.1));
      return Math.round(size * cappedScale);
    };

    // Responsive dimensions with bounds
    const getResponsiveSize = (
      baseSize: number,
      minSize?: number,
      maxSize?: number,
    ): number => {
      const scaled = scaleSize(baseSize);
      if (minSize && scaled < minSize) return minSize;
      if (maxSize && scaled > maxSize) return maxSize;
      return scaled;
    };

    // Percentage-based width
    const getResponsiveWidth = (
      percentage: number,
      minWidth?: number,
      maxWidth?: number,
    ): number => {
      const calculated = width * percentage;
      if (minWidth && calculated < minWidth) return minWidth;
      if (maxWidth && calculated > maxWidth) return maxWidth;
      return calculated;
    };

    // Percentage-based height
    const getResponsiveHeight = (
      percentage: number,
      minHeight?: number,
      maxHeight?: number,
    ): number => {
      const calculated = height * percentage;
      if (minHeight && calculated < minHeight) return minHeight;
      if (maxHeight && calculated > maxHeight) return maxHeight;
      return calculated;
    };

    // Safe area aware height (subtract notch/home indicator)
    const getSafeAreaHeight = (
      topInset: number,
      bottomInset: number,
    ): number => {
      return height - topInset - bottomInset;
    };

    return {
      // Raw dimensions
      width,
      height,

      // Orientation
      isLandscape,
      orientation,

      // Scaling factors
      scale,
      fontScale,

      // Device categorization
      deviceCategory,

      // Core utilities
      scaleSize,
      scaleFontSize,
      scaleUI,

      // Advanced utilities
      getResponsiveSize,
      getResponsiveWidth,
      getResponsiveHeight,
      getSafeAreaHeight,
    };
  }, [width, height, fontScale]);

  return deviceInfo;
};

/**
 * DEPRECATED: Use continuous scaling instead
 * This was used with discrete breakpoints (xs/sm/md)
 * Now we use continuous scale: width / 430
 */
export const getResponsiveValue = <T>(
  values: Partial<Record<"xs" | "sm" | "md", T>>,
  deviceSize: "xs" | "sm" | "md",
  fallback: T,
): T => {
  logger.warn(
    "[DEPRECATED] getResponsiveValue - use continuous scaling (scaleSize) instead",
  );
  return values[deviceSize] ?? fallback;
};

/**
 * Responsive spacing utilities
 */
export const responsiveSpacing = {
  // Get spacing value based on device size
  getSpacing: (deviceSize: DeviceSize, baseSpacing: number) => {
    const multipliers = { xs: 0.7, sm: 0.85, md: 1.0 };
    return baseSpacing * multipliers[deviceSize];
  },

  // Get responsive padding for containers
  getContainerPadding: (deviceSize: DeviceSize) => {
    const padding = { xs: 12, sm: 16, md: 20 };
    return padding[deviceSize];
  },

  // Get responsive gap for grids
  getGridGap: (deviceSize: DeviceSize) => {
    const gap = { xs: 8, sm: 12, md: 16 };
    return gap[deviceSize];
  },
};

/**
 * Responsive typography utilities
 */
export const responsiveTypography = {
  // Scale font sizes based on device
  scaleFontSize: (baseSize: number, deviceSize: DeviceSize) => {
    const scalers = { xs: 0.9, sm: 0.95, md: 1.0 };
    return baseSize * scalers[deviceSize];
  },

  // Get responsive line height
  getLineHeight: (fontSize: number) => {
    return fontSize * 1.4; // Standard line height ratio
  },

  // Responsive font sizes for common text elements
  fontSizes: {
    display: { xs: 28, sm: 32, md: 36 },
    headline: { xs: 22, sm: 24, md: 26 },
    title: { xs: 18, sm: 20, md: 22 },
    body: { xs: 14, sm: 15, md: 16 },
    caption: { xs: 11, sm: 12, md: 13 },
  },
};

/**
 * Responsive touch target utilities
 * IMPORTANT: Touch targets should NEVER scale with device width
 * They are based on human ergonomics (finger size), not screen size
 * WCAG 2.2 AA: Minimum 44pt absolute (not scaled)
 * iOS HIG: 44pt minimum across all devices
 */
export const responsiveTouchTargets = {
  // Minimum touch target size (44px per iOS HIG & WCAG 2.2 AA)
  // This is FIXED across all devices - user's finger doesn't scale with screen size
  minimum: 44,

  // Comfortable touch target size (larger for easier tapping)
  comfortable: 56,

  // Get responsive touch target size
  // Returns fixed values - touch targets should NOT scale with device
  getTouchTarget: (deviceSize: DeviceSize, baseSize?: number) => {
    // Ignore baseSize and deviceSize parameters
    // Touch targets are always fixed per WCAG 2.2 and iOS HIG
    // Only scale if user has enabled accessibility touch size setting in OS
    return 44; // Fixed minimum across all devices
  },
};

/**
 * Responsive card and component utilities
 */
export const responsiveComponents = {
  // Get responsive card dimensions
  getCardDimensions: (deviceSize: DeviceSize, screenWidth: number) => {
    const padding = responsiveSpacing.getContainerPadding(deviceSize) * 2;
    const availableWidth = screenWidth - padding;

    if (deviceSize === "xs") {
      return { width: availableWidth, height: 280 };
    } else if (deviceSize === "sm") {
      return { width: availableWidth, height: 320 };
    } else {
      return { width: Math.min(availableWidth, 400), height: 350 };
    }
  },

  // Get responsive button dimensions
  getButtonDimensions: (
    deviceSize: DeviceSize,
    type: "small" | "medium" | "large" = "medium",
  ) => {
    const baseSizes = {
      small: { height: 36, padding: 12 },
      medium: { height: 44, padding: 16 },
      large: { height: 52, padding: 20 },
    };

    const scale = deviceSize === "xs" ? 0.9 : deviceSize === "sm" ? 0.95 : 1.0;
    const base = baseSizes[type];

    return {
      height: base.height * scale,
      paddingHorizontal: base.padding * scale,
      minHeight: Math.max(base.height * scale, 44), // Ensure minimum touch target
    };
  },
};

/**
 * Responsive shadow offset utilities
 */
export const getResponsiveShadow = (deviceSize: DeviceSize) => ({
  small: { width: 0, height: deviceSize === "xs" ? 1 : 2 },
  medium: { width: 0, height: deviceSize === "xs" ? 2 : 4 },
  large: { width: 0, height: deviceSize === "xs" ? 4 : 8 },
  xlarge: { width: 0, height: deviceSize === "xs" ? 6 : 12 },
});

/**
 * Safe area aware positioning helper
 */
export const getSafePosition = (
  baseOffset: number,
  inset: number,
  deviceSize: DeviceSize,
) => {
  const scale = deviceSize === "xs" ? 0.85 : deviceSize === "sm" ? 0.92 : 1.0;
  return inset + baseOffset * scale;
};

/**
 * Adaptive spacing utility for tablets
 * BEST PRACTICE: Spacing should scale differently on phones vs tablets
 *
 * Phones (< 600pt width):
 *   - Scale proportionally with device size (0.87x on SE, 1.0x on iPhone 16)
 *   - Maintains visual density and consistency
 *
 * Tablets (≥ 600pt width):
 *   - Cap spacing growth at 1.3x instead of full device scale
 *   - Prevents excessive gaps between components on large screens
 *   - iPad Mini (744pt, 1.73x scale) gets 1.3x spacing instead of 1.73x
 *   - iPad Pro 13" (1032pt, 1.8x scale) gets 1.3x spacing instead of 1.8x
 *
 * Example:
 *   - Base spacing (24px) on iPhone 16: 24 × 1.0 = 24px
 *   - Base spacing (24px) on iPhone SE: 24 × 0.87 = 21px
 *   - Base spacing (24px) on iPad Mini: 24 × 1.3 = 31px (not 24 × 1.73 = 42px)
 *   - Base spacing (24px) on iPad Pro 13": 24 × 1.3 = 31px (not 24 × 1.8 = 43px)
 */
export const getAdaptiveSpacing = (
  baseSpacing: number,
  scale: number,
  deviceCategory: DeviceCategory,
): number => {
  // On tablets, limit spacing growth to prevent excessive gaps
  if (deviceCategory === "tablet-small" || deviceCategory === "tablet-large") {
    const cappedScale = Math.min(scale, 1.3);
    return Math.round(baseSpacing * cappedScale);
  }
  // On phones, use normal scaling (0.87x on SE, 1.0x on iPhone 16)
  return Math.round(baseSpacing * scale);
};

export default useResponsiveDimensions;
