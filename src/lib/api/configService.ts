/**
 * App Configuration Service
 * Fetches and caches dynamic configuration from backend
 * Matches iOS configService.ts implementation
 */

export interface AIConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}

export interface FeynmanConfig extends AIConfig {
  maxWords: number;
  maxCharacters: number;
  maxChunks: number;
  maxChunkSize: number;
  cacheTtlMs: number;
}

export interface GenerationConfig extends AIConfig {
  defaultQuantity: number;
  minQuantity: number;
  maxQuantity: number;
}

export interface BrainBotConfig extends AIConfig {
  bufferSegments: number;  // Number of segments to buffer before playing
  cacheTtlMs: number;      // Cache TTL for podcast scripts
}

export interface PromptsConfig {
  version: string;
  timestamp: string;
  flashcardsSystemPrompt: string;
  // Intent-specific flashcard templates
  flashcardsUserTemplate_Educational?: string;
  flashcardsUserTemplate_Comprehension?: string;
  flashcardsUserTemplate_Reference?: string;
  flashcardsUserTemplate_Analytical?: string;
  flashcardsUserTemplate_Procedural?: string;
  quizSystemPrompt: string;
  // Intent-specific quiz templates
  quizUserTemplate_Educational?: string;
  quizUserTemplate_Comprehension?: string;
  quizUserTemplate_Reference?: string;
  quizUserTemplate_Analytical?: string;
  quizUserTemplate_Procedural?: string;
  conditionalSystemPrompt: string;
  feynmanUserTemplate: string;
  // BrainBot prompts
  brainbotPodcastSystemPrompt?: string;
  brainbotPodcastUserTemplate?: string;
  brainbotQASystemPrompt?: string;
  brainbotQAUserTemplate?: string;
}

export interface MediaLimitsConfig {
  maxDurationSeconds: number;
  maxFileSizeBytes: number;
}

export interface FileSizeConfig {
  document: number;
  image: number;
  audio: number;
  video: number;
}

export interface AppConfig {
  version: string;
  timestamp: string;
  ai: {
    modelLimits?: Record<string, number>;
    feynman: FeynmanConfig;
    flashcards: GenerationConfig;
    quiz: GenerationConfig;
    brainbot?: BrainBotConfig;  // BrainBot podcast configuration
    defaultCacheTtlMs?: number;
  };
  network: {
    documentAiTimeoutMs: number;
    mediaTranscriptionTimeoutMs?: number;
    defaultTimeoutMs: number;
    maxRetries: number;
    cacheTtlMs: number;
  };
  prompts?: PromptsConfig;
  upload?: {
    maxFileSize?: number;
    maxTextContentCharacters?: number;
    fileSizes?: FileSizeConfig;
    mediaLimits?: MediaLimitsConfig;
  };
}

/**
 * Configuration Cache TTL
 * How long to cache config in memory before re-fetching from backend
 * 24 hours = 86400000 milliseconds
 */
const CONFIG_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

class ConfigService {
  private config: AppConfig | null = null;
  private lastFetch: number = 0;
  private isFetching: boolean = false;
  private fetchPromise: Promise<AppConfig> | null = null;

  /**
   * Get app configuration
   * Fetches from backend, uses cache, or falls back to defaults
   * Matching iOS lines 243-265
   */
  async getConfig(): Promise<AppConfig> {
    // Return cached config if still valid (24 hour TTL)
    if (this.config && Date.now() - this.lastFetch < CONFIG_CACHE_TTL_MS) {
      return this.config;
    }

    // Return pending fetch if already in progress
    if (this.isFetching && this.fetchPromise) {
      return this.fetchPromise;
    }

    this.isFetching = true;
    this.fetchPromise = this.fetchConfigFromBackend();

    try {
      this.config = await this.fetchPromise;
      this.lastFetch = Date.now();
      return this.config;
    } finally {
      this.isFetching = false;
      this.fetchPromise = null;
    }
  }

