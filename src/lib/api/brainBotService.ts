import { ServiceError } from "./serviceError";
import { chatCompletion } from "./openAIClient";
import { configService } from "./configService";
import { TIMEOUTS } from "@/constants/config";
import { logger } from "@/utils/logger";
import { elevenLabsService } from "./elevenLabsService";
import { getSupabaseClient } from "@/lib/supabase/client";
import { BRAINBOT_VOICES } from "@/config/brainbotVoices";
import {
    getBrainBotPodcastSystemPrompt,
    getBrainBotPodcastUserTemplate,
    getBrainBotQASystemPrompt,
    getBrainBotQAUserTemplate,
    renderPromptTemplate
} from './prompts';

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

export type ExplanationMode = "simple" | "analogy" | "technical" | "fun";

export interface BrainBotContext {
    feynmanExplanation: string;
    seedTitle?: string;
    explanationMode?: ExplanationMode;
}

export interface BrainBotResponse {
    answer: string;
    conversationId: string;
}

/**
 * BrainBot AI Service
 * 
 * Provides conversational AI assistance for study materials.
 * Uses the Feynman explanation as context to answer user questions.
 */
export class BrainBotService {
    private conversationHistories: Map<string, ChatMessage[]> = new Map();

    /**
     * Ask BrainBot a question about the study material
     * 
     * @param question - User's question
     * @param context - Study material context (Feynman explanation)
     * @param conversationId - Optional conversation ID to maintain history
     * @returns AI-generated answer
     */
    async askQuestion(
        question: string,
        context: BrainBotContext,
        conversationId?: string,
    ): Promise<BrainBotResponse> {
        try {
            // Validate input
            if (!question || question.trim().length === 0) {
                throw new ServiceError(
                    "Question cannot be empty",
                    "brainBotService",
                    "EMPTY_QUESTION",
                    "Please ask a question",
                    false,
                );
            }

            if (!context.feynmanExplanation || context.feynmanExplanation.trim().length === 0) {
                throw new ServiceError(
                    "No study material context available",
                    "brainBotService",
                    "NO_CONTEXT",
                    "Study material content is not available",
                    false,
                );
            }

            // Generate or use existing conversation ID
            const convId = conversationId || this.generateConversationId();

            // Get conversation history
            const history = this.conversationHistories.get(convId) || [];

            // Build system prompt
            const systemPrompt = await this.buildSystemPrompt(context);

            // Build messages array with conversation history
            const messages = this.buildMessages(systemPrompt, question, history, context);

            // Get AI config with fallback for offline scenarios
            let aiConfig;
            try {
                aiConfig = await configService.getAIConfig("flashcards");
            } catch (error) {
                // Fallback configuration if backend is unavailable
                logger.warn("[BrainBot] Using fallback AI config due to:", error);
                aiConfig = {
                    model: "gpt-4o-mini",
                    timeoutMs: TIMEOUTS.DEFAULT_API,
                };
            }

            // Call OpenAI
            const answer = await chatCompletion({
                model: aiConfig.model, // gpt-4o-mini
                messages,
                temperature: 0.7, // Balanced for educational responses
                maxTokens: 1024, // Sufficient for chat responses
                cacheNamespace: "brainbot-chat",
                cacheKeyParts: [
                    context.feynmanExplanation.substring(0, 500),
                    question,
                ],
                cacheTtlMs: TIMEOUTS.AI_CACHE_DEFAULT_TTL,
                timeoutMs: aiConfig.timeoutMs,
            });

            // Update conversation history
            const userMessage: ChatMessage = {
                id: this.generateMessageId(),
                role: "user",
                content: question,
                timestamp: new Date(),
            };

            const assistantMessage: ChatMessage = {
                id: this.generateMessageId(),
                role: "assistant",
                content: answer,
                timestamp: new Date(),
            };

            const updatedHistory = [...history, userMessage, assistantMessage];
            this.conversationHistories.set(convId, updatedHistory);

            // Limit history to last 10 messages (5 exchanges) to avoid token limits
            if (updatedHistory.length > 10) {
                this.conversationHistories.set(convId, updatedHistory.slice(-10));
            }

            logger.info("[BrainBot] Question answered successfully", {
                conversationId: convId,
                questionLength: question.length,
                answerLength: answer.length,
                historyLength: updatedHistory.length,
            });

            return {
                answer,
                conversationId: convId,
            };
        } catch (error) {
            logger.error("[BrainBot] Error answering question:", error);

            if (error instanceof ServiceError) {
                throw error;
            }

            throw new ServiceError(
                "Failed to get answer from BrainBot",
                "brainBotService",
                "BRAINBOT_ERROR",
                "I'm having trouble answering right now. Please try again.",
                true,
                error instanceof Error ? error : undefined,
            );
        }
    }

