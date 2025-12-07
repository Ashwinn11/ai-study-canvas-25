import { ServiceError } from "./serviceError";
import { chatCompletion } from "./openAIClient";
import { configService } from "./configService";
import { TIMEOUTS } from "@/constants/config";
import { logger } from "@/utils/logger";
import { elevenLabsService } from "./elevenLabsService";
import { getSupabaseClient } from "@/lib/supabase/client";
import { BRAINBOT_VOICES } from "@/config/brainbotVoices";

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
            const systemPrompt = this.buildSystemPrompt(context);

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

    private buildSystemPrompt(context: BrainBotContext): string {
        const titleContext = context.seedTitle
            ? `The study material is titled: "${context.seedTitle}"\n\n`
            : "";

        // Mode-specific instructions
        const modeInstructions = this.getModeInstructions(context.explanationMode || "simple");

        return `You are BrainBot, a friendly and helpful AI study assistant. Your role is to help students understand their study materials better.

${titleContext}You have access to the following study notes (Feynman explanation) that the student is learning.
IMPORTANT: These notes are already a simplified explanation of the original source material.

---
${context.feynmanExplanation}
---

${modeInstructions}

General Guidelines:
- Answer questions based on the study notes provided above
- If asked about something not in the study notes, politely say you can only help with the current material
- Encourage learning by asking follow-up questions when appropriate
- Be friendly and supportive - you're here to help students succeed!
- Format your responses using markdown for better readability (use **bold**, *italic*, lists, etc.)

Remember: Your goal is to help the student understand and master this material.`;
    }

    private getModeInstructions(mode: ExplanationMode): string {
        switch (mode) {
            case "simple":
                return `**Explanation Style: Ultra-Simple (ELI5)**
- The provided notes might still be too complex. Simplify them FURTHER.
- Explain like the student is 5 years old.
- Use extremely simple analogies (e.g., "Imagine a pizza...").
- Avoid ALL jargon. If a technical term is necessary, define it using everyday words first.
- Short, punchy sentences.`;

            case "analogy":
                return `**Explanation Style: Analogies & Examples**
- The notes might already use analogies. Try to provide *different* or *fresh* ones.
- Connect concepts to completely unrelated fields (e.g., explaining coding using cooking).
- Focus on the "mental model" - how should the student picture this in their head?
- Use "It's like when..." phrasing.`;

            case "technical":
                return `**Explanation Style: Technical & Formal**
- The provided notes are simplified. Your job is to *re-formalize* them where appropriate.
- Use precise academic terminology and definitions.
- If the notes gloss over a technical detail for simplicity, bring it back (if you can infer it safely).
- Structure your answer like a textbook or technical documentation.
- Focus on rigor, precision, and the "why" behind the mechanics.`;

            case "fun":
                return `**Explanation Style: Fun & Engaging**
- The notes are educational; you are the "fun study buddy".
- Use humor, pop culture references, or light sarcasm (friendly).
- Gamify the explanation (e.g., "Level 1: The Basics").
- Use emojis to break up text (but don't overdo it).
- Make the student smile while they learn.`;

            default:
                return "";
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
            const scriptLines = await this.generatePodcastScript(content, 'viral');

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
                    personality_id: 'viral', // Default personality
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
     * Creates a viral-style conversation between two hosts: Alex and Jordan
     * 
     * @param content - Study material content (Feynman explanation)
     * @param personality - Podcast personality (viral, chill, academic)
     * @returns Array of script lines with speaker attribution
     */
    async generatePodcastScript(
        content: string,
        personality: 'viral' | 'chill' | 'academic' = 'viral'
    ): Promise<Array<{ speaker: 'Alex' | 'Jordan'; text: string }>> {
        try {
            // Get BrainBot config from backend
            const config = await configService.getAIConfig('brainbot');

            const personalityPrompts = {
                viral: `You're creating a VIRAL podcast that Gen Z would share with friends. High energy, lots of "no cap", "fr", "lowkey", "highkey". Make it feel like two best friends geeking out.`,
                chill: `You're creating a chill, laid-back podcast. Conversational and friendly, like study buddies chatting over coffee.`,
                academic: `You're creating an educational podcast. Professional but engaging, like two professors making complex topics accessible.`
            };

            const systemPrompt = `You are a podcast script writer creating a dual-host educational podcast.

HOSTS:
- Alex: Enthusiastic, asks great questions, represents the learner. Uses Gen Z slang naturally.
- Jordan: Knowledgeable, explains concepts clearly, breaks things down. Also uses Gen Z slang.

STYLE: ${personalityPrompts[personality]}

CRITICAL RULES:
1. Express emotions PHONETICALLY, not literally:
   - GOOD: "Yooo that's wild" or "Haha yeah exactly"
   - BAD: "*laughs*" or "[excited]" or "(sighs)"
2. Use Gen Z slang naturally: "no cap", "fr" (for real), "lowkey", "highkey", "that's fire", "cooking"
3. Keep each line SHORT (1-2 sentences max) for natural conversation flow
4. Make it ENGAGING - use questions, reactions, build-ups
5. Break down complex topics into digestible chunks
6. Each speaker should have distinct personality

FORMAT: Return ONLY a JSON array of objects with "speaker" ("Alex" or "Jordan") and "text" fields.
Example: [{"speaker":"Alex","text":"Yo Jordan, you gotta explain this one"},{"speaker":"Jordan","text":"Bet, so basically..."}]`;

            const userPrompt = `Create a 2-3 minute podcast script (about 15-20 exchanges) about this topic:

${content}

Make it viral-worthy and engaging. Start with Alex asking Jordan to explain the topic.`;

            const response = await chatCompletion({
                model: config.model,
                systemPrompt,
                userPrompt,
                temperature: config.temperature,
                timeoutMs: config.timeoutMs,
            });

            // Parse JSON response
            const scriptText = response.trim();
            let script: Array<{ speaker: 'Alex' | 'Jordan'; text: string }>;

            try {
                // Try to parse as JSON
                script = JSON.parse(scriptText);
            } catch (parseError) {
                // Fallback: extract JSON from markdown code blocks
                const jsonMatch = scriptText.match(/```(?:json)?\s*([\s\S]*?)```/);
                if (jsonMatch) {
                    script = JSON.parse(jsonMatch[1]);
                } else {
                    throw new Error('Failed to parse podcast script JSON');
                }
            }

            // Validate script format
            if (!Array.isArray(script) || script.length === 0) {
                throw new Error('Invalid podcast script format');
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
