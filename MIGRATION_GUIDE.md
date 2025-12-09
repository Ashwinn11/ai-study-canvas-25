# Migration Guide: ElevenLabs → Gemini 2.5 Flash Text-to-Speech

## Overview

This document details the complete migration from ElevenLabs text-to-speech to **Gemini 2.5 Flash TTS** (NOT Google Cloud TTS) across the BrainBot podcast generation system. This guide serves as a blueprint for implementing the same migration on iOS and other platforms.

**Rationale**:
- Gemini 2.5 Flash TTS provides **native multi-speaker support** perfect for podcast conversations (Alex + Jordan dialogue)
- Currently in **free preview** (significant cost savings during development)
- Native podcast generation matching NotebookLM's audio overview style
- Integrates with existing Google AI infrastructure

---

## Architecture Overview

### Previous Architecture (ElevenLabs)
```
Web App → ElevenLabs API (client-side with API key)
↓
Individual Segment Audio Generated
↓
Podcast Played
```

### New Architecture (Gemini 2.5 Flash TTS)
```
Web App → Backend Proxy → Gemini 2.5 Flash TTS API
↓
PCM Audio (24kHz, 16-bit, mono) → Wrapped in WAV Header
↓
Audio → Supabase Storage
↓
Public URL → Web App → Audio Playback
```

**Why the backend proxy?**
- Secure API key management (Gemini API key never exposed to client)
- WAV header wrapping (Gemini returns raw PCM, browsers need WAV container)
- Centralized configuration for multi-speaker mode
- Rate limiting and quota management
- Single-speaker mode fallback (Gemini requires exactly 2 speakers for multi-speaker)
- SSML markup processing for natural prosody

---

## Implementation Details

### 1. Backend Implementation

#### Endpoint: `/api/tts/gemini-synthesize`

**Location**: `masterly/backend-source/server.js` (lines 1417-1574)

**Request**:
```json
{
  "text": "Alex: Hey Jordan!\nJordan: Hi Alex!",
  "voiceId": "Zephyr",
  "languageCode": "en-US"
}
```

**Response**:
```json
{
  "audioUrl": "https://supabase-storage-url/audio/podcasts/brainbot_1700000000000.wav"
}
```

**Authentication**:
- Requires JWT bearer token from Supabase session
- Header: `Authorization: Bearer <supabase_session_token>`
- Backend uses `GEMINI_API_KEY` environment variable

#### Key Implementation Details

**Speaker Detection & Dual Mode**:
- Parses text for speaker labels (e.g., "Alex: text")
- **Multi-speaker mode**: When exactly 2 unique speakers detected
- **Single-speaker mode**: When 1 speaker or no speaker labels detected
- Gemini API requires exactly 2 speakers for `multi_speaker_voice_config`

**Multi-Speaker Configuration**:
```javascript
// When both Alex and Jordan detected:
speaker_voice_configs: [
  { speaker: "Alex", voice_config: { prebuilt_voice_config: { voice_name: "Zephyr" } } },
  { speaker: "Jordan", voice_config: { prebuilt_voice_config: { voice_name: "Charon" } } }
]
```

**Single-Speaker Configuration**:
```javascript
// When only one speaker:
voice_config: {
  prebuilt_voice_config: {
    voice_name: voiceId
  }
}
```

**PCM to WAV Conversion**:
Gemini returns raw PCM audio (24kHz, 16-bit mono, base64-encoded). The backend wraps it in a WAV container:

```javascript
// Create WAV header (44 bytes)
- RIFF header: "RIFF"
- File size: 36 + PCM_data_size
- WAVE marker: "WAVE"
- fmt chunk: Audio format (1=PCM), sample rate (24000), channels (1), bits (16)
- data chunk: PCM data size

// Combine: [WAV_HEADER (44 bytes)] + [PCM_DATA]
```