    /**
     * Clear conversation history for a given conversation ID
     */
    clearConversation(conversationId: string): void {
        this.conversationHistories.delete(conversationId);
        logger.info("[BrainBot] Conversation cleared", { conversationId });
    }

    /**
     * Get conversation history
     */
    getConversationHistory(conversationId: string): ChatMessage[] {
        return this.conversationHistories.get(conversationId) || [];
    }

    private async buildSystemPrompt(context: BrainBotContext): Promise<string> {
        try {
            // Fetch system prompt from backend
            const systemPrompt = await getBrainBotQASystemPrompt();

            const titleContext = context.seedTitle
                ? `The study material is titled: "${context.seedTitle}"\n\n`
                : "";

            // Determine personality tone based on explanation mode
            const personalityTone = this.getPersonalityTone(context.explanationMode || "simple");

            // Combine system prompt with material context and personality instructions
            return `${systemPrompt}

${titleContext}Study Material:
${context.feynmanExplanation}

Personality Tone: ${personalityTone}`;
        } catch (error) {
            logger.error("[BrainBot] Error fetching Q&A prompts:", error);
            // Fallback to a basic system prompt if backend prompts unavailable
            return `You are Jordan, a knowledgeable and helpful study assistant.

Your role: Answer student questions about their study materials conversationally.
Your goal: Provide clear, accurate answers that help students understand the material.

Study Material:
${context.feynmanExplanation}

Output: Conversational answer text suitable for text-to-speech conversion.`;
        }
    }

    private getPersonalityTone(mode: ExplanationMode): string {
        switch (mode) {
            case "simple":
                return "Ultra-simple (ELI5). Explain like the student is 5 years old with extremely simple analogies.";

            case "analogy":
                return "Use analogies & examples. Connect concepts to unrelated fields with fresh mental models.";

            case "technical":
                return "Technical & formal. Use precise academic terminology and rigorous explanations.";

            case "fun":
                return "Fun & engaging. Use humor, pop culture references, and gamification.";

            default:
                return "Clear and conversational.";
        }
    }

    private buildMessages(
        systemPrompt: string,
        question: string,
        history: ChatMessage[],
        context: BrainBotContext,
    ): Array<{ role: "system" | "user" | "assistant"; content: string }> {
        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
            { role: "system", content: systemPrompt },
        ];

        // Add conversation history (excluding system messages)
        for (const msg of history) {
            messages.push({
                role: msg.role,
                content: msg.content,
            });
        }

        // Add current question
        messages.push({
            role: "user",
            content: question,
        });

