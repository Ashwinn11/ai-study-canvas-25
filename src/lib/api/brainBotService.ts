import { ServiceError } from "./serviceError";
import { chatCompletion } from "./openAIClient";
import { configService } from "./configService";
import { TIMEOUTS } from "@/constants/config";
import { logger } from "@/utils/logger";

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
}

export const brainBotService = new BrainBotService();