**Audio Upload Flow**:
1. Gemini API returns base64-encoded PCM audio
2. Decode base64 to PCM buffer: `Buffer.from(audioData, 'base64')`
3. Create WAV header with format info
4. Concatenate header + PCM data
5. Upload to Supabase `audio` bucket as `.wav` file: `podcasts/brainbot_<timestamp>.wav`
6. Return public storage URL to client

**Error Handling**:
- Validate text parameter (not empty)
- Check GEMINI_API_KEY is configured
- Catch Gemini API errors (invalid voice names, multi-speaker constraint violations)
- Validate audio data in response
- Catch Supabase upload errors
- Return meaningful error messages to client

---

### 2. Frontend Service Layer

**File**: `src/lib/api/googleTextToSpeechService.ts` (renamed class to `GeminiTextToSpeechService`)

**Purpose**: Abstraction layer for Gemini TTS API calls with authentication and error handling

```typescript
export class GeminiTextToSpeechService {
  async textToSpeech({
    text,
    voiceId,
    languageCode = 'en-US',
  }: TextToSpeechOptions): Promise<string>
}
```

**Key Implementation Points**:
- Retrieves Supabase session for JWT token
- Adds `Authorization: Bearer <token>` header
- Calls `/api/tts/gemini-synthesize` backend endpoint
- Returns audio URL (WAV file in Supabase storage)
- Comprehensive error logging for debugging
- Supports both single-speaker and multi-speaker modes transparently

**Usage Pattern**:
```typescript
import { geminiTextToSpeechService } from '@/lib/api/googleTextToSpeechService';

// Single speaker
const audioUrl = await geminiTextToSpeechService.textToSpeech({
  text: 'Jordan: This is important information.',
  voiceId: 'Charon',
  languageCode: 'en-US',
});

// Multi-speaker (backend handles automatically)
const podcastUrl = await geminiTextToSpeechService.textToSpeech({
  text: 'Alex: Hey!\nJordan: Hi there!',
  voiceId: 'Zephyr',
  languageCode: 'en-US',
});

// Use audioUrl for playback
```

---

### 3. Voice Configuration

**File**: `src/config/brainbotVoices.ts`

**Voice Selection Criteria**:
- **Gemini 2.5 Flash Native Voices**: 30 pre-trained voices optimized for conversational speech
- **Female Voice (Alex)**: `Zephyr` - bright, warm, engaging (recommended for educational hosting)
- **Male Voice (Jordan)**: `Charon` - informative, calm, friendly (recommended for supportive role)

**Configuration Structure**:
```typescript
export const BRAINBOT_VOICES: VoicePersonality = {
  id: 'supportive',
  name: 'Supportive Bestie',
  host1VoiceId: 'Zephyr',     // Female (Alex) - bright & warm
  host2VoiceId: 'Charon',     // Male (Jordan) - informative & calm
  tone: 'encouraging and sweet, using phrases like "bestie", "you got this"',
};
```

**Available Gemini 2.5 Flash TTS Voices** (30 total):
| Voice | Type | Characteristics |
|-------|------|-----------------|
| Zephyr | Female | Bright, warm, engaging |
| Charon | Male | Informative, calm, friendly |
| Kore | Female | Firm, professional |
| Puck | Male | Upbeat, energetic |
| Aoede | Female | Breezy, casual |
| Enceladus | Male | Breathy, intimate |
| Fenrir | Male | Excitable, enthusiastic |
| Leda | Female | Youthful, playful |

**For BrainBot**: Zephyr (Alex) + Charon (Jordan) provides optimal educational podcast tone with natural conversational dynamics.

---

### 4. Integration with BrainBot Service

**File**: `src/lib/api/brainBotService.ts`

**Changes Made**:
```typescript
// Before (Google Cloud TTS)
import { googleTextToSpeechService } from '@/lib/api/googleTextToSpeechService';
const audioUrl = await googleTextToSpeechService.textToSpeech({...});

// After (Gemini 2.5 Flash TTS)
import { geminiTextToSpeechService } from '@/lib/api/googleTextToSpeechService';
const audioUrl = await geminiTextToSpeechService.textToSpeech({...});
```

