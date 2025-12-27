import { ServiceError } from "./serviceError";
import { fetchWithTimeout } from './timeoutUtils';
import { recordError, recordEvent } from "@/utils/telemetry";
import { supabase } from "./supabaseClient";
import { configService } from "./configService";
import { API_ENDPOINTS } from "@/constants/config";

const DEFAULT_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "";

export interface YouTubeExtractionResult {
    text: string;
    metadata: {
        source: string;
        videoId: string;
        captionSource: string;
        language: string;
        duration: number;
    };
}

export async function extractYouTubeCaptions(
    url: string
): Promise<YouTubeExtractionResult> {
    if (!DEFAULT_BASE_URL) {
        throw new ServiceError(
            "Backend URL not configured",
            "youtubeClient",
            "BACKEND_NOT_CONFIGURED",
            "Service configuration error. Please contact support.",
            false
        );
    }

    // Get user session for JWT auth
    const {
        data: { session },
        error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
        throw new ServiceError(
            "Not authenticated",
            "youtubeClient",
            "AUTH_FAILED",
            "You must be logged in to process YouTube videos",
            false
        );
    }

    const endpointUrl = `${DEFAULT_BASE_URL.replace(/\/$/, "")}${API_ENDPOINTS.YOUTUBE_CAPTIONS}`;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
    };

    const startTime = Date.now();

    try {
        // Get dynamic timeout from backend config, default to 30s if not set
        // YouTube extraction is usually fast, but network can vary
        const timeout = (await configService.getTimeout("youtube")) || 30000;

        const resp = await fetchWithTimeout(
            endpointUrl,
            {
                method: "POST",
                headers,
                body: JSON.stringify({ url }),
            },
            timeout
        );

        if (!resp.ok) {
            const text = await resp.text().catch(() => "");
            let errorResponse: any = null;
            let errorCode = "YOUTUBE_BACKEND_ERROR";
            let userMessage = "Unable to process this YouTube video. Please try again.";
            let shouldRetry = true;

            try {
                errorResponse = JSON.parse(text);

                if (errorResponse.error) {
                    errorCode = errorResponse.error;
                }

                if (errorResponse.message) {
                    userMessage = errorResponse.message;
                }

                // specific error handling based on backend response
                if (errorCode === "NO_CAPTIONS") {
                    shouldRetry = false;
                    userMessage = "This video does not have captions available. Please try a video with closed captions.";
                } else if (errorCode === "Invalid YouTube URL") {
                    shouldRetry = false;
                    userMessage = "The provided URL is not a valid YouTube video link.";
                }
            } catch (parseError) {
                if (text && text.length < 200) {
                    userMessage = text;
                }
            }

            const error = new ServiceError(
                `YouTube extraction failed: ${resp.status} ${text}`,
                "youtubeClient",
                errorCode,
                userMessage,
                shouldRetry
            );

            recordError("youtube_extraction_failed", error, {
                statusCode: resp.status,
                errorCode,
                duration: Date.now() - startTime,
            });

            throw error;
        }

        const data = await resp.json();
        const duration = Date.now() - startTime;

        recordEvent("youtube_extraction_success", {
            videoId: data.metadata?.videoId,
            textLength: data.text?.length || 0,
            duration,
        });

        return data as YouTubeExtractionResult;
    } catch (error) {
        if (error instanceof ServiceError) {
            throw error;
        }

        const wrappedError = new ServiceError(
            "YouTube request failed",
            "youtubeClient",
            "YOUTUBE_REQUEST_FAILED",
            "Unable to connect to YouTube service. Please check your internet connection.",
            true,
            error instanceof Error ? error : undefined
        );

        recordError("youtube_request_failed", wrappedError, {
            duration: Date.now() - startTime,
        });

        throw wrappedError;
    }
}
