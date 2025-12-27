/**
 * YouTube Captions Edge Function
 * Extracts captions/transcripts from YouTube videos
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface TranscriptItem {
    text: string;
    offset: number;
    duration: number;
}

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
        const { url } = await req.json();

        if (!url) {
            return new Response(
                JSON.stringify({ error: 'Missing URL' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            return new Response(
                JSON.stringify({ error: 'Invalid YouTube URL' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`[YouTube] Fetching captions for video: ${videoId}`);

        // Use YouTube's timedtext API directly
        const transcript = await fetchYouTubeTranscript(videoId);

        if (!transcript || transcript.length === 0) {
            return new Response(
                JSON.stringify({
                    error: 'NO_CAPTIONS',
                    message: 'No captions found for this video. The video may not have captions or they may be disabled.',
                }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const text = transcript.map((item: TranscriptItem) => item.text).join(' ');
        let duration = 0;

        if (transcript.length > 0) {
            const lastItem = transcript[transcript.length - 1];
            duration = Math.round((lastItem.offset + lastItem.duration) / 1000);
        }

        console.log(`[YouTube] Successfully extracted ${text.length} chars from video ${videoId}`);

        return new Response(
            JSON.stringify({
                text,
                metadata: {
                    source: 'youtube_captions',
                    videoId,
                    captionSource: 'youtube-api',
                    language: 'en',
                    duration,
                },
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('[YouTube] Caption extraction failed:', error);

        const errorMessage = String(error);
        if (errorMessage.includes('Could not find captions') ||
            errorMessage.includes('No captions') ||
            errorMessage.includes('disabled')) {
            return new Response(
                JSON.stringify({
                    error: 'NO_CAPTIONS',
                    message: 'No captions found for this video.',
                }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ error: 'Failed to extract captions', details: String(error) }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

/**
 * Extract YouTube video ID from URL
 */
function extractVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }
    return null;
}

/**
 * Fetch transcript using YouTube's internal API
 */
async function fetchYouTubeTranscript(videoId: string): Promise<TranscriptItem[]> {
    // First, get the video page to extract caption track info
    const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const pageResponse = await fetch(videoPageUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        },
    });

    if (!pageResponse.ok) {
        throw new Error(`Failed to fetch video page: ${pageResponse.status}`);
    }

    const pageHtml = await pageResponse.text();

    // Extract captions URL from the page
    const captionsMatch = pageHtml.match(/"captionTracks":\s*(\[.*?\])/);
    if (!captionsMatch) {
        throw new Error('Could not find captions for this video');
    }

    let captionTracks;
    try {
        captionTracks = JSON.parse(captionsMatch[1]);
    } catch {
        throw new Error('Failed to parse caption tracks');
    }

    if (!captionTracks || captionTracks.length === 0) {
        throw new Error('No caption tracks available');
    }

    // Prefer English captions, fallback to first available
    let captionUrl = captionTracks.find((t: { languageCode: string }) =>
        t.languageCode === 'en' || t.languageCode?.startsWith('en')
    )?.baseUrl;

    if (!captionUrl) {
        captionUrl = captionTracks[0]?.baseUrl;
    }

    if (!captionUrl) {
        throw new Error('No caption URL found');
    }

    // Fetch the captions XML
    const captionsResponse = await fetch(captionUrl);
    if (!captionsResponse.ok) {
        throw new Error(`Failed to fetch captions: ${captionsResponse.status}`);
    }

    const captionsXml = await captionsResponse.text();

    // Parse the XML to extract text segments
    const segments: TranscriptItem[] = [];
    const textMatches = captionsXml.matchAll(/<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([^<]*)<\/text>/g);

    for (const match of textMatches) {
        const offset = parseFloat(match[1]) * 1000; // Convert to ms
        const duration = parseFloat(match[2]) * 1000;
        const text = decodeHTMLEntities(match[3]);

        if (text.trim()) {
            segments.push({ text: text.trim(), offset, duration });
        }
    }

    return segments;
}

/**
 * Decode HTML entities in caption text
 */
function decodeHTMLEntities(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)))
        .replace(/\n/g, ' ');
}