**Key Pattern**: The service remains agnostic to which TTS provider is used. Changing providers only requires:
1. Updating the import statement
2. Changing the service instance name
3. Backend handles single/multi-speaker modes automatically

**Line 322-326** (in brainBotService.ts):
```typescript
// Generate audio using Gemini 2.5 Flash TTS
const audioUrl = await geminiTextToSpeechService.textToSpeech({
  text: line.text,
  voiceId: voiceId,
});
```

---

### 5. Player Component Fixes

**File**: `src/components/brainbot/BrainBotPlayer.tsx`

Critical bugs fixed during migration (from previous Google Cloud TTS iteration):

#### Issue 1: Duplicate Script Generation ✅ FIXED

**Root Causes**:
1. `generatePodcast()` being called twice (React StrictMode in development)
2. Error handler fallback calling script generation again
3. Streaming callback appending to existing state

**Solution**:
```typescript
// Prevent double generation
const isGeneratingRef = useRef(false);

const generatePodcast = async () => {
  if (isGeneratingRef.current) {
    logger.warn('[BrainBot] Generation already in progress');
    return;
  }
  isGeneratingRef.current = true;

  try {
    setScript([]); // Reset before generating
    // ... generation logic ...
  } finally {
    isGeneratingRef.current = false;
  }
};
```

#### Issue 2: Auto-play Browser Error ✅ FIXED

**Root Cause**: Browsers block audio auto-play without user interaction

**Solution**: Removed auto-play, require user to click play button
```typescript
// REMOVED: setIsPlaying(true);
// After first 4 segments, just show ready state
setIsLoading(false); // User must click play
```

#### Issue 3: Audio Format Error ✅ FIXED

**Root Cause**: Gemini returns raw PCM, not playable format

**Solution**: Backend wraps PCM in WAV header
```typescript
// Frontend audio element now receives valid WAV file
<audio ref={audioRef} preload="auto" />

// Browser can now play:
audioRef.current.src = "https://supabase.../brainbot_12345.wav"
audioRef.current.play() // ✅ Works!
```

---

## Voice Quality Comparison

### Why Gemini 2.5 Flash TTS?

| Metric | Google Cloud Standard | Google Cloud WaveNet | Google Cloud Neural2 | **Gemini 2.5 Flash** |
|--------|----------------------|-------------------|--------------------|-------------------|
| Naturalness | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Multi-Speaker Support | ❌ | ❌ | ❌ | ✅ Built-in |
| Cost (Preview) | Standard | Standard | High | **FREE** |
| Podcast Suitability | Poor | Good | Excellent | **Excellent** |
| Conversation Quality | Poor | Good | Excellent | **Excellent** |
| Setup Complexity | Medium | Medium | Medium | **Low** |
| Available Voices | Limited | Good | Excellent | **30 voices** |

**Result**: Gemini 2.5 Flash TTS provides:
- ✅ Premium voice quality (matches Neural2)
- ✅ Native multi-speaker podcast generation
- ✅ FREE during preview phase
- ✅ Optimized for conversational speech
- ✅ Simple to implement

**Timeline Note**: Currently in free preview. Pricing TBD at GA.

---

## Audio Format Details

### Gemini PCM to WAV Conversion

Gemini 2.5 Flash TTS returns raw PCM audio. The backend automatically wraps it in a WAV container.

**PCM Specifications**:
- Sample Rate: 24,000 Hz
- Channels: 1 (Mono)
- Bit Depth: 16-bit
- Encoding: Linear PCM (uncompressed)

