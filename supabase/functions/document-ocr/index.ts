/**
 * Document OCR Edge Function
 * Processes PDFs and images using Google Document AI and Vision API
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const DOCAI_LOCATION = Deno.env.get('DOCAI_LOCATION') || 'us';
const DOCAI_PROCESSOR_ID = Deno.env.get('DOCAI_PROCESSOR_ID');
const GCS_BUCKET = Deno.env.get('GCS_BUCKET');
const MAX_PAGES = 30;

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    try {
        // Validate auth
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid or expired token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { contentBase64, mimeType } = await req.json();

        if (!contentBase64 || !mimeType) {
            return new Response(
                JSON.stringify({ error: 'Missing contentBase64 or mimeType' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get Google access token
        const accessToken = await getGoogleAccessToken();

        // Try Document AI first
        try {
            const result = await processWithDocumentAI(accessToken, contentBase64, mimeType);
            if (result) {
                return new Response(
                    JSON.stringify(result),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        } catch (docAiError) {
            console.warn('[Document OCR] Document AI failed, trying Vision API:', docAiError);
        }

        // Fallback to Vision API
        try {
            const result = await processWithVisionAPI(accessToken, contentBase64, mimeType);
            return new Response(
                JSON.stringify(result),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        } catch (visionError) {
            console.error('[Document OCR] Vision API also failed:', visionError);

            const errorMessage = String(visionError);
            if (errorMessage.includes('No text') || errorMessage.includes('empty')) {
                return new Response(
                    JSON.stringify({ error: 'NO_TEXT_FOUND', message: 'No text found in document' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            throw visionError;
        }

    } catch (error) {
        console.error('[Document OCR] Error:', error);
        return new Response(
            JSON.stringify({ error: 'OCR_FAILED', details: String(error) }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

// ============================================================================
// Google Cloud Authentication
// ============================================================================

interface ServiceAccountCredentials {
    project_id: string;
    private_key_id: string;
    private_key: string;
    client_email: string;
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
        exp,
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
        throw new Error(`Failed to get access token: ${response.status}`);
    }

    const tokenData = await response.json();
    cachedToken = {
        token: tokenData.access_token,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
    };

    return tokenData.access_token;
}

function base64UrlEncode(str: string): string {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signWithRSA(data: string, privateKeyPem: string): Promise<string> {
    let pemContents = privateKeyPem
        .replace('-----BEGIN PRIVATE KEY-----', '')
        .replace('-----END PRIVATE KEY-----', '')
        .replace(/\\n/g, '')
        .replace(/\n/g, '')
        .replace(/\s/g, '');

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
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, encoder.encode(data));
    return base64UrlEncodeBytes(new Uint8Array(signature));
}

// ============================================================================
// Document AI Processing
// ============================================================================

async function processWithDocumentAI(
    accessToken: string,
    contentBase64: string,
    mimeType: string
): Promise<{ text: string; metadata: Record<string, unknown> } | null> {
    const projectId = Deno.env.get('GCP_PROJECT_ID') || 'indiehacker-480212';

    if (!DOCAI_PROCESSOR_ID) {
        throw new Error('DOCAI_PROCESSOR_ID not configured');
    }

    const url = `https://${DOCAI_LOCATION}-documentai.googleapis.com/v1/projects/${projectId}/locations/${DOCAI_LOCATION}/processors/${DOCAI_PROCESSOR_ID}:process`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            rawDocument: { content: contentBase64, mimeType },
            skipHumanReview: true,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Document AI failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const text = data.document?.text || '';
    const pages = data.document?.pages || [];

    if (!text.trim()) {
        throw new Error('Document AI returned empty text');
    }

    console.log(`[Document AI] Successfully extracted ${text.length} characters`);

    return {
        text,
        metadata: {
            language: 'en',
            isMixedLanguage: false,
            confidence: 0.9,
            source: 'document_ai',
            pageCount: pages.length,
        },
    };
}

// ============================================================================
// Vision API Processing (Fallback)
// ============================================================================

async function processWithVisionAPI(
    accessToken: string,
    contentBase64: string,
    mimeType: string
): Promise<{ text: string; metadata: Record<string, unknown> }> {
    if (mimeType === 'application/pdf') {
        // For PDFs, use async batch processing
        return await processWithVisionAPIAsync(accessToken, contentBase64);
    } else {
        // For images, use synchronous Vision API
        return await processWithVisionAPISync(accessToken, contentBase64);
    }
}

async function processWithVisionAPISync(
    accessToken: string,
    contentBase64: string
): Promise<{ text: string; metadata: Record<string, unknown> }> {
    const response = await fetch('https://vision.googleapis.com/v1/images:annotate', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            requests: [{
                image: { content: contentBase64 },
                features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            }],
        }),
    });

    if (!response.ok) {
        throw new Error(`Vision API request failed: ${response.status}`);
    }

    const data = await response.json();
    const text = data.responses?.[0]?.fullTextAnnotation?.text;

    if (!text) {
        throw new Error('No text detected by Vision API');
    }

    console.log(`[Vision API] Successfully extracted ${text.length} characters`);

    return {
        text,
        metadata: {
            language: 'en',
            isMixedLanguage: false,
            confidence: 0.9,
            source: 'vision_api',
        },
    };
}

async function processWithVisionAPIAsync(
    accessToken: string,
    contentBase64: string
): Promise<{ text: string; metadata: Record<string, unknown> }> {
    if (!GCS_BUCKET) {
        throw new Error('GCS_BUCKET not configured for PDF Vision API fallback');
    }

    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
    };

    // Upload PDF to GCS
    const id = crypto.randomUUID();
    const gcsInputPath = `pdf-input/${id}.pdf`;
    const outputPrefix = `pdf-output/${id}/`;

    const pdfBytes = Uint8Array.from(atob(contentBase64), c => c.charCodeAt(0));

    const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${GCS_BUCKET}/o?uploadType=media&name=${encodeURIComponent(gcsInputPath)}`;
    const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/pdf' },
        body: pdfBytes,
    });

    if (!uploadResponse.ok) {
        throw new Error(`Failed to upload to GCS: ${uploadResponse.status}`);
    }

    // Start async batch annotation
    const startResponse = await fetch('https://vision.googleapis.com/v1/files:asyncBatchAnnotate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            requests: [{
                inputConfig: {
                    gcsSource: { uri: `gs://${GCS_BUCKET}/${gcsInputPath}` },
                    mimeType: 'application/pdf',
                },
                features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
                outputConfig: {
                    gcsDestination: { uri: `gs://${GCS_BUCKET}/${outputPrefix}` },
                    batchSize: 20,
                },
            }],
        }),
    });

    if (!startResponse.ok) {
        throw new Error(`Vision async start failed: ${startResponse.status}`);
    }

    const opData = await startResponse.json();
    const opName = opData.name;

    // Poll for completion
    const opUrl = `https://vision.googleapis.com/v1/${opName}`;
    const startTime = Date.now();

    while (Date.now() - startTime < 10 * 60 * 1000) {
        await new Promise(r => setTimeout(r, 3000));

        const opResponse = await fetch(opUrl, { headers });
        const op = await opResponse.json();

        if (op.done) {
            if (op.error) {
                throw new Error(`Vision API error: ${op.error.message}`);
            }

            // Download results
            const listUrl = `https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET}/o?prefix=${encodeURIComponent(outputPrefix)}`;
            const listResponse = await fetch(listUrl, { headers });
            const listData = await listResponse.json();

            let combinedText = '';

            for (const item of (listData.items || [])) {
                const fileUrl = `https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET}/o/${encodeURIComponent(item.name)}?alt=media`;
                const fileResponse = await fetch(fileUrl, { headers });
                const fileContent = await fileResponse.json();

                for (const response of (fileContent.responses || [])) {
                    combinedText += response.fullTextAnnotation?.text || '';
                }
            }

            // Cleanup
            await fetch(`https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET}/o/${encodeURIComponent(gcsInputPath)}`, { method: 'DELETE', headers }).catch(() => { });
            for (const item of (listData.items || [])) {
                await fetch(`https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET}/o/${encodeURIComponent(item.name)}`, { method: 'DELETE', headers }).catch(() => { });
            }

            if (!combinedText.trim()) {
                throw new Error('No text extracted from PDF');
            }

            return {
                text: combinedText,
                metadata: {
                    language: 'en',
                    isMixedLanguage: false,
                    confidence: 0.9,
                    source: 'vision_api_async',
                },
            };
        }
    }

    throw new Error('Vision API async operation timed out');
}
