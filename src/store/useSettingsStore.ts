import { create } from 'zustand';

interface SettingsState {
  timezone?: string;
  dailyGoal?: number;
  notificationsEnabled: boolean;
  analyticsOptOut: boolean;
  setTimezone: (tz: string) => void;
  setDailyGoal: (goal?: number) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setAnalyticsOptOut: (optOut: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  timezone: undefined,
  dailyGoal: undefined,
  notificationsEnabled: false,
  analyticsOptOut: false,
  setTimezone: (tz) => set({ timezone: tz }),
  setDailyGoal: (goal) => set({ dailyGoal: goal }),
  setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
  setAnalyticsOptOut: (optOut) => set({ analyticsOptOut: optOut })
}));