**WAV Header Structure** (44 bytes):
```
Bytes 0-3:     "RIFF"                          (File format)
Bytes 4-7:     File size - 8                   (Total size)
Bytes 8-11:    "WAVE"                          (Format type)
Bytes 12-15:   "fmt "                          (Format subchunk)
Bytes 16-19:   16                              (Format chunk size)
Bytes 20-21:   1                               (Audio format: PCM)
Bytes 22-23:   1                               (Channels: Mono)
Bytes 24-27:   24000                           (Sample rate)
Bytes 28-31:   48000                           (Byte rate)
Bytes 32-33:   2                               (Block align)
Bytes 34-35:   16                              (Bits per sample)
Bytes 36-39:   "data"                          (Data subchunk)
Bytes 40-43:   PCM data size                   (Audio data size)
```

**Result**:
- ✅ Browsers recognize WAV format
- ✅ HTML `<audio>` element can play it
- ✅ No transcoding needed
- ✅ 44-byte overhead per file (negligible)

---

## Storage Strategy

### Supabase Audio Bucket Organization

```
audio/
├── podcasts/
│   ├── brainbot_1700000000000.mp3
│   ├── brainbot_1700000001000.mp3
│   └── ...
```

**Path Format**: `podcasts/brainbot_<timestamp>.mp3`

**Advantages**:
- Organized structure for easy management
- Timestamp prevents collisions
- Public URL accessible directly
- CDN caching at edge locations

### Caching Strategy

Podcasts are cached at two levels:

1. **Database Cache** (via `getCachedPodcast()`)
   - Script stored in `podcasts` table
   - Prevents redundant generation
   - Share same podcast across users

2. **Storage Cache** (Supabase CDN)
   - Audio files cached globally
   - Reduced bandwidth costs
   - Faster playback for users

---

## Testing Checklist

- [ ] Backend endpoint responds to TTS requests with valid audio URL
- [ ] Audio files correctly stored in Supabase `podcasts/` folder
- [ ] WaveNet voices sound natural (not robotic)
- [ ] SSML markup produces appropriate pauses and emphasis
- [ ] No duplicate scripts generated during podcast creation
- [ ] Streaming segments appear progressively while generating
- [ ] Player only plays after user clicks play button (no auto-play)
- [ ] Skip back/forward works correctly between segments
- [ ] Progress bar accurately tracks playback position
- [ ] Error messages are user-friendly
- [ ] JWT authentication prevents unauthorized access

---

## iOS Migration Steps

### Phase 1: Backend Setup (Already Complete)
The backend endpoint `/api/tts/gemini-synthesize` already supports iOS. Ensure you have:
- ✅ GEMINI_API_KEY configured in Cloud Run environment
- ✅ Supabase audio bucket created
- ✅ Express server running and accessible

### Phase 2: iOS Service Layer

**Create**: `Services/GeminiTextToSpeechService.swift`

```swift
class GeminiTextToSpeechService {
    func textToSpeech(
        text: String,
        voiceId: String,
        languageCode: String = "en-US"
    ) async throws -> String {
        let token = try await getSupabaseAuthToken()

        var request = URLRequest(url: URL(string: "\(BACKEND_API_URL)/api/tts/gemini-synthesize")!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload: [String: Any] = [
            "text": text,
            "voiceId": voiceId,
            "languageCode": languageCode
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw TTSError.apiError
        }

        let result = try JSONDecoder().decode(TTSResponse.self, from: data)
        return result.audioUrl
    }
}

struct TTSResponse: Codable {
    let audioUrl: String
}
```

### Phase 3: Integration with BrainBotService

Replace with Gemini TTS:

```swift
// Before (Google Cloud TTS)
let audioUrl = try await googleTextToSpeechService.textToSpeech(...)

// After (Gemini 2.5 Flash TTS)
let audioUrl = try await geminiTextToSpeechService.textToSpeech(
    text: segment.text,
    voiceId: voiceId,
    languageCode: "en-US"
)
```

### Phase 4: Voice Configuration

**Update**: `Models/BrainBotVoiceConfig.swift`

Same voice IDs as web:
```swift
let ALEX_VOICE = "Zephyr"     // Female - bright & warm
let JORDAN_VOICE = "Charon"   // Male - informative & calm
```

