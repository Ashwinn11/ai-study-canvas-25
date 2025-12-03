'use client';

import { useState, useCallback } from 'react';
import { chatCompletion } from '@/lib/api/openAIClient';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface UseChatOptions {
  seedContent?: string;
  seedTitle?: string;
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      setError(null);

      // Add user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // Build conversation history
        const conversationHistory = messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        // Build system prompt
        let systemPrompt =
          'You are an AI tutor helping a student learn. Provide clear, concise explanations and ask clarifying questions when needed.';

        if (options.seedTitle || options.seedContent) {
          systemPrompt = `You are an AI tutor helping a student understand their study material. ${
            options.seedTitle ? `The topic is "${options.seedTitle}". ` : ''
          }${options.seedContent ? `Context: ${options.seedContent.substring(0, 500)}...` : ''}`;
        }

        // Get AI response using the chatCompletion function
        const assistantContent = await chatCompletion({
          model: 'gpt-4-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: content.trim() },
          ],
          temperature: 0.7,
          maxTokens: 500,
        });

        if (!assistantContent) {
          throw new Error('No response from AI');
        }

        // Add assistant message
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: assistantContent,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        console.error('[useChat] Error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, options]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
}
