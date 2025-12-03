// Web stub for analytics - React Native analytics removed
// Use a web analytics solution like Google Analytics for production

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  userId?: string;
}

const OPT_OUT_STORAGE_KEY = '@masterly:analyticsOptOut';
let optedOut = false;

export const analyticsService = {
  init: async () => {
    // Web stub - no initialization needed
  },

  trackEvent: (event: string, properties?: Record<string, any>) => {
    // Web stub - could integrate with Google Analytics or Mixpanel here
    console.log('[Analytics]', event, properties);
  },

  trackScreenView: (screenName: string, properties?: Record<string, any>) => {
    // Web stub
    console.log('[ScreenView]', screenName, properties);
  },

  setUserId: (userId: string) => {
    // Web stub
    console.log('[SetUserId]', userId);
  },

  setOptOut: (value: boolean) => {
    optedOut = value;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(OPT_OUT_STORAGE_KEY, JSON.stringify(value));
    }
  },

  getOptOut: () => optedOut,

  recordSessionStart: () => {
    // Web stub
    console.log('[SessionStart]');
  },

  recordSessionEnd: () => {
    // Web stub
    console.log('[SessionEnd]');
  },
};

// Alias for backward compatibility
export const analytics = analyticsService;
