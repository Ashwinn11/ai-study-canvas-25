/**
 * Prompt Template Utilities
 * Matches iOS prompts.ts implementation
 */

import { configService } from './configService';

function ensurePromptValue(value: string | undefined, key: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing prompt value for ${key}`);
  }
  return value;
}

/**
 * Render prompt template with variables
 * Matching iOS lines 10-20
 */
export function renderPromptTemplate(
  template: string,
  variables: Record<string, string | undefined>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, value ?? '');
  }
  return result;
}

/**
 * Get flashcards system prompt
 * Matching iOS lines 22-28
 */
export async function getReturnOnlyJsonFlashcards(): Promise<string> {
  const prompts = await configService.getPrompts();
  return ensurePromptValue(prompts.flashcardsSystemPrompt, 'flashcardsSystemPrompt');
}

/**
 * Get quiz system prompt
 * Matching iOS lines 30-33
 */
export async function getReturnOnlyJsonQuiz(): Promise<string> {
  const prompts = await configService.getPrompts();
  return ensurePromptValue(prompts.quizSystemPrompt, 'quizSystemPrompt');
}

/**
 * Get Feynman user template
 * Matching iOS lines 35-38
 */
export async function getFeynmanUserTemplate(): Promise<string> {
  const prompts = await configService.getPrompts();
  return ensurePromptValue(prompts.feynmanUserTemplate, 'feynmanUserTemplate');
}

/**
 * Get flashcards user template for specific intent
 * Matching iOS lines 40-57
 */
export async function getFlashcardsUserTemplate(
  intent?: 'Educational' | 'Comprehension' | 'Reference' | 'Analytical' | 'Procedural'
): Promise<string> {
  const prompts = await configService.getPrompts();

  // Default to Educational if no intent provided
  const selectedIntent = intent || 'Educational';

  const templateKey = `flashcardsUserTemplate_${selectedIntent}` as keyof typeof prompts;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const intentTemplate = (prompts as any)[templateKey];

  if (intentTemplate) {
    return ensurePromptValue(intentTemplate, templateKey);
  }

  // If intent-specific template not found, throw error
  throw new Error(`Flashcard template for intent '${selectedIntent}' not found in configuration`);
}

/**
 * Get quiz user template for specific intent
 * Matching iOS lines 59-76
 */
export async function getQuizUserTemplate(
  intent?: 'Educational' | 'Comprehension' | 'Reference' | 'Analytical' | 'Procedural'
): Promise<string> {
  const prompts = await configService.getPrompts();

  // Default to Educational if no intent provided
  const selectedIntent = intent || 'Educational';

  const templateKey = `quizUserTemplate_${selectedIntent}` as keyof typeof prompts;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const intentTemplate = (prompts as any)[templateKey];

  if (intentTemplate) {
    return ensurePromptValue(intentTemplate, templateKey);
  }

  // If intent-specific template not found, throw error
  throw new Error(`Quiz template for intent '${selectedIntent}' not found in configuration`);
}