  /**
   * Force refresh configuration from backend
   */
  async refreshConfig(): Promise<AppConfig> {
    this.lastFetch = 0; // Invalidate cache
    return this.getConfig();
  }

  /**
   * Get specific AI config section
   * Matching iOS lines 278-290
   */
  async getAIConfig(type: 'feynman'): Promise<FeynmanConfig>;
  async getAIConfig(type: 'brainbot'): Promise<BrainBotConfig>;
  async getAIConfig(type: 'flashcards' | 'quiz'): Promise<GenerationConfig>;
  async getAIConfig(
    type: 'feynman' | 'flashcards' | 'quiz' | 'brainbot'
  ): Promise<FeynmanConfig | GenerationConfig | BrainBotConfig> {
    const config = await this.getConfig();

    if (type === 'feynman') {
      return config.ai.feynman;
    }

    if (type === 'brainbot') {
      return config.ai.brainbot || {
        // Fallback if missing in backend
        model: 'gpt-4o-mini',
        temperature: 0.8,
        maxTokens: 1000,
        timeoutMs: 90000,
        bufferSegments: 4,
        cacheTtlMs: 3600000,  // 1 hour
      };
    }

    return config.ai[type];
  }

  /**
   * Get prompts configuration
   * Matching iOS lines 477-498
   */
  async getPrompts(): Promise<PromptsConfig> {
    let config = await this.getConfig();

    // If prompts are missing, try to refresh config from backend
    if (!config.prompts) {
      console.log('[ConfigService] Prompts missing, forcing refresh from backend');
      await this.refreshConfig();
      config = await this.getConfig();
    }

    if (!config.prompts) {
      console.error('[ConfigService] Prompts unavailable from backend and no cache');
      throw new Error(
        'AI prompts are currently unavailable. Please check your internet connection and try again.'
      );
    }

    return config.prompts;
  }

  /**
   * Fetch configuration from backend
   * Matching iOS lines 631-716
   */
  private async fetchConfigFromBackend(): Promise<AppConfig> {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      if (!baseUrl) {
        console.error('[ConfigService] API base URL not configured (NEXT_PUBLIC_API_BASE_URL missing)');
        throw new Error(
          'Backend URL not configured. Please set NEXT_PUBLIC_API_BASE_URL environment variable.'
        );
      }

      const response = await fetch(`${baseUrl}/api/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Config fetch failed: ${response.status}`);
      }

      const config: AppConfig = await response.json();

      console.log('[ConfigService] Backend config keys:', Object.keys(config));
      console.log('[ConfigService] Has prompts:', !!config.prompts);

      // Persist to localStorage for offline access
      try {
        localStorage.setItem('app_config', JSON.stringify(config));
        localStorage.setItem('app_config_timestamp', new Date().toISOString());
      } catch (storageError) {
        console.warn('[ConfigService] Failed to cache config:', storageError);
        // Not critical, continue with in-memory config
      }

