/**
 * Centralized Prompt Management Service
 *
 * Provides in-memory storage and template rendering for all system prompts.
 * Supports variable substitution using {{variable}} syntax.
 * Includes caching for performance optimization.
 * 
 * Migrated from backend-source/promptService.js for Edge Functions
 */

// ═══════════════════════════════════════════════════════════════════════
// SYSTEM PROMPTS - Define Role and Output Format
// ═══════════════════════════════════════════════════════════════════════

// System prompt for flashcards - clear role + output requirements
const flashcardsSystemPrompt = `You create flashcards for active recall learning.

Output must be valid JSON matching this schema:
{"flashcards": [{"question": string, "answer": string, "difficulty": number}]}

Requirements:
- difficulty: 1 (easy), 2 (medium), or 3 (hard)
- Return only the JSON object, nothing else`;

// System prompt for quiz - clear role + output requirements
const quizSystemPrompt = `You create multiple-choice quiz questions for assessment.

Output must be valid JSON matching this schema:
{"questions": [{"question": string, "options": [4 strings], "correct_answer": number, "difficulty": number}]}

Requirements:
- correct_answer: 0-3 (index of correct option)
- exactly 4 options per question
- difficulty: 1 (easy), 2 (medium), or 3 (hard)
- Return only the JSON object, nothing else`;

// System prompt for study guides (notes) - intent-based
const notesSystemPrompt: Record<string, string> = {
    Educational: `You create comprehensive study guides for learning educational content.

Your role: Explain concepts thoroughly with reasoning and practical applications.
Your goal: Help students achieve deep understanding through detailed explanations.

Format: Mobile-friendly markdown with ## headers, plain text formulas (no LaTeX), single blank lines between sections.`,

    Comprehension: `You create comprehensive study guides for understanding information.

Your role: Organize information clearly, highlighting what matters most.
Your goal: Help readers understand key points, context, and implications.

Format: Mobile-friendly markdown with clear sections, plain language, single blank lines.`,

    Reference: `You create comprehensive reference guides for quick lookup.

Your role: Organize information by category for easy navigation.
Your goal: Structure content so readers can find information quickly.

Format: Mobile-friendly markdown organized by topic, plain text formulas with Unicode symbols (∫, √, π, ≈, →), single blank lines.`,

    Analytical: `You create comprehensive study guides for analytical content.

Your role: Help readers understand deeper meaning, themes, and context.
Your goal: Provide thorough analysis connecting concepts to real-world implications.

Format: Mobile-friendly markdown with ## headers, clear sections, single blank lines.`,

    Procedural: `You create comprehensive guides for procedural content.

Your role: Explain processes clearly with reasoning for each step.
Your goal: Help readers understand what to do and why each step matters.

Format: Mobile-friendly markdown with numbered steps, clear explanations, single blank lines.`
};

// ═══════════════════════════════════════════════════════════════════════
// USER TEMPLATES - Task Instructions
// ═══════════════════════════════════════════════════════════════════════

// Feynman user template - creates in-depth study guides
const feynmanUserTemplate = `{{language_instruction}}

CONTENT TO PROCESS:
{{title_block}}{{content}}

STEP 1 - DETECT INTENT:
Determine which category best fits the content:
- Educational: Teaches concepts, learning objectives, explains how/why
- Comprehension: News, articles, factual information to understand
- Reference: Lists, formulas, lookup tables, technical references
- Analytical: Themes, interpretations, deeper meaning, critique
- Procedural: Instructions, steps, how-to guides, processes

If multiple apply, prioritize: Educational > Procedural > Analytical > Comprehension > Reference

Output the intent on the first line:
INTENT: [Educational|Comprehension|Reference|Analytical|Procedural]

Then add one blank line and start your content.

STEP 2 - CREATE IN-DEPTH STUDY GUIDE:
Create comprehensive, detailed notes for learning this material.

Core principle: Include ALL important information from the content. This is for passive learning - provide thorough, in-depth coverage.

Content approach:
- Explain concepts fully with necessary detail and reasoning
- Include all significant information, examples, and context
- Remove only: promotional content, author bios, obvious filler phrases
- Express ideas clearly and precisely without unnecessary elaboration

Structure by intent:

EDUCATIONAL:
- Use headers based on content: Overview, Key Concepts, Important Details, Practical Applications, Why This Matters, etc.
- Explain concepts thoroughly with reasoning
- Include examples that illustrate understanding
- Add custom headers for unique content

COMPREHENSION:
- Use headers based on content: Overview, Key Points, Summary, Action Items, Key Takeaway, Important Dates, etc.
- Present information clearly and directly
- Highlight urgency, deadlines, implications
- Add custom headers for unique content

REFERENCE:
- Organize by logical categories from the content
- Group related items under topic headers
- Use plain text formulas: dy/dx, ∫ x dx, limit as x → ∞
- Keep entries focused but complete

ANALYTICAL:
- Use headers based on content: Context & Overview, Summary, Key Themes & Analysis, Why It Matters, Real-World Connections, etc.
- Provide thorough analysis with textual evidence
- Explore themes and significance in depth
- Add custom headers for unique content

PROCEDURAL:
- Use headers based on content: Overview, What You'll Need, Main Steps, Why It Works, Tips & Common Issues, Variations, etc.
- For each step: explain the action and why it matters
- Include practical tips, troubleshooting, best practices
- Add custom headers for unique content (Nutritional Info, Substitutions, Storage, etc.)

Technical requirements:
- Mobile-friendly markdown: ## for sections, ### for subsections
- No LaTeX: use plain text (dy/dx, not \\frac{dy}{dx})
- Unicode symbols where helpful: ∫, √, π, ≈, →
- Single blank line between sections
- Bold (**) for key terms only
- Code blocks for code only
- Start with # [Title]
- Return only markdown content`;

