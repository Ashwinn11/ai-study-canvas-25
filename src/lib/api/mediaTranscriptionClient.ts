import { ServiceError } from './serviceError';
import { fetchWithTimeout } from './timeoutUtils';
import { recordEvent, recordError } from '@/utils/telemetry';
import { supabase } from './supabaseClient';
import { configService } from './configService';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || '';

function getBaseUrl(): string {
  if (!BASE_URL) {
    throw new ServiceError(
      'Backend URL not configured',
      'mediaTranscriptionClient',
      'BACKEND_NOT_CONFIGURED',
      'Audio/Video transcription requires server configuration.',
      false
    );
  }
  return BASE_URL.replace(/\/$/, '');
}

/**
 * Transcribe audio using Google Cloud Speech-to-Text with language auto-detection.
 *
 * @param contentBase64 - Base64-encoded audio content
 * @param mimeType - Audio MIME type (e.g., 'audio/wav', 'audio/mp3')
 * @param languageHints - Array of language codes for auto-detection (max 3).
 *                        Empty array enables full auto-detection.
 *                        Example: ['es-ES', 'en-US'] for Spanish/English content
 */
export async function transcribeAudio(
  contentBase64: string,
  mimeType: string,
  languageHints: string[] = []
) {
  // Get user session for JWT auth
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new ServiceError(
      'Not authenticated',
      'mediaTranscriptionClient',
      'AUTH_FAILED',
      'You must be logged in to transcribe audio',
      false
    );
  }

  const url = `${getBaseUrl()}/api/audio/transcribe`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };

  const startTime = Date.now();

  try {
    // Get dynamic timeout from backend config (audio transcription can take longer)
    const timeout = await configService.getTimeout('mediaTranscription');

    const resp = await fetchWithTimeout(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ contentBase64, mimeType, languageHints })
    }, timeout);

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      let errorResponse: any = null;
      let errorCode = 'AUDIO_TRANSCRIBE_FAILED';
      let userMessage = 'Unable to transcribe audio. Please try again later.';
      let shouldRetry = true;

      // Try to parse JSON error response from backend
      try {
        errorResponse = JSON.parse(text);

        // Use backend's error code if available
        if (errorResponse.error) {
          errorCode = errorResponse.error;
        }

        // Use backend's specific error message if available
        if (errorResponse.message) {
          userMessage = errorResponse.message;
        } else if (errorResponse.details) {
          // Check if error details contain useful information
          const details = errorResponse.details.toLowerCase();
          if (details.includes('timeout') || details.includes('timed out')) {
            userMessage = 'Audio transcription took too long. Try a shorter audio file or one with clearer speech.';
            shouldRetry = false;
          } else if (details.includes('no audio') || details.includes('empty')) {
            userMessage = 'No audio detected in this file. Please check the file and try again.';
            shouldRetry = false;
          } else if (details.includes('format')) {
            userMessage = 'Audio format not supported. Please try converting to MP3 or WAV.';
            shouldRetry = false;
          } else {
            // Use details if they're short enough
            if (errorResponse.details.length < 200) {
              userMessage = errorResponse.details;
            }
          }
        }
      } catch (parseError) {
        // If JSON parsing fails, use the raw text or default message
        if (text && text.length < 200) {
          userMessage = text;
        }
      }

      const error = new ServiceError(
        `Audio transcription failed: ${resp.status} ${text}`,
        'mediaTranscriptionClient',
        errorCode,
        userMessage,
        shouldRetry
      );

      recordError('audio_transcription_failed', error, {
        mimeType,
        statusCode: resp.status,
        errorCode,
        languageHints,
        duration: Date.now() - startTime,
      });

      throw error;
    }

    const data = await resp.json();
    const duration = Date.now() - startTime;

    recordEvent('audio_transcription_success', {
      mimeType,
      textLength: data.text?.length || 0,
      language: data.metadata?.language,
      confidence: data.metadata?.confidence,
      languageHints,
      duration,
    });

    return data;
  } catch (error) {
    if (error instanceof ServiceError) {
      throw error;
    }

    const wrappedError = new ServiceError(
      'Audio transcription request failed',
      'mediaTranscriptionClient',
      'AUDIO_REQUEST_FAILED',
      'Unable to transcribe audio. Please check your connection.',
      true,
      error instanceof Error ? error : undefined
    );

    recordError('audio_transcription_request_failed', wrappedError, {
      mimeType,
      duration: Date.now() - startTime,
    });

    throw wrappedError;
  }
}