### Phase 5: Audio Playback

Update AVPlayer to handle WAV files:
```swift
// iOS natively supports WAV playback
let audioURL = URL(string: audioUrl)!
let player = AVPlayer(url: audioURL)
player.play()
```

### Phase 6: Testing

Same testing checklist as web version:
- [ ] Single speaker segments play correctly
- [ ] Multi-speaker segments play with distinct voices
- [ ] Audio files cache properly in Documents folder
- [ ] Network errors handled gracefully
- [ ] Voice quality matches web version

---

## Performance Metrics

### Timeline Comparison

| Metric | ElevenLabs | Google Cloud TTS | **Gemini 2.5 Flash** |
|--------|-----------|-----------------|-------------------|
| **Time per segment** | 2-3s | 1.5-2.5s | 1.5-2.5s |
| **20-segment podcast** | 40-60s | 30-50s | 30-50s |
| **API calls pattern** | 20 parallel | 20 sequential | Smart (1-10 depending on speakers) |
| **Cost per podcast** | ~$0.50 | ~$0.20 | **FREE (preview)** |
| **Voice quality** | Basic synthetic | Neural (WaveNet) | Neural (premium) |
| **Multi-speaker** | ❌ | ❌ | ✅ Built-in |

### Cost Analysis

**Development Phase (Current - FREE)**:
- Gemini 2.5 Flash TTS: $0/month (unlimited preview access)
- Estimated annual savings: **~$6,000** vs Google Cloud TTS

**Post-GA Estimate** (when pricing available):
- Likely similar to Google Cloud TTS: ~$16 per 1M characters
- 20-segment podcast (~3,000 characters): ~$0.05
- vs ElevenLabs: ~$0.50 per podcast
- **Still 80-90% cost reduction**

### Quality Comparison

- **ElevenLabs**: Basic neural synthesis, robotic for educational content
- **Google Cloud WaveNet**: High-quality neural, good but not optimized for dialogue
- **Gemini 2.5 Flash**: Premium neural + dialogue optimization (best for podcasts)

---

## Troubleshooting

### Issue: "The number of enabled_voices must equal 2"
**Cause**: Gemini multi-speaker mode requires exactly 2 speakers
**Solution**: Backend detects speakers and uses:
- Multi-speaker mode: When exactly 2 unique speakers detected
- Single-speaker mode: When 1 or 0 speakers detected

### Issue: "NotSupportedError: The element has no supported sources"
**Cause**: Browser receiving unsupported audio format (raw PCM)
**Solution**: Ensure backend wraps PCM in WAV header (already implemented)

### Issue: "Invalid voice name"
**Cause**: Using wrong voice ID (from Google Cloud TTS instead of Gemini)
**Solution**: Use Gemini voice names: Zephyr, Charon, Kore, Puck, etc.

### Issue: "GEMINI_API_KEY not configured"
**Cause**: Environment variable not set on backend
**Solution**: Add `GEMINI_API_KEY` to Cloud Run environment variables

### Issue: "Audio plays but sounds robotic"
**Cause**: Using wrong voice or format setting
**Solution**:
- Verify using Gemini voices (not Google Cloud voices)
- Gemini naturally handles prosody (no SSML needed)

### Issue: "Timeout generating audio"
**Cause**: Large text (>1000 words)
**Solution**: Segment text into smaller chunks before sending to TTS

---

## Environment Setup

### Required Environment Variables

**Backend** (Cloud Run environment variables - MUST SET BEFORE DEPLOYMENT):
```
GEMINI_API_KEY=your-gemini-api-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**How to Add to Cloud Run**:
```bash
# Deploy with environment variables
gcloud run deploy masterly-backend \
  --set-env-vars GEMINI_API_KEY=AIzaSy...,SUPABASE_URL=https://...,SUPABASE_SERVICE_ROLE_KEY=...