// ═══════════════════════════════════════════════════════════════════════
// FLASHCARD TEMPLATES - Active Recall with Concise Answers
// ═══════════════════════════════════════════════════════════════════════

const flashcardIntentGuidelines: Record<string, string> = {
    Educational: `Question approach for educational content:
- Test how concepts work mechanistically
- Apply knowledge to new situations
- Explain cause-effect relationships
- Compare and contrast related concepts
- Solve problems using learned principles

Focus on deep understanding through application and reasoning.`,

    Comprehension: `Question approach for comprehension content:
- Test retention of critical facts
- Verify understanding of key details
- Check awareness of deadlines, timelines, action items
- Confirm understanding of why information matters`,

    Reference: `Question approach for reference content:
- Test formula and definition recall
- Verify practical application knowledge
- Check when to use specific references
- Test scenario recognition for correct formula/concept`,

    Analytical: `Question approach for analytical content:
- Test understanding of themes and significance
- Verify interpretation of deeper meaning
- Check understanding of theme connections
- Test awareness of real-world implications`,

    Procedural: `Question approach for procedural content:
- Test understanding of why steps matter
- Verify knowledge of consequences for skipping steps
- Check troubleshooting and problem-solving
- Test decision-making (when to use which approach)
- Verify understanding of principles behind techniques`
};

function buildFlashcardTemplate(intentGuidelines: string): string {
    return `{{language_instruction}}

Generate {{min_quantity}}-{{max_quantity}} flashcards for active recall practice.

Content intent: {{intent}}

CONTENT TO ANALYZE:
{{content}}

COVERAGE:
Create flashcards testing the most important concepts from the content.

${intentGuidelines}

FLASHCARD DESIGN:

Question Quality:
- Focus on understanding, application, and reasoning
- Avoid simple recognition: "What is X?" (use sparingly, only for essential terms)
- Prefer: "Explain how...", "Why does...", "What happens if...", "How would you..."
- Each card tests one distinct concept
- Questions should challenge comprehension, not just memorization

Answer Requirements:
- Keep answers SHORT and FOCUSED for effective active recall
- Definitions: 1 sentence maximum
- Explanations: 2-3 sentences maximum, covering key reasoning
- If a concept needs more explanation, create multiple focused flashcards instead of one long answer
- Include essential reasoning but stay concise

Difficulty levels:
- Easy (1): Direct recall with brief explanation
- Medium (2): Application or understanding, moderate reasoning
- Hard (3): Analysis, evaluation, synthesis of concepts

Return JSON:
{
  "flashcards": [
    {
      "question": "Clear question testing understanding",
      "answer": "Concise answer with key reasoning (1-3 sentences)",
      "difficulty": 2
    }
  ]
}`;
}

// ═══════════════════════════════════════════════════════════════════════
// QUIZ TEMPLATES - Multiple Choice Assessment
// ═══════════════════════════════════════════════════════════════════════

