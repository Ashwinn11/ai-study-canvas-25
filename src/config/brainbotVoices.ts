// Voice configuration for BrainBot hosts
export interface VoicePersonality {
    id: string;
    name: string;
    host1VoiceId: string; // Alex
    host2VoiceId: string; // Jordan
    tone: string;
}

// ElevenLabs voice IDs matching iOS supportive personality
export const BRAINBOT_VOICES: VoicePersonality = {
    id: 'supportive',
    name: 'Supportive Bestie',
    host1VoiceId: 'EXAVITQu4vr4xnSDxMaL', // Rachel (for Alex) - warm female voice
    host2VoiceId: 'pNInz6obpgDQGcFmaJgB', // Adam (for Jordan) - friendly male voice
    tone: 'encouraging and sweet, using phrases like "bestie", "you got this", with lots of positive energy',
};

export const DEFAULT_PERSONALITY = BRAINBOT_VOICES.id;

export function getPersonality(id: string): VoicePersonality {
    return BRAINBOT_VOICES;
}
