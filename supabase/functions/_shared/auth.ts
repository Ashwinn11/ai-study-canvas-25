/**
 * Authentication Utilities
 * JWT validation and user extraction for Edge Functions
 */

import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2';
import { errorResponse } from './cors.ts';

export interface AuthResult {
    user: User;
    supabase: SupabaseClient;
}

/**
 * Validate JWT token and return user + authenticated Supabase client
 * @param req - The incoming request
 * @returns AuthResult or Response (error)
 */
export async function validateAuth(req: Request): Promise<AuthResult | Response> {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
        return errorResponse('Missing authorization header', 401);
    }

    if (!authHeader.startsWith('Bearer ')) {
        return errorResponse('Invalid authorization header format', 401);
    }

    const token = authHeader.slice(7).trim();

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('[Auth] Missing SUPABASE_URL or SUPABASE_ANON_KEY');
        return errorResponse('Authentication service not configured', 503);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: { Authorization: authHeader },
        },
    });

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.warn('[Auth] JWT validation failed:', error?.message || 'Invalid token');
            return errorResponse('Invalid or expired token', 401);
        }

        return { user, supabase };
    } catch (err) {
        console.error('[Auth] JWT validation error:', err);
        return errorResponse('Authentication failed', 401);
    }
}

/**
 * Check if the result is an error Response
 */
export function isAuthError(result: AuthResult | Response): result is Response {
    return result instanceof Response;
}

/**
 * Get admin Supabase client with service role key
 */
export function getAdminClient(): SupabaseClient {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

/**
 * Validate admin access (basic check using x-admin-key header)
 */
export function validateAdminAccess(req: Request): Response | null {
    const adminKey = req.headers.get('x-admin-key');
    const expectedKey = Deno.env.get('ADMIN_API_KEY');

    if (!expectedKey) {
        return errorResponse('Admin access not configured', 503);
    }

    if (!adminKey || adminKey !== expectedKey) {
        return errorResponse('Unauthorized - admin access required', 401);
    }

    return null; // Access granted
}

/**
 * Validate cleanup secret
 */
export function validateCleanupSecret(req: Request): Response | null {
    const secret = req.headers.get('x-cleanup-secret');
    const expectedSecret = Deno.env.get('CLEANUP_SECRET');

    if (!expectedSecret) {
        return errorResponse('Cleanup service not configured', 503);
    }

    if (!secret || secret !== expectedSecret) {
        return errorResponse('Invalid cleanup secret', 401);
    }

    return null; // Access granted
}