      console.log('[ConfigService] Successfully fetched config from backend');
      return config;
    } catch (error) {
      console.warn('[ConfigService] Failed to fetch from backend:', error);

      // Try to load from localStorage
      try {
        const cached = localStorage.getItem('app_config');
        if (cached) {
          console.log('[ConfigService] Using cached config from localStorage (offline mode)');
          return JSON.parse(cached);
        }
      } catch (storageError) {
        console.warn('[ConfigService] Failed to read cached config:', storageError);
      }

      // NO FALLBACK - Throw error to force proper handling
      console.error(
        '[ConfigService] Config unavailable: Backend unreachable and no cache available'
      );
      throw new Error(
        'Configuration unavailable. Please check your internet connection and try again.'
      );
    }
  }

  /**
   * Get maximum file size for specific content type
   * Matching iOS lines 349-388
   */
  async getMaxFileSize(): Promise<number> {
    const config = await this.getConfig();
    return config.upload?.maxFileSize || 20 * 1024 * 1024; // Default 20MB
  }

  async getMaxFileSizeByType(contentType: 'document' | 'image' | 'audio' | 'video'): Promise<number> {
    const config = await this.getConfig();

    if (config.upload?.fileSizes?.[contentType]) {
      return config.upload.fileSizes[contentType];
    }

    // Fallback to default limits matching iOS
    const defaultLimits = {
      document: 15 * 1024 * 1024, // 15MB
      image: 10 * 1024 * 1024,     // 10MB
      audio: 50 * 1024 * 1024,     // 50MB
      video: 100 * 1024 * 1024,    // 100MB
    };

    return defaultLimits[contentType] || await this.getMaxFileSize();
  }

  async getMaxTextContentCharacters(): Promise<number> {
    const config = await this.getConfig();
    return config.upload?.maxTextContentCharacters || 50000; // Default 50K characters
  }

  async getMediaLimits(): Promise<MediaLimitsConfig> {
    const config = await this.getConfig();
    return config.upload?.mediaLimits || {
      maxDurationSeconds: 600, // 10 minutes
      maxFileSizeBytes: 50 * 1024 * 1024, // 50MB
    };
  }

  async getAILimits(): Promise<{ maxWords: number; maxCharacters: number }> {
    const feynmanConfig = await this.getAIConfig('feynman');
    return {
      maxWords: feynmanConfig.maxWords,
      maxCharacters: feynmanConfig.maxCharacters,
    };
  }

  /**
   * Clear cached configuration
   */
  async clearCache(): Promise<void> {
    this.config = null;
    this.lastFetch = 0;
    try {
      localStorage.removeItem('app_config');
      localStorage.removeItem('app_config_timestamp');
    } catch (error) {
      console.warn('[ConfigService] Failed to clear cache:', error);
    }
  }

  /**
   * Get flashcard distribution based on intent
   */
  async getFlashcardIntentDistribution(intent: string): Promise<Record<string, number>> {
    // Default distribution if not configured
    const defaults: Record<string, Record<string, number>> = {
      educational: { definition: 0.4, concept: 0.3, application: 0.3 },
      comprehension: { concept: 0.5, application: 0.3, analysis: 0.2 },
      reference: { definition: 0.6, fact: 0.4 },
      analytical: { analysis: 0.5, synthesis: 0.3, evaluation: 0.2 },
      procedural: { step: 0.6, application: 0.4 },
    };

    return defaults[intent.toLowerCase()] || {
      definition: 0.5, concept: 0.5
    };
  }

  /**
   * Get quiz distribution based on intent
   */
  async getQuizIntentDistribution(intent: string): Promise<Record<string, number>> {
    // Default distribution if not configured
    const defaults: Record<string, Record<string, number>> = {
      educational: { remember: 0.3, understand: 0.4, apply: 0.3 },
      comprehension: { understand: 0.5, apply: 0.3, analyze: 0.2 },
      reference: { remember: 0.6, understand: 0.4 },
      analytical: { analyze: 0.4, evaluate: 0.4, create: 0.2 },
      procedural: { remember: 0.3, apply: 0.7 },
    };

    return defaults[intent.toLowerCase()] || { remember: 0.4, understand: 0.4, apply: 0.2 };
  }

  /**
   * Get timeout for specific service
   */
  async getTimeout(service: 'documentAi' | 'mediaTranscription' | 'youtube' | 'default'): Promise<number> {
    const config = await this.getConfig();

    // Use network config if available, otherwise fall back to defaults
    if (config.network) {
      if (service === 'documentAi') return config.network.documentAiTimeoutMs;
      if (service === 'mediaTranscription') return config.network.mediaTranscriptionTimeoutMs || 600000;
      if (service === 'youtube') return 30000;
      return config.network.defaultTimeoutMs;
    }

    // Default timeouts in ms if network config is missing
    const defaults: Record<string, number> = {
      documentAi: 60000,
      mediaTranscription: 600000,
      youtube: 30000,
      default: 30000
    };
    return defaults[service] || 30000;
  }
}

// Export singleton instance
export const configService = new ConfigService();
