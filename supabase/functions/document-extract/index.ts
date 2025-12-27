/**
 * Document Extract Edge Function
 * Extracts text from DOC, DOCX, TXT, and RTF files
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const MAX_CHARACTERS = 100000;

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

        const { contentBase64, mimeType = 'text/plain' } = await req.json();

        if (!contentBase64) {
            return new Response(
                JSON.stringify({ error: 'Missing contentBase64' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Decode base64 to bytes
        const bytes = Uint8Array.from(atob(contentBase64), c => c.charCodeAt(0));
        let text = '';

        // Handle different document types
        if (
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mimeType === 'application/msword'
        ) {
            // DOCX extraction - parse the XML inside the ZIP
            console.log('[Document Extract] Processing DOCX file...');
            text = await extractDocxText(bytes);
        } else if (mimeType === 'application/rtf' || mimeType === 'text/rtf') {
            // RTF extraction
            text = rtfToPlainText(bytes);
        } else if (mimeType.startsWith('text/')) {
            // Plain text extraction
            text = new TextDecoder('utf-8').decode(bytes);
        } else {
            return new Response(
                JSON.stringify({ error: `Unsupported MIME type: ${mimeType}` }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        text = text.trim();

        // Enforce character limit
        if (text.length > MAX_CHARACTERS) {
            return new Response(
                JSON.stringify({
                    error: 'DOCUMENT_TOO_LARGE',
                    message: `File exceeds limit (${MAX_CHARACTERS} characters).`,
                    details: { maxCharacters: MAX_CHARACTERS, actualCharacters: text.length },
                }),
                { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const wordCount = text.split(/\s+/).filter(Boolean).length;

        console.log(`[Document Extract] Successfully extracted ${text.length} characters, ${wordCount} words`);

        return new Response(
            JSON.stringify({
                text,
                metadata: {
                    source: 'document_extraction',
                    language: 'en',
                    isMixedLanguage: false,
                    confidence: 0.9,
                    wordCount,
                    charCount: text.length,
                },
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('[Document Extract] Error:', error);
        return new Response(
            JSON.stringify({ error: 'Document extraction failed', details: String(error) }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

/**
 * Extract text from DOCX file
 * DOCX is a ZIP archive containing XML files
 */
async function extractDocxText(bytes: Uint8Array): Promise<string> {
    // Use fflate for ZIP extraction (lightweight, works in Deno)
    const { unzipSync } = await import("https://esm.sh/fflate@0.8.1");

    try {
        const unzipped = unzipSync(bytes);

        // Look for document.xml (main content)
        const documentXmlPath = Object.keys(unzipped).find(path =>
            path.includes('word/document.xml')
        );

        if (!documentXmlPath) {
            throw new Error('Invalid DOCX: document.xml not found');
        }

        const documentXml = new TextDecoder().decode(unzipped[documentXmlPath]);

        // Extract text from XML
        // Text is in <w:t> tags
        const textMatches = documentXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g);
        const paragraphs: string[] = [];
        let currentParagraph = '';

        // Split on paragraph markers
        const parts = documentXml.split(/<w:p[^>]*>/);

        for (const part of parts) {
            const textInPart = [...part.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
                .map(m => m[1])
                .join('');

            if (textInPart.trim()) {
                paragraphs.push(textInPart);
            }
        }

        const text = paragraphs.join('\n\n');

        if (!text.trim()) {
            throw new Error('No text content found in DOCX');
        }

        return text;
    } catch (error) {
        console.error('[Document Extract] DOCX extraction error:', error);
        throw new Error(`DOCX extraction failed: ${error}`);
    }
}

/**
 * Simple RTF to plain text conversion
 */
function rtfToPlainText(bytes: Uint8Array): string {
    const rtfString = new TextDecoder('utf-8').decode(bytes);

    let text = rtfString
        .replace(/\\rtf\d+/, '')
        .replace(/\{\\fonttbl[^}]*\}/g, '')
        .replace(/\{\\colortbl[^}]*\}/g, '')
        .replace(/\{\\stylesheet[^}]*\}/g, '')
        .replace(/\\[a-z]+\d*\s?/gi, '')
        .replace(/\\'[0-9a-f]{2}/gi, '')
        .replace(/[{}]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    return text;
}
