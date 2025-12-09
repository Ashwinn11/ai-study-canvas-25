// Gemini 2.5 Flash Text-to-Speech Service
import { logger } from '@/utils/logger';
import { getSupabaseClient } from '@/lib/supabase/client';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export interface TextToSpeechOptions {
    text: string;
    voiceId: string;
    languageCode?: string;
}

export class GeminiTextToSpeechService {
    /**
     * Convert text to speech using Gemini 2.5 Flash TTS via backend
     * Supports multi-speaker podcast generation
     */
    async textToSpeech({
        text,
        voiceId,
        languageCode = 'en-US',
    }: TextToSpeechOptions): Promise<string> {
        try {
            logger.info('[GeminiTTS] Generating speech:', { voiceId, textLength: text.length });

            // Get JWT token from Supabase
            const supabase = getSupabaseClient();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error('No authentication token available');
            }

            const response = await fetch(`${BACKEND_API_URL}/api/tts/gemini-synthesize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    text,
                    voiceId,
                    languageCode,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Gemini TTS API error: ${response.statusText} - ${errorText}`);
            }

            const { audioUrl } = await response.json();
            if (!audioUrl) {
                throw new Error('No audio URL returned from backend TTS API');
            }

            logger.info('[GeminiTTS] Speech generated successfully');
            return audioUrl;
        } catch (error) {
            logger.error('[GeminiTTS] Error generating speech:', error);
            throw error;
        }
    }
}

export const geminiTextToSpeechService = new GeminiTextToSpeechService();
