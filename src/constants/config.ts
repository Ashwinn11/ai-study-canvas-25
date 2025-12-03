// iOS-only: motion and iconSize from @/theme removed

export const API_ENDPOINTS = {
  DOCUMENT_AI_PROCESS: "/api/documentai/process",
  AI_CHAT_PROXY: "/api/ai/chat",
  YOUTUBE_CAPTIONS: "/api/youtube/captions",
  GOOGLE_DOCUMENT_AI_BASE: "https://documentai.googleapis.com/v1",
  GOOGLE_VISION_API_ASYNC_BATCH:
    "https://vision.googleapis.com/v1/files:asyncBatchAnnotate",
  GOOGLE_VISION_API_IMAGES: "https://vision.googleapis.com/v1/images:annotate",
  OPENAI_CHAT_COMPLETIONS: "https://api.openai.com/v1/chat/completions",
  GOOGLE_SPEECH_TO_TEXT:
    "https://speech.googleapis.com/v1/speech:longrunningrecognize",
} as const;

// Web-compatible timeouts (removed iOS motion.durations references)
export const TIMEOUTS = {
  DEFAULT_API: 30000,
  POLLING_MAX: 10 * 60 * 1000,
  CONFIG_CACHE_TTL: 24 * 60 * 60 * 1000,
  AI_CACHE_DEFAULT_TTL: 7 * 24 * 60 * 60 * 1000,
  FEYNMAN_CACHE_DEFAULT_TTL: 7 * 24 * 60 * 60 * 1000,
  UPLOAD_STAGE_VALIDATION: 150 + 250, // 400ms
  UPLOAD_STAGE_READING: 250 * 4 + 300, // 1300ms
  UPLOAD_STAGE_EXTRACTING: 400 * 3 + 750, // 1950ms
  UPLOAD_STAGE_GENERATING: 400 * 4 + 200, // 1800ms
  UPLOAD_STAGE_FINALIZING: 250 * 4, // 1000ms
  UPLOAD_STAGE_COMPLETED: 250 * 4 + 200, // 1200ms
  UI_COMPLETION_DISMISS: 250 * 6, // 1500ms
} as const;

export const FILE_LIMITS = {
  MAX_PAGES: 30,
  MAX_CHARACTERS: 100000,
  MAX_DURATION_SECONDS: 600,
  PDF_MAX_SIZE_BYTES: 20971520,
  IMAGE_MAX_SIZE_BYTES: 15728640,
  AUDIO_MAX_SIZE_BYTES: 20971520,
  VIDEO_MAX_SIZE_BYTES: 31457280,
  DOCUMENT_MAX_SIZE_BYTES: 20971520,
  MIN_CONTENT_LENGTH: 10,
} as const;

export const AI_CONFIG = {
  DEFAULT_MODEL: "gpt-4o-mini",
  DEFAULT_TEMPERATURE: 0.3,
  DEFAULT_MAX_TOKENS: 16000,
  FLASHCARDS_DEFAULT_QUANTITY: 20,
  FLASHCARDS_MIN_QUANTITY: 5,
  FLASHCARDS_MAX_QUANTITY: 100,
  FLASHCARDS_MAX_TOKENS: 12000,
  DEFAULT_MAX_RETRIES: 2,
  DEFAULT_RETRY_DELAY_MS: 250 * 3 + 50, // 800ms
  RETRY_JITTER_MS: 40 * 2 + 40, // 200ms
  DEFAULT_MODEL_MAX_TOKENS: 16384,
} as const;

export const RATE_LIMITING = {
  DEFAULT_WINDOW_MS: 60000,
  DEFAULT_MAX_REQUESTS: 120,
} as const;

export const SERVER_CONFIG = {
  DEFAULT_PORT: 8080,
  DEFAULT_DOCAI_LOCATION: "us",
} as const;

export const LANGUAGE_CONFIG = {
  CJK_LANGUAGE_CODES: ["zh", "ja", "ko", "th"],
  DEFAULT_SPEECH_TO_TEXT_LANGUAGES:
    "en-US,es-ES,fr-FR,de-DE,zh-CN,pt-BR,ja-JP,ko-KR",
} as const;

export const LEGAL_CONFIG = {
  APPLE_SUBSCRIPTION_MANAGEMENT_URL:
    "https://apps.apple.com/account/subscriptions",
  SUPPORT_EMAIL: "support@masterlyapp.in",
} as const;
