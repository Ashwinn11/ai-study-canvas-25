'use client';

import { useState, useCallback } from 'react';
import { brainBotService, ExplanationMode } from '@/lib/api/brainBotService';
import { ServiceError } from '@/lib/api/serviceError';

export type { ExplanationMode };

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface UseChatOptions {
  seedContent?: string;
  seedTitle?: string;
  explanationMode?: ExplanationMode;
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      setError(null);

      // Add user message
      const trimmedContent = content.trim();
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmedContent,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const { answer, conversationId: nextConversationId } = await brainBotService.askQuestion(
          trimmedContent,
          {
            feynmanExplanation: options.seedContent ?? '',
            seedTitle: options.seedTitle,
            explanationMode: options.explanationMode,
          },
          conversationId ?? undefined,
        );

        setConversationId(nextConversationId);

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: answer,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        let errorMessage = 'Failed to send message';

        if (err instanceof ServiceError) {
          errorMessage = err.getUserMessage();
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }

        setError(errorMessage);
        console.error('[useChat] Error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, options.seedContent, options.seedTitle, options.explanationMode]
  );

  const clearMessages = useCallback(() => {
    if (conversationId) {
      brainBotService.clearConversation(conversationId);
    }

    setConversationId(null);
    setMessages([]);
    setError(null);
  }, [conversationId]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
}
