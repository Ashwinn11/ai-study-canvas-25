import { useRef, useState } from "react";

// Web environment - use CSS transitions instead of react-native-reanimated

import { logger } from "@/utils/logger";

/**
 * Animation utility functions for web environment
 * Using CSS transitions and transforms instead of react-native-reanimated
 */

// Web-style spring configuration for different interaction types
export const SPRING_CONFIGS = {
  // Gentle spring for UI feedback
  gentle: {
    duration: 300,
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
  // Bouncy spring for delightful interactions
  bouncy: {
    duration: 600,
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  // Quick spring for responsive feedback
  quick: {
    duration: 200,
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
  // Stiff spring for precise movements
  stiff: {
    duration: 400,
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
} as const;

// Timing configurations for different animation types
export const TIMING_CONFIGS = {
  // Fast fade for quick transitions
  fadeFast: { duration: 150 },
  // Standard fade for normal transitions
  fadeNormal: { duration: 250 },
  // Slow fade for dramatic transitions
  fadeSlow: { duration: 400 },
  // Quick scale for button feedback
  scaleQuick: { duration: 100 },
  // Standard scale for card interactions
  scaleNormal: { duration: 200 },
  // Slide animations for navigation
  slideQuick: { duration: 200 },
  slideNormal: { duration: 300 },
  slideSlow: { duration: 400 },
} as const;

// Web animation interface
export interface WebAnimationValue {
  current: number;
  setValue: (value: number) => void;
  withSpring: (toValue: number, config?: any) => Promise<void>;
  withTiming: (toValue: number, config?: any) => Promise<void>;
}

// Create animated value for web
export const useAnimatedValue = (initialValue: number = 0): WebAnimationValue => {
  const ref = useRef<number>(initialValue);
  
  const setValue = (value: number) => {
    ref.current = value;
  };

  const withSpring = async (toValue: number, config = SPRING_CONFIGS.gentle) => {
    return new Promise<void>((resolve) => {
      // In a real implementation, this would use Web Animations API or CSS transitions
      ref.current = toValue;
      setTimeout(resolve, config.duration);
    });
  };

  const withTiming = async (toValue: number, config = TIMING_CONFIGS.fadeNormal) => {
    return new Promise<void>((resolve) => {
      ref.current = toValue;
      setTimeout(resolve, config.duration);
    });
  };

  return {
    current: ref.current,
    setValue,
    withSpring,
    withTiming,
  };
};

// Create animated style for web
export const useAnimatedStyle = (
  updater: (value: any) => any,
  dependencies?: React.DependencyList
) => {
  // Stub implementation - in real usage, this would integrate with CSS-in-JS
  return {};
};

// Interpolate values for web
export const interpolate = (
  value: number,
  inputRange: number[],
  outputRange: number[],
  options?: { extrapolateLeft?: 'extend' | 'clamp' | 'identity'; extrapolateRight?: 'extend' | 'clamp' | 'identity' }
) => {
  const [inputMin, inputMax] = inputRange;
  const [outputMin, outputMax] = outputRange;
  
  if (value <= inputMin) return outputMin;
  if (value >= inputMax) return outputMax;
  
  const ratio = (value - inputMin) / (inputMax - inputMin);
  return outputMin + ratio * (outputMax - outputMin);
};

// Animation presets for common interactions
export const ANIMATION_PRESETS = {
  // Button press animation
  buttonPress: {
    scale: 0.95,
    duration: 100,
    easing: 'ease-out',
  },
  // Card hover animation
  cardHover: {
    scale: 1.02,
    duration: 200,
    easing: 'ease-out',
  },
  // Modal appearance
  modalAppear: {
    scale: 0.9,
    opacity: 0,
    duration: 300,
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
  // Modal disappearance
  modalDisappear: {
    scale: 1,
    opacity: 1,
    duration: 250,
    easing: 'ease-in',
  },
  // List item appearance
  listItemAppear: {
    translateY: 20,
    opacity: 0,
    duration: 300,
    easing: 'ease-out',
  },
  // Tab switch animation
  tabSwitch: {
    duration: 250,
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
} as const;

// Performance monitoring for animations
export class AnimationPerformanceMonitor {
  private static instance: AnimationPerformanceMonitor;
  private frameDrops: number = 0;
  private totalFrames: number = 0;
  private isMonitoring: boolean = false;

  static getInstance(): AnimationPerformanceMonitor {
    if (!AnimationPerformanceMonitor.instance) {
      AnimationPerformanceMonitor.instance = new AnimationPerformanceMonitor();
    }
    return AnimationPerformanceMonitor.instance;
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.frameDrops = 0;
    this.totalFrames = 0;

    // In a real implementation, this would use requestAnimationFrame to monitor performance
    logger.info('Animation performance monitoring started');
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    const dropRate = this.totalFrames > 0 ? (this.frameDrops / this.totalFrames) * 100 : 0;
    
    logger.info(`Animation performance: ${dropRate.toFixed(2)}% frame drop rate`);
    
    if (dropRate > 10) {
      logger.warn('High frame drop rate detected. Consider simplifying animations.');
    }
  }

  recordFrameDrop(): void {
    if (this.isMonitoring) {
      this.frameDrops++;
    }
  }

  recordFrame(): void {
    if (this.isMonitoring) {
      this.totalFrames++;
    }
  }
}

// Utility function to create CSS transition string
export const createCSSTransition = (
  properties: string[],
  duration: number,
  easing: string = 'ease-out'
): string => {
  return properties
    .map(prop => `${prop} ${duration}ms ${easing}`)
    .join(', ');
};

// Utility function to create CSS transform string
export const createCSSTransform = (
  transforms: Record<string, number>
): string => {
  return Object.entries(transforms)
    .map(([key, value]) => {
      switch (key) {
        case 'translateX':
          return `translateX(${value}px)`;
        case 'translateY':
          return `translateY(${value}px)`;
        case 'scale':
          return `scale(${value})`;
        case 'rotate':
          return `rotate(${value}deg)`;
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join(' ');
};

// Hook for managing animation states
export const useAnimationState = (initialState: string = 'idle') => {
  const [animationState, setAnimationState] = useState(initialState);
  const [isAnimating, setIsAnimating] = useState(false);

  const startAnimation = (state: string) => {
    setAnimationState(state);
    setIsAnimating(true);
  };

  const endAnimation = (state: string = 'idle') => {
    setAnimationState(state);
    setIsAnimating(false);
  };

  return {
    animationState,
    isAnimating,
    startAnimation,
    endAnimation,
  };
};