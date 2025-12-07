import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

export async function POST(request: NextRequest) {
    try {
        // Verify authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!ELEVENLABS_API_KEY) {
            return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
        }

        const body = await request.json();
        const { text, voice_id, model_id = 'eleven_multilingual_v2', voice_settings } = body;

        if (!text || !voice_id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Call ElevenLabs API
        const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voice_id}`, {
            method: 'POST',
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                model_id,
                voice_settings: voice_settings || {
                    stability: 0.5,
                    similarity_boost: 0.75,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[ElevenLabs API] Error:', errorText);
            return NextResponse.json(
                { error: 'ElevenLabs API error', details: errorText },
                { status: response.status }
            );
        }

        // Return audio as blob
        const audioBuffer = await response.arrayBuffer();
        return new NextResponse(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'public, max-age=31536000',
            },
        });
    } catch (error) {
        console.error('[ElevenLabs API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
