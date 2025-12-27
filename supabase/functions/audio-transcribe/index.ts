/**
 * Audio Transcribe Edge Function
 * Transcribes audio using Google Cloud Speech-to-Text API
 * 
 * Supports: WAV, FLAC
 * Recording in the app produces WAV format automatically.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const GCS_BUCKET = Deno.env.get('GCS_BUCKET');
const MAX_DURATION_SECONDS = 600;
const DEFAULT_STT_LANGS = ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'zh-CN', 'pt-BR', 'ja-JP', 'ko-KR'];
// Formats supported by Google STT
const GOOGLE_STT_FORMATS = ['audio/wav', 'audio/x-wav', 'audio/flac', 'audio/x-flac'];

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

        if (!GCS_BUCKET) {
            return new Response(
                JSON.stringify({ error: 'GCS_BUCKET not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { contentBase64, mimeType = 'audio/wav', languageHints = [] } = await req.json();

        console.log(`[Audio Transcribe] Received request: mimeType=${mimeType}, base64Length=${contentBase64?.length || 0}`);

        if (!contentBase64) {
            return new Response(
                JSON.stringify({ error: 'Missing contentBase64' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Decode audio
        const audioBytes = Uint8Array.from(atob(contentBase64), c => c.charCodeAt(0));
        console.log(`[Audio Transcribe] Decoded audio: ${audioBytes.length} bytes`);

        // Estimate duration based on format
        let estimatedDurationSeconds = 0;

        if (mimeType.toLowerCase().includes('wav') && audioBytes.length > 44) {
            // Parse WAV header for accurate duration
            // Check for valid WAV header: starts with "RIFF" and contains "WAVE"
            const riff = String.fromCharCode(audioBytes[0], audioBytes[1], audioBytes[2], audioBytes[3]);
            const wave = String.fromCharCode(audioBytes[8], audioBytes[9], audioBytes[10], audioBytes[11]);

            console.log(`[Audio Transcribe] WAV header check: RIFF="${riff}", WAVE="${wave}"`);

            if (riff === 'RIFF' && wave === 'WAVE') {
                // Bytes 22-23: channels, 24-27: sample rate, 34-35: bits per sample
                const channels = audioBytes[22] | (audioBytes[23] << 8);
                const sampleRate = audioBytes[24] | (audioBytes[25] << 8) | (audioBytes[26] << 16) | (audioBytes[27] << 24);
                const bitsPerSample = audioBytes[34] | (audioBytes[35] << 8);

                console.log(`[Audio Transcribe] WAV params: sampleRate=${sampleRate}, channels=${channels}, bitsPerSample=${bitsPerSample}`);

                // Safeguard against invalid values
                if (sampleRate > 0 && channels > 0 && bitsPerSample > 0) {
                    const bytesPerSecond = sampleRate * channels * (bitsPerSample / 8);
                    const audioDataSize = audioBytes.length - 44;
                    estimatedDurationSeconds = Math.ceil(audioDataSize / bytesPerSecond);
                    console.log(`[Audio Transcribe] WAV duration: ${estimatedDurationSeconds}s (${audioBytes.length} bytes)`);
                } else {
                    // Invalid header values, skip duration check
                    console.log(`[Audio Transcribe] Invalid WAV header values, skipping duration check`);
                    estimatedDurationSeconds = 0;
                }
            } else {
                // Not a valid WAV file, skip duration check
                console.log(`[Audio Transcribe] Not a valid WAV file header, skipping duration check`);
                estimatedDurationSeconds = 0;
            }
        } else if (!mimeType.toLowerCase().includes('wav')) {
            // For other formats (like FLAC), use rough estimation
            estimatedDurationSeconds = Math.ceil((audioBytes.length / 100000) * 60);
            console.log(`[Audio Transcribe] Non-WAV format ${mimeType}, estimated duration: ${estimatedDurationSeconds}s`);
        }

        // Only reject if we have a valid duration estimate > limit
        if (estimatedDurationSeconds > MAX_DURATION_SECONDS) {
            return new Response(
                JSON.stringify({
                    error: 'MEDIA_TOO_LONG',
                    message: `Audio duration exceeds ${MAX_DURATION_SECONDS} seconds limit.`,
                }),
                { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Check format - only WAV and FLAC are supported
        const normalizedMimeType = mimeType.toLowerCase();
        const isSupported = GOOGLE_STT_FORMATS.some(f => normalizedMimeType.includes(f.replace('audio/', '')));

        if (!isSupported) {
            return new Response(
                JSON.stringify({
                    error: 'UNSUPPORTED_FORMAT',
                    message: `Audio format ${mimeType} is not supported. Please record audio using the app (WAV format).`,
                    supportedFormats: ['WAV', 'FLAC'],
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get Google access token
        const accessToken = await getGoogleAccessToken();

        // Upload to GCS
        const id = crypto.randomUUID();
        const ext = mimeType.includes('flac') ? 'flac' : 'wav';
        const gcsPath = `audio-input/${id}.${ext}`;

        console.log(`[Audio Transcribe] Uploading audio to GCS: ${gcsPath}`);

        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': mimeType,
        };

        const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${GCS_BUCKET}/o?uploadType=media&name=${encodeURIComponent(gcsPath)}`;
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers,
            body: audioBytes,
        });

        if (!uploadResponse.ok) {
            throw new Error(`Failed to upload to GCS: ${uploadResponse.status}`);
        }

        // Build STT config
        const langs = languageHints.length > 0 ? languageHints : DEFAULT_STT_LANGS;

        // Parse WAV header for actual sample rate and channels
        // Default to 16000Hz mono if parsing fails
        let sampleRate = 16000;
        let channels = 1;

        if (mimeType.toLowerCase().includes('wav') && audioBytes.length > 44) {
            // Check for valid WAV header
            const riff = String.fromCharCode(audioBytes[0], audioBytes[1], audioBytes[2], audioBytes[3]);
            const wave = String.fromCharCode(audioBytes[8], audioBytes[9], audioBytes[10], audioBytes[11]);

            if (riff === 'RIFF' && wave === 'WAVE') {
                // WAV header: bytes 22-23 = numChannels, bytes 24-27 = sampleRate
                const parsedChannels = audioBytes[22] | (audioBytes[23] << 8);
                const parsedSampleRate = audioBytes[24] | (audioBytes[25] << 8) | (audioBytes[26] << 16) | (audioBytes[27] << 24);

                // Validate parsed values - sample rate should be between 8000 and 48000
                // Channels should be 1 or 2
                if (parsedSampleRate >= 8000 && parsedSampleRate <= 48000) {
                    sampleRate = parsedSampleRate;
                } else {
                    console.warn(`[Audio Transcribe] Invalid sample rate ${parsedSampleRate}, using default 16000`);
                }

                if (parsedChannels >= 1 && parsedChannels <= 2) {
                    channels = parsedChannels;
                } else {
                    console.warn(`[Audio Transcribe] Invalid channels ${parsedChannels}, using default 1`);
                }

                console.log(`[Audio Transcribe] WAV config: ${sampleRate}Hz, ${channels} channel(s)`);
            } else {
                console.log(`[Audio Transcribe] Not a valid WAV file (header: "${riff}/${wave}"), using defaults`);
            }
        }

        const sttConfig: Record<string, unknown> = {
            encoding: mimeType.toLowerCase().includes('flac') ? 'FLAC' : 'LINEAR16',
            sampleRateHertz: sampleRate,
            audioChannelCount: channels,
            enableAutomaticPunctuation: true,
            languageCode: langs[0],
        };

        if (langs.length > 1) {
            sttConfig.alternativeLanguageCodes = langs.slice(1);
        }

        console.log(`[Audio Transcribe] STT config:`, JSON.stringify(sttConfig));

        // Start long-running recognition
        const sttUrl = 'https://speech.googleapis.com/v1/speech:longrunningrecognize';
        const sttResponse = await fetch(sttUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                config: sttConfig,
                audio: { uri: `gs://${GCS_BUCKET}/${gcsPath}` },
            }),
        });

        if (!sttResponse.ok) {
            const errorText = await sttResponse.text();
            console.error(`[Audio Transcribe] STT start failed: ${sttResponse.status} - ${errorText}`);
            await cleanupGCS(accessToken, gcsPath);
            throw new Error(`STT start failed: ${sttResponse.status} - ${errorText}`);
        }

        const sttData = await sttResponse.json();
        const opName = sttData.name;

        // Poll for completion
        const opUrl = `https://speech.googleapis.com/v1/operations/${encodeURIComponent(opName)}`;
        const startTime = Date.now();

        while (Date.now() - startTime < 10 * 60 * 1000) {
            await new Promise(r => setTimeout(r, 2000));

            const opResponse = await fetch(opUrl, {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });

            const op = await opResponse.json();

            if (op.done) {
                await cleanupGCS(accessToken, gcsPath);

                if (op.error) {
                    throw new Error(`STT error: ${op.error.message}`);
                }

                const results = op.response?.results || [];
                let transcript = '';
                let detectedLanguage: string | undefined;

                for (const result of results) {
                    if (result.alternatives?.[0]) {
                        transcript += result.alternatives[0].transcript + ' ';
                    }
                    if (result.languageCode && !detectedLanguage) {
                        detectedLanguage = result.languageCode;
                    }
                }

                transcript = transcript.trim();

                if (!transcript) {
                    return new Response(
                        JSON.stringify({ error: 'NO_TEXT_FOUND', message: 'No speech detected in audio' }),
                        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }

                console.log(`[Audio Transcribe] Successfully transcribed ${transcript.length} characters`);

                return new Response(
                    JSON.stringify({
                        text: transcript,
                        metadata: {
                            language: detectedLanguage,
                            source: 'google_stt',
                        },
                    }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        }

        await cleanupGCS(accessToken, gcsPath);
        throw new Error('STT operation timed out');

    } catch (error) {
        console.error('[Audio Transcribe] Error:', error);
        return new Response(
            JSON.stringify({ error: 'Transcription failed', details: String(error) }),
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

async function cleanupGCS(accessToken: string, filePath: string): Promise<void> {
    try {
        const deleteUrl = `https://storage.googleapis.com/storage/v1/b/${GCS_BUCKET}/o/${encodeURIComponent(filePath)}`;
        await fetch(deleteUrl, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });
    } catch (err) {
        console.error('[Audio Transcribe] Failed to cleanup:', err);
    }
}