        return messages;
    }

    private generateConversationId(): string {
        return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    private generateMessageId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Detect if user message indicates stress or confusion
     */
    detectStress(message: string): boolean {
        const stressKeywords = [
            "stressed", "stress", "confused", "confusing", "don't understand",
            "dont understand", "hard", "difficult", "struggling", "lost",
            "help", "can't get", "cant get", "not making sense", "frustrated"
        ];

        const lowerMessage = message.toLowerCase();
        return stressKeywords.some(keyword => lowerMessage.includes(keyword));
    }

    /**
     * Generate full podcast with audio using ElevenLabs
     * Caches audio segments in Supabase for reuse
     */
    async generatePodcastWithAudio(
        materialId: string,
        content: string,
        onSegmentGenerated?: (segment: { speaker: 'Alex' | 'Jordan'; url: string; text: string }) => void
    ): Promise<{ script: Array<{ speaker: 'Alex' | 'Jordan'; text: string; audioUrl: string }>; duration: number }> {
        try {
            logger.info('[BrainBot] Generating podcast with audio:', { materialId });

            // Check cache first
            const cached = await this.getCachedPodcast(materialId);
            if (cached) {
                logger.info('[BrainBot] Using cached podcast');
                // Don't use streaming callback for cached data - just return it
                return cached;
            }

            // Generate script
            const scriptLines = await this.generatePodcastScript(content, 'supportive');

            // Generate audio for each line
            const scriptWithAudio: Array<{ speaker: 'Alex' | 'Jordan'; text: string; audioUrl: string }> = [];
            let totalDuration = 0;

            for (const line of scriptLines) {
                const voiceId = line.speaker === 'Alex'
                    ? BRAINBOT_VOICES.host1VoiceId
                    : BRAINBOT_VOICES.host2VoiceId;

                // Generate audio
                const audioUrl = await elevenLabsService.textToSpeech({
                    text: line.text,
                    voice_id: voiceId,
                });

                const segment = {
                    speaker: line.speaker,
                    text: line.text,
                    audioUrl,
                };

                scriptWithAudio.push(segment);

                // Estimate duration (~150 words per minute)
                const wordCount = line.text.split(' ').length;
                totalDuration += Math.ceil((wordCount / 150) * 60);

                // Stream segment if callback provided
                if (onSegmentGenerated) {
                    onSegmentGenerated({
                        speaker: segment.speaker,
                        url: segment.audioUrl,
                        text: segment.text,
                    });
                }
            }

            const result = { script: scriptWithAudio, duration: totalDuration };

            // Cache the podcast
            await this.cachePodcast(materialId, result);

            return result;
        } catch (error: any) {
            logger.error('[BrainBot] Error generating podcast with audio:', error);
            throw new ServiceError(
                'Failed to generate podcast audio',
                'brainBotService',
                'PODCAST_AUDIO_FAILED',
                error.message,
                true
            );
        }
    }

    /**
     * Cache podcast in database
     */
    private async cachePodcast(
        materialId: string,
        podcast: { script: Array<{ speaker: 'Alex' | 'Jordan'; text: string; audioUrl: string }>; duration: number }
    ): Promise<void> {
        try {
            const supabase = getSupabaseClient();

            // Convert script array to iOS format for compatibility
            const audioSegments = podcast.script.map(s => `${s.speaker}::${s.audioUrl}`).join('|||');
            const scriptText = podcast.script.map(s => `${s.speaker}: ${s.text}`).join('\n');

            const { error } = await supabase
                .from('brainbot_podcasts')
                .upsert({
                    material_id: materialId,
                    personality_id: 'supportive', // Default personality
                    audio_url: audioSegments,
                    script: scriptText,
                    duration: podcast.duration,
                    created_at: new Date().toISOString(),
                } as any, {
                    onConflict: 'material_id,personality_id' // Composite key matching iOS
                });

            if (error) {
                logger.error('[BrainBot] Error caching podcast:', error);
            }
        } catch (error) {
            logger.error('[BrainBot] Error caching podcast:', error);
        }
    }

    /**
     * Get cached podcast
     */
    private async getCachedPodcast(
        materialId: string
    ): Promise<{ script: Array<{ speaker: 'Alex' | 'Jordan'; text: string; audioUrl: string }>; duration: number } | null> {
        try {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase
                .from('brainbot_podcasts')
                .select('*')
                .eq('material_id', materialId)
                .maybeSingle();

            if (error || !data) return null;

            // Handle iOS format: audio_url contains "Speaker::URL|||Speaker::URL"
            // and script is plain text "Alex: text\nJordan: text"
            if ((data as any).audio_url && typeof (data as any).audio_url === 'string') {
                const audioSegments = (data as any).audio_url.split('|||');
                const scriptLines = ((data as any).script || '').split('\n').filter((line: string) => line.trim());

                const script: Array<{ speaker: 'Alex' | 'Jordan'; text: string; audioUrl: string }> = [];

                for (let i = 0; i < audioSegments.length; i++) {
                    const [speaker, url] = audioSegments[i].split('::');
                    const scriptLine = scriptLines[i] || '';
                    const match = scriptLine.match(/^(Alex|Jordan):\s*(.+)$/);
                    const text = match ? match[2] : scriptLine;

                    script.push({
                        speaker: speaker as 'Alex' | 'Jordan',
                        text,
                        audioUrl: url,
                    });
                }

                return {
                    script,
                    duration: (data as any).duration || 0,
                };
            }

            // Handle new format: script is JSON array
            try {
                return {
                    script: JSON.parse((data as any).script),
                    duration: (data as any).duration,
                };
            } catch (parseError) {
                logger.error('[BrainBot] Error parsing cached script:', parseError);
                return null;
            }
        } catch (error) {
            logger.error('[BrainBot] Error fetching cached podcast:', error);
            return null;
        }
    }

    /**
     * Generate a podcast-style script for study material
     * Creates a supportive conversation between two hosts: Alex and Jordan
     * 
     * @param content - The educational content to discuss
     * @param personality - Podcast personality (supportive, hype, zen, professor)
     */
    async generatePodcastScript(
        content: string,
        personality: 'supportive' | 'hype' | 'zen' | 'professor' = 'supportive'
    ): Promise<Array<{ speaker: 'Alex' | 'Jordan'; text: string }>> {
        try {
            // Get BrainBot config from backend
            const config = await configService.getAIConfig('brainbot');

            // Fetch prompts from backend
            const systemPrompt = await getBrainBotPodcastSystemPrompt();
            const userTemplate = await getBrainBotPodcastUserTemplate();

            // Render user template with content
            const userPrompt = renderPromptTemplate(userTemplate, {
                content
            });

            const response = await chatCompletion({
                model: config.model,
                systemPrompt,
                userPrompt,
                temperature: config.temperature,
                timeoutMs: config.timeoutMs,
            });

            // Parse response - iOS expects plain text format: "Alex: text\nJordan: text"
            // NOT JSON! The backend prompt returns text format.
            const scriptText = response.trim();
            let script: Array<{ speaker: 'Alex' | 'Jordan'; text: string }>;

            // Try text-based parsing first (matching iOS lines 149-170)
            const lines = scriptText.split('\n').filter(line => line.trim());
            const parsedLines: Array<{ speaker: 'Alex' | 'Jordan'; text: string }> = [];

            for (const line of lines) {
                // Match both "Alex:" and "**Alex:**" formats (matching iOS regex)
                const match = line.match(/^\*?\*?(Alex|Jordan)\*?\*?:\s*(.+)$/);
                if (!match) {
                    // Skip stage directions and non-dialogue lines
                    if (!line.includes('[') && !line.includes('**[')) {
                        logger.warn('[BrainBotService] Line did not match pattern:', line.substring(0, 100));
                    }
                    continue;
                }

                const [, speaker, rawText] = match;

                // Remove any bracketed stage directions e.g. [laughs]
                const text = rawText.replace(/\[.*?\]/g, '').trim();

                if (!text) continue;

                parsedLines.push({
                    speaker: speaker as 'Alex' | 'Jordan',
                    text
                });
            }

            if (parsedLines.length > 0) {
                script = parsedLines;
                logger.info('[BrainBotService] Successfully parsed text-based script (iOS format):', {
                    lineCount: script.length
                });
            } else {
                // Fallback: Try JSON parsing (for backward compatibility)
                logger.warn('[BrainBotService] No text lines found, trying JSON fallback...');

                try {
                    // Try to parse as JSON
                    script = JSON.parse(scriptText);
                } catch (parseError) {
                    // Fallback 1: Extract JSON from markdown code blocks
                    const jsonMatch = scriptText.match(/```(?:json)?\s*([\s\S]*?)```/);
                    if (jsonMatch) {
                        try {
                            script = JSON.parse(jsonMatch[1].trim());
                            logger.info('[BrainBotService] Successfully parsed JSON from markdown code block');
                        } catch (e) {
                            logger.error('[BrainBotService] Failed to parse JSON from code block:', {
                                extracted: jsonMatch[1].substring(0, 200)
                            });
                            throw new Error(`Failed to parse podcast script: ${e instanceof Error ? e.message : 'Unknown error'}`);
                        }
                    } else {
                        // Fallback 2: Try to find JSON array in the response
                        const arrayMatch = scriptText.match(/\[[\s\S]*\]/);
                        if (arrayMatch) {
                            try {
                                script = JSON.parse(arrayMatch[0]);
                                logger.info('[BrainBotService] Successfully parsed JSON array from response');
                            } catch (e) {
                                logger.error('[BrainBotService] Failed to parse extracted array:', {
                                    extracted: arrayMatch[0].substring(0, 200)
                                });
                                throw new Error(`Failed to parse podcast script: ${e instanceof Error ? e.message : 'Unknown error'}`);
                            }
                        } else {
                            // Log the full response for debugging
                            logger.error('[BrainBotService] No valid format found in response:', {
                                responsePreview: scriptText.substring(0, 500),
                                responseLength: scriptText.length,
                                parseError: parseError instanceof Error ? parseError.message : 'Unknown error'
                            });
                            throw new Error('Failed to parse podcast script - expected text format (Alex: text) or JSON array');
                        }
                    }
                }
            }

            // Validate script format
            if (!Array.isArray(script) || script.length === 0) {
                logger.error('[BrainBotService] Invalid script format:', { script });
                throw new Error('Invalid podcast script format - expected non-empty array');
            }

            // Validate each script item
            for (let i = 0; i < script.length; i++) {
                const item = script[i];
                if (!item.speaker || !item.text) {
                    logger.error('[BrainBotService] Invalid script item at index', i, ':', item);
                    throw new Error(`Invalid script item at index ${i} - missing speaker or text`);
                }
                if (item.speaker !== 'Alex' && item.speaker !== 'Jordan') {
                    logger.error('[BrainBotService] Invalid speaker at index', i, ':', item.speaker);
                    throw new Error(`Invalid speaker at index ${i} - expected 'Alex' or 'Jordan', got '${item.speaker}'`);
                }
            }

            logger.info('[BrainBotService] Generated podcast script:', {
                lineCount: script.length,
                personality,
            });

            return script;
        } catch (error: any) {
            logger.error('[BrainBotService] Error generating podcast script:', error);
            throw new ServiceError(
                'Failed to generate podcast script',
                'brainBotService',
                'PODCAST_GENERATION_FAILED',
                error.message,
                true
            );
        }
    }
}

export const brainBotService = new BrainBotService();
