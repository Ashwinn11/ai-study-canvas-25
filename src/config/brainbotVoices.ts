// Voice configuration for BrainBot hosts
export interface VoicePersonality {
    id: string;
    name: string;
    host1VoiceId: string; // Alex
    host2VoiceId: string; // Jordan
    tone: string;
}

// Gemini 2.5 Flash multi-speaker voice names
// Using Gemini's native multi-speaker support for podcast-style conversations
export const BRAINBOT_VOICES: VoicePersonality = {
    id: 'supportive',
    name: 'Supportive Bestie',
    host1VoiceId: 'Zephyr', // Female voice (for Alex) - bright, warm, and engaging
    host2VoiceId: 'Charon', // Male voice (for Jordan) - informative, calm, and friendly
    tone: 'encouraging and sweet, using phrases like "bestie", "you got this", with lots of positive energy',
};

export const DEFAULT_PERSONALITY = BRAINBOT_VOICES.id;

export function getPersonality(id: string): VoicePersonality {
    return BRAINBOT_VOICES;
}