const quizIntentGuidelines: Record<string, string> = {
    Educational: `Question approach for educational content:
- Test how concepts work through realistic scenarios
- Assess application in new contexts
- Examine understanding of relationships and cause-effect
- Verify knowledge of why concepts matter

Design distractors based on common misconceptions:
- Partial understanding (knows part but overgeneralizes)
- Common errors (documented student mistakes)
- Related concepts applied incorrectly
- Reversed logic (correct concept but backwards)`,

    Comprehension: `Question approach for comprehension content:
- Test retention of critical facts and details
- Verify understanding of deadlines, timelines, action items
- Check awareness of context and implications
- Test knowledge of what actions should be taken`,

    Reference: `Question approach for reference content:
- Test formula and concept recall
- Verify knowledge of when to apply specific references
- Check practical application understanding
- Test scenario-based decision making`,

    Analytical: `Question approach for analytical content:
- Test understanding of major themes
- Verify interpretation of significance
- Check knowledge of theme relationships
- Test awareness of deeper meaning and implications`,

    Procedural: `Question approach for procedural content:
- Test understanding of consequences (what happens if step skipped)
- Verify troubleshooting knowledge
- Check understanding of principles behind techniques
- Test decision-making between approaches
- Verify knowledge of best practices and timing`
};

function buildQuizTemplate(intentGuidelines: string): string {
    return `{{language_instruction}}

Generate {{min_quantity}}-{{max_quantity}} multiple-choice questions for assessment.

Content intent: {{intent}}

CONTENT TO ANALYZE:
{{content}}

COVERAGE:
Create quiz questions testing important concepts from the content.

${intentGuidelines}

QUIZ DESIGN:

Question Quality:
- Test genuine understanding, not pattern recognition
- Present realistic scenarios where appropriate
- Require knowledge of concepts to identify correct answer

Distractor Design (Wrong Answers):
- Each distractor should represent a plausible misconception
- Wrong answers should seem reasonable to someone who partially understands
- Avoid obviously incorrect or nonsensical options
- Base distractors on common misunderstandings or confusion with related concepts

Option Requirements:
- Exactly 4 options per question, only 1 correct
- All options similar length and grammatical structure
- All options plausible to someone who studied but didn't fully master material

Difficulty levels:
- Easy (1): Straightforward if concept understood
- Medium (2): Requires application with plausible distractors
- Hard (3): Requires deep understanding to eliminate misconceptions

Return JSON:
{
  "questions": [
    {
      "question": "Clear specific question",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 1,
      "difficulty": 2
    }
  ]
}`;
}

// ═══════════════════════════════════════════════════════════════════════
// PROMPT REGISTRY
// ═══════════════════════════════════════════════════════════════════════

interface PromptDefinition {
    template: string;
    variables: string[];
    default: string;
}

