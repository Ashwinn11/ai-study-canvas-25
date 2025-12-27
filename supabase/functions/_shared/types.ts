/**
 * Shared Types for Edge Functions
 */

// ============================================================================
// Document Processing Types
// ============================================================================

export interface DocumentProcessRequest {
    contentBase64: string;
    mimeType: string;
}

export interface DocumentProcessResponse {
    text: string;
    metadata: {
        language: string;
        languages?: Record<string, number>;
        isMixedLanguage: boolean;
        languageMetadata?: Record<string, number> | null;
        confidence: number;
        source: 'document_ai' | 'vision_api' | 'vision_api_async' | 'document_extraction';
        pageCount?: number;
        chunked?: boolean;
        wordCount?: number;
        charCount?: number;
    };
}

export interface DocumentExtractRequest {
    contentBase64: string;
    mimeType?: string;
}

// ============================================================================
// AI Chat Types
// ============================================================================

export interface AIChatRequest {
    model?: string;
    messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
    }>;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: {
        type: 'json_object' | 'text';
    };
}

export interface AIChatResponse {
    content: string;
    finishReason: string;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    model: string;
}

// ============================================================================
// Transcription Types
// ============================================================================

export interface AudioTranscribeRequest {
    contentBase64: string;
    mimeType?: string;
    languageHints?: string[];
}

export interface VideoTranscribeRequest {
    contentBase64: string;
    languageHints?: string[];
}

export interface TranscribeResponse {
    transcript: string;
    metadata: {
        language?: string;
        duration?: number;
        source: 'whisper' | 'google_stt';
    };
}

// ============================================================================
// YouTube Types
// ============================================================================

export interface YouTubeCaptionsRequest {
    url: string;
}

export interface YouTubeCaptionsResponse {
    text: string;
    segments?: Array<{
        text: string;
        start: number;
        duration: number;
    }>;
    videoId: string;
    title?: string;
    duration?: number;
    source: 'youtubei.js' | 'youtube-transcript';
}

// ============================================================================
// Config Types
// ============================================================================

export interface AppConfig {
    version: string;
    features: Record<string, boolean>;
    limits: {
        maxPages: number;
        maxCharacters: number;
        maxAudioDurationSeconds: number;
        maxVideoDurationSeconds: number;
    };
    models: {
        default: string;
        flashcards: string;
        quiz: string;
        notes: string;
    };
    urls: {
        termsOfService: string;
        privacyPolicy: string;
        support: string;
    };
}

export interface BloomLevel {
    level: number;
    name: string;
    description: string;
    verbs: string[];
    questionStarters: string[];
}

export interface BloomConfig {
    levels: BloomLevel[];
}

export interface SubscriptionPlan {
    id: string;
    name: string;
    price: number;
    currency: string;
    interval: 'month' | 'year';
    features: string[];
    limits: Record<string, number>;
}

export interface SubscriptionConfig {
    plans: SubscriptionPlan[];
    features: Record<string, {
        free: boolean | number;
        premium: boolean | number;
    }>;
}

// ============================================================================
// Prompt Types
// ============================================================================

export interface PromptTemplate {
    template: string;
    variables: string[];
    default: string;
}

export interface PromptsConfig {
    [key: string]: PromptTemplate;
}

// ============================================================================
// Cleanup Types
// ============================================================================

export interface CleanupRequest {
    dryRun?: boolean;
}

export interface CleanupResponse {
    deletedCount: number;
    deletedFiles: string[];
    errors?: string[];
    dryRun: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

export type ErrorCode =
    | 'DOCUMENT_TOO_LARGE'
    | 'MEDIA_TOO_LONG'
    | 'NO_TEXT_FOUND'
    | 'OCR_FAILED'
    | 'INVALID_FORMAT'
    | 'TRANSCRIPTION_FAILED'
    | 'API_ERROR'
    | 'AUTH_ERROR'
    | 'RATE_LIMITED'
    | 'NOT_FOUND';

export interface APIError {
    error: ErrorCode | string;
    message: string;
    details?: unknown;
}
