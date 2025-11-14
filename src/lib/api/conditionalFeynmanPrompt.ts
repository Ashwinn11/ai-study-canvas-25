/**
 * Single-Call Conditional Feynman Prompt
 * Matches iOS conditionalFeynmanPrompt.ts implementation
 *
 * Prompts are centrally managed by the backend. This module simply retrieves
 * the configured templates and fills in runtime variables.
 */

import { configService } from './configService';
import { getFeynmanUserTemplate, renderPromptTemplate } from './prompts';

/**
 * Get conditional system prompt from backend config
 * Matching iOS lines 11-17
 */
export async function getConditionalSystemPrompt(): Promise<string> {
  const prompts = await configService.getPrompts();
  if (!prompts?.conditionalSystemPrompt) {
    throw new Error('Missing backend conditionalSystemPrompt');
  }
  return prompts.conditionalSystemPrompt;
}

/**
 * Build conditional prompt with content and language instruction
 * Matching iOS lines 19-58
 */
export async function buildConditionalPrompt(
  content: string,
  title?: string,
  language?: string
): Promise<string> {
  let languageInstruction = '';

  if (language) {
    const upper = language.toUpperCase();
    languageInstruction = `
CRITICAL LANGUAGE INSTRUCTION:
The source content is in ${upper}.
Generate ALL study materials (explanations, key concepts, analogies, questions) in ${upper}.
Maintain language consistency throughout all generated content.

IMPORTANT: If the content contains technical terms, code, or formulas in another language (e.g., English code in Spanish text):
- PRESERVE those technical terms in their original language
- DO NOT translate programming terms, function names, or code
- For mixed-language content: Use ${upper} for explanations, preserve other language terms naturally
`;
  } else {
    languageInstruction = `
LANGUAGE INSTRUCTION:
Generate all content in the SAME LANGUAGE as the source material provided.
Maintain language consistency throughout.
`;
  }

  const titleBlock = title
    ? `TITLE: "${title}"
`
    : '';

  const template = await getFeynmanUserTemplate();

  return renderPromptTemplate(template, {
    language_instruction: languageInstruction,
    title_block: titleBlock,
    content,
  });
}
