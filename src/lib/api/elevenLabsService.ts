// ElevenLabs API Integration Service for Web
import { getSupabaseClient } from '@/lib/supabase/client';
import { logger } from '@/utils/logger';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

export interface TextToSpeechOptions {
    text: string;
    voice_id: string;
    model_id?: string;
    voice_settings?: {
        stability?: number;
        similarity_boost?: number;
    };
}

export class ElevenLabsService {
    /**
     * Convert text to speech using ElevenLabs API via backend proxy
     */
    async textToSpeech({
        text,
        voice_id,
        model_id = 'eleven_multilingual_v2',
        voice_settings = {
            stability: 0.5,
            similarity_boost: 0.75,
        },
    }: TextToSpeechOptions): Promise<string> {
        try {
            logger.info('[ElevenLabs] Generating speech:', { voice_id, textLength: text.length });

            const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
            if (!apiKey) {
                throw new Error('ElevenLabs API key not configured');
            }

            // Call ElevenLabs API directly (like iOS app)
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
                method: 'POST',
                headers: {
                    'xi-api-key': apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text,
                    model_id,
                    voice_settings,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`ElevenLabs API error: ${response.statusText} - ${errorText}`);
            }

            const audioBlob = await response.blob();

            // Upload audio to Supabase storage
            const audioUrl = await this.uploadAudio(audioBlob);

            logger.info('[ElevenLabs] Speech generated successfully');
            return audioUrl;
        } catch (error) {
            logger.error('[ElevenLabs] Error generating speech:', error);
            throw error;
        }
    }

    /**
     * Upload audio blob to Supabase storage
     */
    private async uploadAudio(audioBlob: Blob): Promise<string> {
        try {
            const supabase = getSupabaseClient();
            const fileName = `brainbot_${Date.now()}.mp3`;
            const filePath = `podcasts/${fileName}`;

            const { data, error } = await supabase.storage
                .from('audio')
                .upload(filePath, audioBlob, {
                    contentType: 'audio/mpeg',
                    cacheControl: '3600',
                });

            if (error) {
                logger.error('[ElevenLabs] Supabase upload error:', error);
                throw error;
            }

            // Get public URL
            const {
                data: { publicUrl },
            } = supabase.storage.from('audio').getPublicUrl(filePath);

            logger.info('[ElevenLabs] Audio uploaded to Supabase:', publicUrl);
            return publicUrl;
        } catch (error) {
            logger.error('[ElevenLabs] Error uploading audio:', error);
            throw error;
        }
    }
}

export const elevenLabsService = new ElevenLabsService();