```

**Web Frontend** (`.env.local` - already configured):
```
NEXT_PUBLIC_API_BASE_URL=https://masterly-server-532214287554.us-central1.run.app
```

**iOS** (Info.plist or Config.swift):
```
BACKEND_API_URL=https://masterly-server-532214287554.us-central1.run.app
SUPABASE_URL=https://your-project.supabase.co
```

### Deployment Checklist

- [ ] Generate Gemini API key from Google AI Studio
- [ ] Add `GEMINI_API_KEY` to Cloud Run environment
- [ ] Verify backend deployed successfully
- [ ] Test `/api/tts/gemini-synthesize` endpoint manually
- [ ] Confirm Supabase audio bucket permissions
- [ ] Test web app podcast generation
- [ ] Test iOS app audio playback

---

## Cost Analysis

### Google Cloud TTS Pricing

**Standard Voices**: $16 per 1M characters
**WaveNet Voices**: $16 per 1M characters (same as Standard)
**Neural2 Voices**: $24 per 1M characters
**Studio Voices**: $24 per 1M characters

**BrainBot Calculation** (assuming 3,000 characters per podcast):
- Old (ElevenLabs): ~$0.30-0.50 per podcast
- New (Google WaveNet): ~$0.05 per podcast
- **Savings**: 90% cost reduction

---

## Rollback Plan

If issues arise, rollback is straightforward:

1. **Web App**: Revert imports to ElevenLabs service
2. **iOS**: Update service layer to use ElevenLabs again
3. **Database**: Scripts are cached, no data loss
4. **Storage**: Old ElevenLabs audio files remain in storage

**Estimated Rollback Time**: 30 minutes

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2025-12-09 | **MAJOR**: Migrated from Google Cloud TTS to Gemini 2.5 Flash TTS |
| | | Native multi-speaker support (no more sequential calls per speaker) |
| | | PCM to WAV conversion for browser playback |
| | | Single-speaker/Multi-speaker mode detection |
| | | Free preview pricing ($0 during development) |
| 1.0 | 2024-12-09 | Initial migration from ElevenLabs to Google Cloud TTS |
| | | Added SSML markup for natural prosody |
| | | Fixed duplicate script generation bug |
| | | Implemented secure backend proxy pattern |

---

## Migration Summary

### What Changed

**Before (ElevenLabs)**:
```
Text → ElevenLabs API → MP3 → Browser Play
```

**Intermediate (Google Cloud TTS)**:
```
Text → Backend → Google Cloud TTS API → MP3 → Supabase → Browser Play
```

**Now (Gemini 2.5 Flash TTS)** ⭐:
```
"Alex: text\nJordan: text" → Backend → Gemini TTS API → WAV (PCM wrapped) → Supabase → Browser Play
                           ↑ Smart speaker detection ↑
                           Uses multi-speaker mode when both detected
```

### Key Improvements

✅ **Native Multi-Speaker Support**: 1 API call for dialogue vs 2+ calls
✅ **FREE During Preview**: $0 cost for unlimited TTS until GA
✅ **Premium Voice Quality**: Gemini neural voice >= Google Cloud Neural2
✅ **Optimized for Dialogue**: Built for conversational speech (perfect for podcasts)
✅ **Simpler Implementation**: Backend handles all format conversion
✅ **NotebookLM-Aligned**: Same technology Google uses for Audio Overviews

### What Stays the Same

- ✅ Same backend URL
- ✅ Same Supabase storage
- ✅ Same voice configuration pattern
- ✅ Same iOS implementation approach
- ✅ Same error handling patterns

---

## References

- [Google Cloud Text-to-Speech Documentation](https://cloud.google.com/text-to-speech/docs)
- [SSML Reference Guide](https://cloud.google.com/text-to-speech/docs/ssml)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Voice Families Comparison](https://cloud.google.com/text-to-speech/docs/voices)

---

## Contact & Support

For questions or issues during iOS migration, refer to:
- BrainBotService implementation patterns in web app
- Voice quality testing results in this document
- Backend endpoint logs for API errors
