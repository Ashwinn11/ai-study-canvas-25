/**
 * Google Cloud Authentication for Edge Functions
 * 
 * Generates access tokens for Google Cloud APIs using a service account.
 * No SDK required - uses JWT signing directly.
 */

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

interface AccessTokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

// Cache for the access token
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get Google Cloud access token for API calls
 * Tokens are cached and reused until they expire
 */
export async function getGoogleAccessToken(
    scopes: string[] = ['https://www.googleapis.com/auth/cloud-platform']
): Promise<string> {
    // Check if we have a valid cached token
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
        return cachedToken.token;
    }

    // Get service account credentials from environment
    const credentialsJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!credentialsJson) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    }

    let credentials: ServiceAccountCredentials;
    try {
        credentials = JSON.parse(credentialsJson);
    } catch {
        throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON format');
    }

    // Create JWT
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // 1 hour

    const header = {
        alg: 'RS256',
        typ: 'JWT',
        kid: credentials.private_key_id,
    };

    const payload = {
        iss: credentials.client_email,
        sub: credentials.client_email,
        aud: credentials.token_uri,
        iat: now,
        exp: exp,
        scope: scopes.join(' '),
    };

    // Encode header and payload
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    // Sign the token
    const signature = await signWithRSA(unsignedToken, credentials.private_key);
    const jwt = `${unsignedToken}.${signature}`;

    // Exchange JWT for access token
    const response = await fetch(credentials.token_uri, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get access token: ${response.status} ${error}`);
    }

    const tokenData: AccessTokenResponse = await response.json();

    // Cache the token
    cachedToken = {
        token: tokenData.access_token,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
    };

    return tokenData.access_token;
}

/**
 * Get authorization headers for Google Cloud API calls
 */
export async function getGoogleAuthHeaders(): Promise<Record<string, string>> {
    const token = await getGoogleAccessToken();
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

/**
 * Base64 URL encode a string
 */
function base64UrlEncode(str: string): string {
    const base64 = btoa(str);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Base64 URL encode bytes
 */
function base64UrlEncodeBytes(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Sign data with RSA-SHA256 using the private key
 */
async function signWithRSA(data: string, privateKeyPem: string): Promise<string> {
    // Import the private key
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

    // Decode base64 to get the raw key bytes
    const binaryKey = atob(pemContents);
    const keyBytes = new Uint8Array(binaryKey.length);
    for (let i = 0; i < binaryKey.length; i++) {
        keyBytes[i] = binaryKey.charCodeAt(i);
    }

    // Import the key
    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        keyBytes,
        {
            name: 'RSASSA-PKCS1-v1_5',
            hash: 'SHA-256',
        },
        false,
        ['sign']
    );

    // Sign the data
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, dataBytes);

    // Encode signature as base64url
    return base64UrlEncodeBytes(new Uint8Array(signature));
}

/**
 * Get Google Cloud project ID from credentials
 */
export function getProjectId(): string {
    const credentialsJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!credentialsJson) {
        // Fallback to explicit environment variable
        const projectId = Deno.env.get('GCP_PROJECT_ID');
        if (!projectId) {
            throw new Error('GCP_PROJECT_ID or GOOGLE_SERVICE_ACCOUNT_JSON not configured');
        }
        return projectId;
    }

    try {
        const credentials: ServiceAccountCredentials = JSON.parse(credentialsJson);
        return credentials.project_id;
    } catch {
        throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON format');
    }
}
