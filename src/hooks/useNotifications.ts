import { useState, useCallback } from 'react';
import type {
  NotificationPreferences,
  NotificationHistory,
  NotificationPermissionStatus,
  ScheduledNotification,
} from '@/types/notifications';

interface UseNotificationsState {
  permissionStatus: NotificationPermissionStatus | null;
  preferences: NotificationPreferences | null;
  history: NotificationHistory[];
  scheduledNotifications: ScheduledNotification[];
  isLoading: boolean;
  error: Error | null;
}

interface UseNotificationsActions {
  requestPermission: () => Promise<boolean>;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
  scheduleNotification: (notification: ScheduledNotification) => Promise<string>;
  cancelNotification: (id: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(): UseNotificationsState & UseNotificationsActions {
  const [state] = useState<UseNotificationsState>({
    permissionStatus: { status: 'denied' },
    preferences: null,
    history: [],
    scheduledNotifications: [],
    isLoading: false,
    error: null,
  });

  const requestPermission = useCallback(async (): Promise<boolean> => {
    // Web notifications not needed
    return false;
  }, []);

  const updatePreferences = useCallback(async (preferences: Partial<NotificationPreferences>) => {
    // Stub - no-op for web
  }, []);

  const scheduleNotification = useCallback(async (notification: ScheduledNotification): Promise<string> => {
    // Stub - return fake ID
    return 'web-stub-id';
  }, []);

  const cancelNotification = useCallback(async (id: string) => {
    // Stub - no-op for web
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    // Stub - no-op for web
  }, []);

  const clearHistory = useCallback(async () => {
    // Stub - no-op for web
  }, []);

  const refresh = useCallback(async () => {
    // Stub - no-op for web
  }, []);

  return {
    ...state,
    requestPermission,
    updatePreferences,
    scheduleNotification,
    cancelNotification,
    markAsRead,
    clearHistory,
    refresh,
  };
}