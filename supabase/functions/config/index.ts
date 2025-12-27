/**
 * Config Edge Function
 * Handles all /api/config/* routes
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// ============================================================================
// Prompt Templates (moved inline from prompt-service.ts)
// ============================================================================

const flashcardsSystemPrompt = `You create flashcards for active recall learning.

Output must be valid JSON matching this schema:
{"flashcards": [{"question": string, "answer": string, "difficulty": number}]}

Requirements:
- difficulty: 1 (easy), 2 (medium), or 3 (hard)
- Return only the JSON object, nothing else`;

const quizSystemPrompt = `You create multiple-choice quiz questions for assessment.

Output must be valid JSON matching this schema:
{"questions": [{"question": string, "options": [4 strings], "correct_answer": number, "difficulty": number}]}

Requirements:
- correct_answer: 0-3 (index of correct option)
- exactly 4 options per question
- difficulty: 1 (easy), 2 (medium), or 3 (hard)
- Return only the JSON object, nothing else`;

const notesSystemPrompt = `You create comprehensive study guides for learning educational content.

Your role: Explain concepts thoroughly with reasoning and practical applications.
Your goal: Help students achieve deep understanding through detailed explanations.

Format: Mobile-friendly markdown with ## headers, plain text formulas (no LaTeX), single blank lines between sections.`;

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

Technical requirements:
- Mobile-friendly markdown: ## for sections, ### for subsections
- No LaTeX: use plain text (dy/dx, not \\frac{dy}{dx})
- Unicode symbols where helpful: ∫, √, π, ≈, →
- Single blank line between sections
- Bold (**) for key terms only
- Code blocks for code only
- Start with # [Title]
- Return only markdown content`;

// Flashcard templates by intent
const flashcardTemplates: Record<string, string> = {
    Educational: `{{language_instruction}}
Generate {{min_quantity}}-{{max_quantity}} flashcards for active recall practice.
Content intent: {{intent}}
CONTENT TO ANALYZE:
{{content}}
Focus on deep understanding through application and reasoning.
Return JSON: {"flashcards": [{"question": "...", "answer": "...", "difficulty": 2}]}`,
    Comprehension: `{{language_instruction}}
Generate {{min_quantity}}-{{max_quantity}} flashcards for comprehension.
Content intent: {{intent}}
CONTENT TO ANALYZE:
{{content}}
Balance recall with understanding.
Return JSON: {"flashcards": [{"question": "...", "answer": "...", "difficulty": 2}]}`,
    Reference: `{{language_instruction}}
Generate {{min_quantity}}-{{max_quantity}} flashcards for reference material.
Content intent: {{intent}}
CONTENT TO ANALYZE:
{{content}}
Focus on fast, accurate recall.
Return JSON: {"flashcards": [{"question": "...", "answer": "...", "difficulty": 2}]}`,
    Analytical: `{{language_instruction}}
Generate {{min_quantity}}-{{max_quantity}} flashcards for analytical content.
Content intent: {{intent}}
CONTENT TO ANALYZE:
{{content}}
Focus on critical thinking.
Return JSON: {"flashcards": [{"question": "...", "answer": "...", "difficulty": 2}]}`,
    Procedural: `{{language_instruction}}
Generate {{min_quantity}}-{{max_quantity}} flashcards for procedural content.
Content intent: {{intent}}
CONTENT TO ANALYZE:
{{content}}
Application-heavy with focus on solving with procedures.
Return JSON: {"flashcards": [{"question": "...", "answer": "...", "difficulty": 2}]}`,
};

// Quiz templates by intent
const quizTemplates: Record<string, string> = {
    Educational: `{{language_instruction}}
Generate {{min_quantity}}-{{max_quantity}} multiple-choice questions for assessment.
Content intent: {{intent}}
CONTENT TO ANALYZE:
{{content}}
Target: 60-70% questions at Apply level or higher for deep learning.
Return JSON: {"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "correct_answer": 0, "difficulty": 2}]}`,
    Comprehension: `{{language_instruction}}
Generate {{min_quantity}}-{{max_quantity}} multiple-choice questions.
Content intent: {{intent}}
CONTENT TO ANALYZE:
{{content}}
Target: 40-50% questions at Apply level or higher.
Return JSON: {"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "correct_answer": 0, "difficulty": 2}]}`,
    Reference: `{{language_instruction}}
Generate {{min_quantity}}-{{max_quantity}} multiple-choice questions.
Content intent: {{intent}}
CONTENT TO ANALYZE:
{{content}}
Heavy emphasis on rapid, accurate recall.
Return JSON: {"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "correct_answer": 0, "difficulty": 2}]}`,
    Analytical: `{{language_instruction}}
Generate {{min_quantity}}-{{max_quantity}} multiple-choice questions.
Content intent: {{intent}}
CONTENT TO ANALYZE:
{{content}}
Target: 70%+ at Analyze level or higher for critical thinking.
Return JSON: {"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "correct_answer": 0, "difficulty": 2}]}`,
    Procedural: `{{language_instruction}}
Generate {{min_quantity}}-{{max_quantity}} multiple-choice questions.
Content intent: {{intent}}
CONTENT TO ANALYZE:
{{content}}
Heavy Apply focus (40-50%) for competency in execution.
Return JSON: {"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "correct_answer": 0, "difficulty": 2}]}`,
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    // Only allow GET
    if (req.method !== 'GET') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    try {
        const url = new URL(req.url);
        const path = url.pathname;

        // Extract subpath
        const configMatch = path.match(/\/config(\/.*)?$/);
        const subPath = configMatch?.[1] || '';

        console.log('[Config] Request path:', path, 'subPath:', subPath);

        let responseData;

        switch (subPath) {
            case '':
            case '/':
                responseData = buildMainConfig();
                break;
            case '/bloom':
                responseData = buildBloomConfig();
                break;
            case '/prompts':
                responseData = buildPromptsConfig();
                break;
            case '/intent-distributions':
                responseData = buildIntentDistributions();
                break;
            case '/subscription':
                responseData = buildSubscriptionConfig();
                break;
            case '/contact':
                responseData = buildContactConfig();
                break;
            case '/onboarding':
                responseData = buildOnboardingConfig();
                break;
            case '/faq':
                responseData = buildFaqConfig();
                break;
            default:
                const messagesMatch = subPath.match(/^\/messages\/(\w+)$/);
                if (messagesMatch) {
                    responseData = buildMessagesConfig(messagesMatch[1]);
                } else {
                    return new Response(
                        JSON.stringify({ error: 'Not found' }),
                        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }
        }

        return new Response(
            JSON.stringify(responseData),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('[Config] Error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error', details: String(error) }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

// ============================================================================
// Config Builders
// ============================================================================

function buildMainConfig() {
    const prompts = {
        version: '2.1.0',
        timestamp: new Date().toISOString(),
        flashcardsSystemPrompt,
        flashcardsUserTemplate_Educational: flashcardTemplates.Educational,
        flashcardsUserTemplate_Comprehension: flashcardTemplates.Comprehension,
        flashcardsUserTemplate_Reference: flashcardTemplates.Reference,
        flashcardsUserTemplate_Analytical: flashcardTemplates.Analytical,
        flashcardsUserTemplate_Procedural: flashcardTemplates.Procedural,
        quizSystemPrompt,
        quizUserTemplate_Educational: quizTemplates.Educational,
        quizUserTemplate_Comprehension: quizTemplates.Comprehension,
        quizUserTemplate_Reference: quizTemplates.Reference,
        quizUserTemplate_Analytical: quizTemplates.Analytical,
        quizUserTemplate_Procedural: quizTemplates.Procedural,
        conditionalSystemPrompt: notesSystemPrompt,
        feynmanUserTemplate,
    };

    return {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        ai: {
            modelLimits: {
                'gpt-4o-mini': 16384,
                'gpt-4o': 16384,
                'gpt-4-turbo': 4096,
                'gpt-4': 8192,
                'gpt-3.5-turbo': 4096,
            },
            feynman: {
                model: 'gpt-4o-mini',
                temperature: 0.3,
                maxTokens: 16000,
                maxPages: 30,
                maxCharacters: 100000,
                maxWords: 15000,
                maxChunks: 1,
                maxChunkSize: 100000,
                timeoutMs: 60000,
                cacheTtlMs: 604800000,
            },
            flashcards: {
                model: 'gpt-4o-mini',
                temperature: 0.1,
                maxTokens: 12000,
                defaultQuantity: 20,
                minQuantity: 5,
                maxQuantity: 100,
                timeoutMs: 90000,
            },
            quiz: {
                model: 'gpt-4o-mini',
                temperature: 0.1,
                maxTokens: 12000,
                defaultQuantity: 20,
                minQuantity: 3,
                maxQuantity: 100,
                timeoutMs: 90000,
            },
        },
        network: {
            documentAiTimeoutMs: 60000,
            mediaTranscriptionTimeoutMs: 600000,
            defaultTimeoutMs: 15000,
            maxRetries: 2,
            cacheTtlMs: 86400000,
        },
        limits: {
            file: { maxSizeBytes: 20971520 },
            maxFileSizeBytes: {
                pdf: 20971520,
                image: 15728640,
                audio: 20971520,
                video: 31457280,
                document: 20971520,
                default: 20971520,
            },
            pdf: { maxPages: 30, maxCharactersForAI: 100000 },
            document: { maxCharacters: 100000 },
            media: { maxDurationSeconds: 600 },
            ai: { minWords: 20, maxWords: 15000, maxCharacters: 100000 },
        },
        features: {
            enableFeynmanExplanations: true,
            enableFlashcards: true,
            enableQuiz: true,
            enablePdfUpload: true,
            enableImageUpload: true,
            enableAudioUpload: true,
            enableVideoUpload: true,
        },
        prompts,
        intentDistributions: buildIntentDistributions(),
    };
}

function buildBloomConfig() {
    return {
        Educational: { remember: 0.2, understand: 0.2, apply: 0.25, analyze: 0.2, evaluate: 0.15 },
        Comprehension: { remember: 0.3, understand: 0.3, apply: 0.25, analyze: 0.1, evaluate: 0.05 },
        Reference: { remember: 0.6, understand: 0.2, apply: 0.15, analyze: 0.05, evaluate: 0 },
        Analytical: { remember: 0.1, understand: 0.15, apply: 0.2, analyze: 0.3, evaluate: 0.25 },
        Procedural: { remember: 0.15, understand: 0.2, apply: 0.5, analyze: 0.1, evaluate: 0.05 },
    };
}

function buildMessagesConfig(locale: string) {
    const messages: Record<string, Record<string, string>> = {
        en: {
            TIMEOUT: 'The request is taking longer than expected. Please check your connection and try again.',
            UNAVAILABLE: 'This feature is temporarily unavailable. Please try again later.',
            FUNCTION_ERROR: 'Something went wrong processing your request. Please try again.',
            AUTH_FAILED: 'Please sign in and try again.',
            INVALID_INPUT: 'Please check your input and try again.',
            EMPTY_CONTENT: 'No content to process. Please try uploading different material.',
            NETWORK_ERROR: 'Network error. Please check your connection.',
            FILE_TOO_LARGE: 'File is too large. Please try a smaller file.',
            UNSUPPORTED_FORMAT: 'This file format is not supported.',
        },
        es: {
            TIMEOUT: 'La solicitud está tomando más tiempo de lo esperado.',
            UNAVAILABLE: 'Esta característica no está disponible temporalmente.',
            FUNCTION_ERROR: 'Algo salió mal procesando tu solicitud.',
            AUTH_FAILED: 'Por favor, inicia sesión e intenta de nuevo.',
        },
        fr: {
            TIMEOUT: 'La demande prend plus de temps que prévu.',
            UNAVAILABLE: 'Cette fonctionnalité est temporairement indisponible.',
            FUNCTION_ERROR: "Une erreur s'est produite.",
            AUTH_FAILED: 'Veuillez vous connecter et réessayer.',
        },
    };
    return messages[locale] || messages.en;
}

function buildPromptsConfig() {
    return {
        version: '2.1.0',
        timestamp: new Date().toISOString(),
        flashcardsSystemPrompt,
        quizSystemPrompt,
        conditionalSystemPrompt: notesSystemPrompt,
        feynmanUserTemplate,
    };
}

function buildIntentDistributions() {
    return {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        flashcard: {
            Educational: 'Focus: 60-80% higher-order questions.',
            Comprehension: 'Focus: 40-45% higher-order.',
            Reference: 'Focus: Fast recall (20-25% higher-order).',
            Analytical: 'Focus: 75%+ higher-order.',
            Procedural: 'Focus: 65% Apply level.',
        },
        quiz: {
            Educational: 'Target: 60-70% Apply+.',
            Comprehension: 'Target: 40-50% Apply+.',
            Reference: 'Target: 50-60% Remember.',
            Analytical: 'Target: 70%+ Analyze+.',
            Procedural: 'Target: 40-50% Apply.',
        },
    };
}

function buildSubscriptionConfig() {
    return {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        plans: [
            { id: 'weekly', name: 'Weekly Study Pass', price: '$7.99', interval: 'week', features: ['Unlimited flashcards', 'All file uploads', 'Basic analytics'] },
            { id: 'monthly', name: 'Monthly Study Pro', price: '$12.99', interval: 'month', features: ['Unlimited flashcards', 'All file uploads', 'Advanced analytics', 'Priority support'] },
            { id: 'yearly', name: 'Yearly Master Plan', price: '$79.99', interval: 'year', features: ['Unlimited flashcards', 'All file uploads', 'Advanced analytics', 'Priority support', 'Best value - save 50%'] },
        ],
    };
}

function buildContactConfig() {
    return {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        supportEmail: 'support@masterlyapp.in',
        featureRequestEmail: 'support@masterlyapp.in',
        socialMedia: { twitter: '@masterlyapp', instagram: '@masterlyapp' },
    };
}

function buildOnboardingConfig() {
    return {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        struggles: [
            { value: 'forget', label: 'I forget everything by exam day' },
            { value: 'understand', label: "I don't understand the material" },
            { value: 'organize', label: 'I struggle to organize my notes' },
            { value: 'focus', label: 'I have trouble focusing while studying' },
        ],
        currentGrades: [
            { value: 'A', label: 'A (90-100)' },
            { value: 'B', label: 'B (80-89)' },
            { value: 'C', label: 'C (70-79)' },
            { value: 'D', label: 'D (60-69)' },
        ],
        studyMethods: [
            { value: 'reading', label: 'Reading & highlighting' },
            { value: 'flashcards', label: 'Flashcards & quizzes' },
            { value: 'summary', label: 'Notes & summaries' },
            { value: 'discussion', label: 'Discussion & group study' },
        ],
        dailyCardsOptions: [10, 20, 30, 45],
    };
}

function buildFaqConfig() {
    return {
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        items: [
            { question: 'How does Masterly create study materials?', answer: 'Masterly uses advanced AI to analyze your uploaded content and generate personalized explanations, flashcards, and quizzes in seconds.' },
            { question: 'What file formats are supported?', answer: 'We support PDFs, images, documents (DOC, DOCX, TXT), and audio files. You can also use YouTube URLs, record audio directly, or paste text content.' },
            { question: 'Is my data private?', answer: 'Absolutely. Your study materials are encrypted and only accessible by you.' },
            { question: 'Can I cancel my subscription anytime?', answer: 'Yes, you can cancel at any time without penalties.' },
        ],
    };
}
