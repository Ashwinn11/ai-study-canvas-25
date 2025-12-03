/**
 * Supabase client with automatic timeout and retry
 * Uses Supabase's built-in global.fetch configuration for clean timeout support
 */

import { createBrowserClient } from "@supabase/ssr";
import { fetchWithTimeout } from './timeoutUtils';

import { logger } from "@/utils/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  logger.warn(
    "Supabase environment variables are missing; check .env configuration.",
  );
}

// Create Supabase client with custom fetch that includes timeout and retry logic
export const supabase = createBrowserClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      "X-Client-Info": "masterly-web",
    },
    // Use custom fetch with 15s timeout and automatic retry
    // This applies to ALL Supabase operations: auth, database, storage, functions
    fetch: (url, options) => fetchWithTimeout(url, options, 15000),
  },
  db: {
    schema: "public",
  },
});

// Re-export TimeoutError for error handling
export { TimeoutError } from "./timeoutUtils";
