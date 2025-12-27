/**
 * Cleanup Edge Function
 * Removes old temporary files from GCS bucket
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cleanup-secret',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Configuration
const GCS_BUCKET = Deno.env.get('GCS_BUCKET');
const RETENTION_DAYS = parseInt(Deno.env.get('RETENTION_DAYS') || '7', 10);

const PREFIXES_TO_CLEAN = [
    'input/',
    'pdf-input/',
    'pdf-output/',
    'audio-input/',
    'audio-extracted/',
    'vision-output/',
];

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    try {
        // Validate cleanup secret
        const secret = req.headers.get('x-cleanup-secret');
        const expectedSecret = Deno.env.get('CLEANUP_SECRET');

        if (!expectedSecret) {
            return new Response(
                JSON.stringify({ error: 'Cleanup service not configured' }),
                { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (!secret || secret !== expectedSecret) {
            return new Response(
                JSON.stringify({ error: 'Invalid cleanup secret' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (!GCS_BUCKET) {
            return new Response(
                JSON.stringify({ error: 'GCS_BUCKET not configured' }),
                { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`[Cleanup] Starting GCS cleanup for bucket: ${GCS_BUCKET}`);
        console.log(`[Cleanup] Retention period: ${RETENTION_DAYS} days`);

        const accessToken = await getGoogleAccessToken();
        const results: Record<string, { deletedCount: number; totalSize: number; error?: string }> = {};

        for (const prefix of PREFIXES_TO_CLEAN) {
            results[prefix] = await cleanupOldFiles(accessToken, prefix);
        }

        const totalDeleted = Object.values(results).reduce((sum, r) => sum + r.deletedCount, 0);
        const totalFreed = Object.values(results).reduce((sum, r) => sum + r.totalSize, 0);

        console.log(`[Cleanup] Total files deleted: ${totalDeleted}`);
        console.log(`[Cleanup] Total space freed: ${(totalFreed / 1024 / 1024).toFixed(2)} MB`);

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Cleanup completed',
                results: {
                    prefixes: results,
                    summary: {
                        totalDeleted,
                        totalFreedBytes: totalFreed,
                        totalFreedMB: (totalFreed / 1024 / 1024).toFixed(2),
                    },
                },
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('[Cleanup] Error:', error);
        return new Response(
            JSON.stringify({ error: 'Cleanup failed', details: String(error) }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

// ============================================================================
// Google Cloud Authentication
// ============================================================================

interface ServiceAccountCredentials {
    type: string;
    project_id: string;
    private_key_id: string;
    private_key: string;
    client_email: string;
    client_id: string;
    auth_uri: string;
    token_uri: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getGoogleAccessToken(): Promise<string> {
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
        return cachedToken.token;
    }

    const credentialsJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!credentialsJson) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    }

    const credentials: ServiceAccountCredentials = JSON.parse(credentialsJson);
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600;

    const header = { alg: 'RS256', typ: 'JWT', kid: credentials.private_key_id };
    const payload = {
        iss: credentials.client_email,
        sub: credentials.client_email,
        aud: credentials.token_uri,
        iat: now,
        exp: exp,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    const signature = await signWithRSA(unsignedToken, credentials.private_key);
    const jwt = `${unsignedToken}.${signature}`;

    const response = await fetch(credentials.token_uri, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get access token: ${response.status} ${error}`);
    }

    const tokenData = await response.json();
    cachedToken = {
        token: tokenData.access_token,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
    };

    return tokenData.access_token;
}

function base64UrlEncode(str: string): string {
    const base64 = btoa(str);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signWithRSA(data: string, privateKeyPem: string): Promise<string> {
    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';

    let pemContents = privateKeyPem;
    if (pemContents.includes(pemHeader)) {
        pemContents = pemContents
            .replace(pemHeader, '')
            .replace(pemFooter, '')
            .replace(/\\n/g, '')
            .replace(/\n/g, '')
            .replace(/\s/g, '');
    }

    const binaryKey = atob(pemContents);
    const keyBytes = new Uint8Array(binaryKey.length);
    for (let i = 0; i < binaryKey.length; i++) {
        keyBytes[i] = binaryKey.charCodeAt(i);
    }

    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        keyBytes,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, dataBytes);

    return base64UrlEncodeBytes(new Uint8Array(signature));
}

// ============================================================================
// GCS Cleanup
// ============================================================================

async function cleanupOldFiles(
    accessToken: string,
    prefix: string
): Promise<{ deletedCount: number; totalSize: number; error?: string }> {
    console.log(`[Cleanup] Scanning ${prefix} for files older than ${RETENTION_DAYS} days...`);

    try {
        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        };

        const listUrl = `https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET}/o?prefix=${encodeURIComponent(prefix)}`;
        const listResponse = await fetch(listUrl, { headers });

        if (!listResponse.ok) {
            const errorText = await listResponse.text();
            throw new Error(`Failed to list files: ${listResponse.status} ${errorText}`);
        }

        const listData = await listResponse.json();
        const files = listData.items || [];

        const cutoffDate = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);

        let deletedCount = 0;
        let totalSize = 0;

        for (const file of files) {
            const created = new Date(file.timeCreated).getTime();

            if (created < cutoffDate) {
                const size = parseInt(file.size || '0', 10);

                const deleteUrl = `https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET}/o/${encodeURIComponent(file.name)}`;
                const deleteResponse = await fetch(deleteUrl, { method: 'DELETE', headers });

                if (deleteResponse.ok || deleteResponse.status === 404) {
                    deletedCount++;
                    totalSize += size;
                    console.log(`[Cleanup] Deleted: ${file.name} (${(size / 1024 / 1024).toFixed(2)} MB)`);
                }
            }
        }

        console.log(`[Cleanup] ${prefix}: Deleted ${deletedCount} files, freed ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
        return { deletedCount, totalSize };

    } catch (error) {
        console.error(`[Cleanup] Error cleaning ${prefix}:`, error);
        return { deletedCount: 0, totalSize: 0, error: String(error) };
    }
}
