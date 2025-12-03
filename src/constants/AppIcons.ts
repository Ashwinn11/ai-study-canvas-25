import { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";
import { iconSize } from "@/theme";

export type IoniconsName = ComponentProps<typeof Ionicons>["name"];

// Centralized icon mapping system to replace all emojis with Ionicons
export const AppIcons = {
  // Content Types
  contentTypes: {
    pdf: "document-text-outline" as IoniconsName,
    image: "image-outline" as IoniconsName,
    audio: "musical-notes-outline" as IoniconsName,
    text: "create-outline" as IoniconsName,
    url: "link-outline" as IoniconsName,
  },

  // Learning & Study
  learning: {
    brain: "bulb-outline" as IoniconsName,
    cards: "layers-outline" as IoniconsName,
    quiz: "help-circle-outline" as IoniconsName,
    study: "library-outline" as IoniconsName,
    practice: "fitness-outline" as IoniconsName,
    teachback: "school-outline" as IoniconsName,
    meditation: "leaf-outline" as IoniconsName,
  },

  // Feedback States
  feedback: {
    success: "checkmark-circle" as IoniconsName,
    error: "close-circle" as IoniconsName,
    celebration: "star" as IoniconsName,
    thinking: "refresh-outline" as IoniconsName,
    correct: "checkmark-circle-outline" as IoniconsName,
    incorrect: "close-circle-outline" as IoniconsName,
  },

  // Achievements & Progress
  achievements: {
    streak: "flame" as IoniconsName,
    fire: "flame-outline" as IoniconsName,
    target: "locate-outline" as IoniconsName,
    trophy: "trophy-outline" as IoniconsName,
    medal: "medal-outline" as IoniconsName,
    star: "star-outline" as IoniconsName,
  },

  // Stats & Metrics
  stats: {
    accuracy: "checkmark-circle-outline" as IoniconsName,
    time: "time-outline" as IoniconsName,
    timer: "stopwatch-outline" as IoniconsName,
    progress: "trending-up-outline" as IoniconsName,
    mastery: "ribbon-outline" as IoniconsName,
  },

  // UI Hints & Tips
  hints: {
    lightbulb: "bulb-outline" as IoniconsName,
    tip: "information-circle-outline" as IoniconsName,
    warning: "warning-outline" as IoniconsName,
    info: "information-outline" as IoniconsName,
  },

  // Console/Logging (for development)
  console: {
    error: "alert-circle-outline" as IoniconsName,
    warning: "warning-outline" as IoniconsName,
    success: "checkmark-circle-outline" as IoniconsName,
    info: "information-circle-outline" as IoniconsName,
  },
} as const;

// Helper function to get icon with default size and color
export const getAppIcon = (
  category: keyof typeof AppIcons,
  iconName: string,
  size: number = 24,
  color?: string,
) => {
  const iconCategory = AppIcons[category] as Record<string, IoniconsName>;
  return {
    name: iconCategory[iconName] || ("help-outline" as IoniconsName),
    size,
    color,
  };
};

// Default icon sizes for consistency
export const IconSizes = {
  xs: iconSize.xs,
  sm: iconSize.sm,
  md: iconSize.md,
  lg: iconSize.lg,
  xl: iconSize.xl,
  xxl: iconSize.xl + 4, // 28 + 4 = 32 for extra large
} as const;
