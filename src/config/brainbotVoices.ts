// Voice configuration for BrainBot hosts
export interface VoicePersonality {
    id: string;
    name: string;
    host1VoiceId: string; // Alex
    host2VoiceId: string; // Jordan
    tone: string;
}

// ElevenLabs voice IDs (you'll need to set these to actual voice IDs from your ElevenLabs account)
export const BRAINBOT_VOICES: VoicePersonality = {
    id: 'viral',
    name: 'Viral Edutainment',
    host1VoiceId: 'EXAVITQu4vr4xnSDxMaL', // Rachel (for Alex) - warm female voice
    host2VoiceId: 'pNInz6obpgDQGcFmaJgB', // Adam (for Jordan) - friendly male voice
    tone: 'High energy, conversational, Gen Z slang',
};

export const DEFAULT_PERSONALITY = BRAINBOT_VOICES.id;

export function getPersonality(id: string): VoicePersonality {
    return BRAINBOT_VOICES;
}
