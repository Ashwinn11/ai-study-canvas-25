
/**
 * Orientation utilities for responsive design
 */

export interface OrientationInfo {
  isLandscape: boolean;
  isPortrait: boolean;
  aspectRatio: number;
  screenWidth: number;
  screenHeight: number;
}

/**
 * Get current orientation information
 */
export const getOrientation = (): OrientationInfo => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const isLandscape = screenWidth > screenHeight;
  const isPortrait = !isLandscape;
  const aspectRatio = screenWidth / screenHeight;

  return {
    isLandscape,
    isPortrait,
    aspectRatio,
    screenWidth,
    screenHeight,
  };
};

/**
 * Get gradient configuration based on orientation
 */
export const getGradientConfig = (isLandscape: boolean) => {
  return {
    start: { x: 0, y: 0 },
    end: isLandscape ? { x: 1, y: 1 } : { x: 0, y: 1 },
  };
};

/**
 * Get gradient colors optimized for orientation
 */
export const getGradientColors = (
  baseColor: string,
  rgba: (color: string, alpha: number) => string,
  isLandscape: boolean,
) => {
  return isLandscape
    ? [rgba(baseColor, 0.75), rgba(baseColor, 0.9), baseColor]
    : [rgba(baseColor, 0.8), baseColor];
};

/**
 * Check if device is a tablet in landscape (wider aspect ratio)
 */
export const isTabletLandscape = (aspectRatio: number) => {
  return aspectRatio > 1.5;
};