const prompts: Record<string, PromptDefinition> = {
    // System prompts for notes (intent-based)
    educationalSystemPrompt: {
        template: notesSystemPrompt.Educational,
        variables: [],
        default: notesSystemPrompt.Educational,
    },
    comprehensionSystemPrompt: {
        template: notesSystemPrompt.Comprehension,
        variables: [],
        default: notesSystemPrompt.Comprehension,
    },
    referenceSystemPrompt: {
        template: notesSystemPrompt.Reference,
        variables: [],
        default: notesSystemPrompt.Reference,
    },
    analyticalSystemPrompt: {
        template: notesSystemPrompt.Analytical,
        variables: [],
        default: notesSystemPrompt.Analytical,
    },
    proceduralSystemPrompt: {
        template: notesSystemPrompt.Procedural,
        variables: [],
        default: notesSystemPrompt.Procedural,
    },

    // Generic system prompt for notes (uses intent detection in user template)
    feynman: {
        template: notesSystemPrompt.Educational, // Default to educational
        variables: [],
        default: notesSystemPrompt.Educational,
    },

    // User template for notes
    feynmanUserTemplate: {
        template: feynmanUserTemplate,
        variables: ["language_instruction", "title_block", "content"],
        default: feynmanUserTemplate,
    },

    // System prompts for flashcards and quiz
    flashcards: {
        template: flashcardsSystemPrompt,
        variables: [],
        default: flashcardsSystemPrompt,
    },
    quiz: {
        template: quizSystemPrompt,
        variables: [],
        default: quizSystemPrompt,
    },

    // Flashcard user templates (intent-based)
    flashcardsUserTemplate_Educational: {
        template: buildFlashcardTemplate(flashcardIntentGuidelines.Educational),
        variables: ["language_instruction", "intent", "content", "min_quantity", "max_quantity"],
        default: buildFlashcardTemplate(flashcardIntentGuidelines.Educational),
    },
    flashcardsUserTemplate_Comprehension: {
        template: buildFlashcardTemplate(flashcardIntentGuidelines.Comprehension),
        variables: ["language_instruction", "intent", "content", "min_quantity", "max_quantity"],
        default: buildFlashcardTemplate(flashcardIntentGuidelines.Comprehension),
    },
    flashcardsUserTemplate_Reference: {
        template: buildFlashcardTemplate(flashcardIntentGuidelines.Reference),
        variables: ["language_instruction", "intent", "content", "min_quantity", "max_quantity"],
        default: buildFlashcardTemplate(flashcardIntentGuidelines.Reference),
    },
    flashcardsUserTemplate_Analytical: {
        template: buildFlashcardTemplate(flashcardIntentGuidelines.Analytical),
        variables: ["language_instruction", "intent", "content", "min_quantity", "max_quantity"],
        default: buildFlashcardTemplate(flashcardIntentGuidelines.Analytical),
    },
    flashcardsUserTemplate_Procedural: {
        template: buildFlashcardTemplate(flashcardIntentGuidelines.Procedural),
        variables: ["language_instruction", "intent", "content", "min_quantity", "max_quantity"],
        default: buildFlashcardTemplate(flashcardIntentGuidelines.Procedural),
    },

    // Quiz user templates (intent-based)
    quizUserTemplate_Educational: {
        template: buildQuizTemplate(quizIntentGuidelines.Educational),
        variables: ["language_instruction", "intent", "content", "min_quantity", "max_quantity"],
        default: buildQuizTemplate(quizIntentGuidelines.Educational),
    },
    quizUserTemplate_Comprehension: {
        template: buildQuizTemplate(quizIntentGuidelines.Comprehension),
        variables: ["language_instruction", "intent", "content", "min_quantity", "max_quantity"],
        default: buildQuizTemplate(quizIntentGuidelines.Comprehension),
    },
    quizUserTemplate_Reference: {
        template: buildQuizTemplate(quizIntentGuidelines.Reference),
        variables: ["language_instruction", "intent", "content", "min_quantity", "max_quantity"],
        default: buildQuizTemplate(quizIntentGuidelines.Reference),
    },
    quizUserTemplate_Analytical: {
        template: buildQuizTemplate(quizIntentGuidelines.Analytical),
        variables: ["language_instruction", "intent", "content", "min_quantity", "max_quantity"],
        default: buildQuizTemplate(quizIntentGuidelines.Analytical),
    },
    quizUserTemplate_Procedural: {
        template: buildQuizTemplate(quizIntentGuidelines.Procedural),
        variables: ["language_instruction", "intent", "content", "min_quantity", "max_quantity"],
        default: buildQuizTemplate(quizIntentGuidelines.Procedural),
    },
};

// Simple in-memory cache
const cache = new Map<string, string>();
const CACHE_MAX_SIZE = 100;

/**
 * Simple template engine for variable substitution
 * Supports {{variable}} syntax
 */
function renderTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value || '');
    }
    return result;
}

/**
 * Get prompt with variable substitution
 */
export function getPrompt(type: string, variables: Record<string, string> = {}): string {
    const prompt = prompts[type];
    if (!prompt) {
        console.warn(`[PromptService] Prompt type '${type}' not found`);
        throw new Error(`Prompt type '${type}' not found`);
    }

    // Check cache first
    const cacheKey = `${type}:${JSON.stringify(variables)}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        return cached;
    }

    // Apply template substitution
    const rendered = renderTemplate(prompt.template, variables);

    // Cache result (with size limit)
    if (cache.size >= CACHE_MAX_SIZE) {
        const firstKey = cache.keys().next().value;
        if (firstKey) cache.delete(firstKey);
    }
    cache.set(cacheKey, rendered);

    return rendered;
}

/**
 * Get all available prompt types
 */
export function getAvailableTypes(): string[] {
    return Object.keys(prompts);
}

/**
 * Get prompt metadata
 */
export function getPromptMetadata(type: string): {
    type: string;
    variables: string[];
    hasTemplate: boolean;
    templateLength: number;
} | null {
    const prompt = prompts[type];
    if (!prompt) return null;

    return {
        type,
        variables: prompt.variables,
        hasTemplate: !!prompt.template,
        templateLength: prompt.template.length,
    };
}

/**
 * Get all prompts with their templates
 */
export function getAllPrompts(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const type of Object.keys(prompts)) {
        result[type] = prompts[type].template;
    }
    return result;
}

/**
 * Clear cache
 */
export function clearCache(): void {
    cache.clear();
    console.log('[PromptService] Cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; maxSize: number; usage: string } {
    return {
        size: cache.size,
        maxSize: CACHE_MAX_SIZE,
        usage: `${cache.size}/${CACHE_MAX_SIZE}`,
    };
}
