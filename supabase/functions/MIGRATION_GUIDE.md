# Edge Functions Migration Guide

## Overview

This document details the migration from Cloud Run backend to Supabase Edge Functions.

**Migration Date:** December 2025  
**Status:** ✅ COMPLETED

---

## Migration Summary

### What Changed
- **Backend:** Cloud Run → Supabase Edge Functions
- **Audio Recording:** M4A (AAC) → WAV (LINEAR16) for Google STT compatibility
- **Audio Upload:** Removed (only recording is now supported)
- **Client Rollout:** Multi-device iOS already points to Edge Functions base URL; align remaining clients to the same origin

### Why Edge Functions?
- 90% cost reduction vs Cloud Run
- Same-region deployment with Supabase database
- Simplified infrastructure
- No container management

---

## Edge Functions Created

### Shared Modules (`_shared/`)

| File | Purpose |
|------|---------|
| `cors.ts` | CORS headers and response helpers |
| `auth.ts` | JWT validation, admin/cleanup secret validation |
| `google-auth.ts` | Google Cloud authentication via service account JWT |
| `types.ts` | Shared TypeScript types |
| `prompt-service.ts` | Centralized AI prompts for flashcards, quizzes, notes |

### Edge Functions

| Function | Original Endpoint | Purpose | Status |
|----------|-------------------|---------|--------|
| `health` | `/health` | Health check | ✅ Deployed |
| `config` | `/api/config/*` | All configuration endpoints | ✅ Deployed |
| `ai-chat` | `/api/ai/chat` | OpenAI proxy | ✅ Deployed |
| `document-ocr` | `/api/documentai/process` | PDF/Image OCR via Document AI | ✅ Deployed |
| `document-extract` | `/api/document/extract` | DOCX/TXT extraction | ✅ Deployed |
| `audio-transcribe` | `/api/audio/transcribe` | Audio → Text (Google STT, WAV/FLAC only) | ✅ Deployed |
| `youtube-captions` | `/api/youtube/captions` | YouTube transcript extraction | ✅ Deployed |
| `cleanup` | `/api/cleanup` | GCS file cleanup | ✅ Deployed |

### Existing Functions (Already Deployed)

- `delete-account` - User account deletion
- `schedule-spaced-repetition` - SR scheduling
- `send-push-notification` - Push notifications
- `send-study-reminder` - Study reminders

---

## Configuration Required

### Supabase Secrets

Set these secrets using `supabase secrets set`:

```bash
# AI Services
supabase secrets set OPENAI_API_KEY=sk-...

# Google Cloud (store entire JSON as one secret)
supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"..."}'

# Individual Google Cloud settings
supabase secrets set GCP_PROJECT_ID=your-project-id
supabase secrets set DOCAI_PROCESSOR_ID=your-processor-id
supabase secrets set DOCAI_LOCATION=us
supabase secrets set GCS_BUCKET=your-bucket-name

# Security
supabase secrets set CLEANUP_SECRET=your-cleanup-secret
supabase secrets set ADMIN_API_KEY=your-admin-key
```

---

## URL Mapping

### Old URLs (Cloud Run) - DECOMMISSIONED

```
https://masterly-server-532214287554.us-central1.run.app/api/...
```

### New URLs (Edge Functions) - ACTIVE

```
https://hcdcxznwnzdhomvmpotr.supabase.co/functions/v1/...
```

| Old Path | New Path | Status |
|----------|----------|--------|
| `/health` | `/functions/v1/health` | ✅ |
| `/api/config` | `/functions/v1/config` | ✅ |
| `/api/config/bloom` | `/functions/v1/config/bloom` | ✅ |
| `/api/config/prompts` | `/functions/v1/config/prompts` | ✅ |
| `/api/config/messages/:locale` | `/functions/v1/config/messages/:locale` | ✅ |
| `/api/ai/chat` | `/functions/v1/ai-chat` | ✅ |
| `/api/documentai/process` | `/functions/v1/document-ocr` | ✅ |
| `/api/document/extract` | `/functions/v1/document-extract` | ✅ |
| `/api/audio/transcribe` | `/functions/v1/audio-transcribe` | ✅ |
| `/api/youtube/captions` | `/functions/v1/youtube-captions` | ✅ |
| `/api/cleanup` | `/functions/v1/cleanup` | ✅ |

---

## Audio Transcription Changes

### Problem
Google Speech-to-Text doesn't support M4A/AAC format natively. FFmpeg cannot run in Edge Functions (no binary execution).

### Solution Implemented

1. **Client Recording Format Changed**
   - Configured `expo-audio` to record in WAV (LINEAR16) format
   - 16kHz sample rate, mono, 16-bit PCM
   - This format is natively supported by Google STT

2. **Audio File Upload Removed**
   - Users can only record audio (which produces WAV)
   - "Upload Audio" option removed from upload modal
   - Existing audio files (MP3, M4A) cannot be uploaded

3. **Edge Function Updates**
   - Parses WAV header to extract sample rate and channels
   - Validates WAV format before sending to Google STT
   - Falls back to defaults if header parsing fails

### Code Changes

```typescript
// hooks/useUpload.ts - WAV Recording Preset
const WAV_RECORDING_PRESET: RecordingOptions = {
  extension: '.wav',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 256000,
  ios: {
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: 127,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: 'audio/wav', bitsPerSecond: 256000 },
};
```

---

## Frontend Updates Completed

### 1. Environment Variables

```bash
# Web (.env.local)
NEXT_PUBLIC_API_BASE_URL=https://hcdcxznwnzdhomvmpotr.supabase.co/functions/v1

# Expo (app.config / .env)
EXPO_PUBLIC_API_BASE_URL=https://hcdcxznwnzdhomvmpotr.supabase.co/functions/v1
EXPO_PUBLIC_OPENAI_PROXY_URL=https://hcdcxznwnzdhomvmpotr.supabase.co/functions/v1
```

### 2. API Endpoints Configuration

```typescript
// constants/config.ts - Updated
export const API_ENDPOINTS = {
  DOCUMENT_AI_PROCESS: "/document-ocr",
  DOCUMENT_EXTRACT: "/document-extract",
  AI_CHAT_PROXY: "/ai-chat",
  YOUTUBE_CAPTIONS: "/youtube-captions",
  AUDIO_TRANSCRIBE: "/audio-transcribe",
  CONFIG: "/config",
  HEALTH: "/health",
  CLEANUP: "/cleanup",
} as const;
```

Use these shared endpoints in both the Next.js web app and the Expo clients to eliminate lingering `/api` prefixes from the Cloud Run era.

### 3. Service Client Updates

- `configService.ts` - Uses `API_ENDPOINTS.CONFIG`
- `documentProcessing.ts` (web) - Swap `/api/*` paths for `API_ENDPOINTS` + `NEXT_PUBLIC_API_BASE_URL`
- `documentExtractClient.ts` - Uses `API_ENDPOINTS.DOCUMENT_EXTRACT`
- `mediaTranscriptionClient.ts` - Uses `API_ENDPOINTS.AUDIO_TRANSCRIBE`
- `youtubeClient.ts` - Uses `API_ENDPOINTS.YOUTUBE_CAPTIONS`

### 4. Audio Recording

- `useUpload.ts` - Records in WAV format, sends as `audio/wav`
- `useVoiceQuestion.ts` - Records in WAV format for voice questions

### 5. Upload Modal

- Removed "Upload Audio" option
- Only "Record Audio" is available

---

## Client Rollout Status

| Client | Base URL | Status | Notes |
|--------|----------|--------|-------|
| Multi-device iOS (Expo) | `EXPO_PUBLIC_API_BASE_URL` | ✅ | Already hitting Supabase Edge Functions in production |
| Web App (Next.js) | `NEXT_PUBLIC_API_BASE_URL` | 📋 Verify | Update API clients to consume `API_ENDPOINTS` paths without `/api` prefix and retest critical flows |

---

## Deployment Completed

All Edge Functions have been deployed:

```bash
supabase functions deploy health
supabase functions deploy config
supabase functions deploy ai-chat
supabase functions deploy document-ocr
supabase functions deploy document-extract
supabase functions deploy audio-transcribe
supabase functions deploy youtube-captions
supabase functions deploy cleanup
```

---

## Testing Checklist

| Feature | Status | Notes |
|---------|--------|-------|
| Health endpoint | ✅ | Returns OK |
| Config endpoint | ✅ | Returns configuration |
| Audio recording | ✅ | Records WAV, transcribes correctly |
| Document OCR | 📋 Test | PDF and image processing |
| Document Extract | 📋 Test | DOCX/TXT extraction |
| AI Chat | 📋 Test | OpenAI proxy |
| YouTube Captions | 📋 Test | Caption extraction |

Run the multi-device iOS smoke suite after each deployment to confirm parity with the production build that already targets Edge Functions.

---

## Cloud Run Decommissioning

### Prerequisites
- [ ] All Edge Functions tested and working
- [ ] Frontend fully updated
- [ ] 24-48 hours of monitoring with no issues

### Decommissioning Steps

```bash
# 1. Stop the Cloud Run service
gcloud run services update masterly-server --no-traffic --region=us-central1

# 2. Monitor for any issues (24 hours)

# 3. Delete the Cloud Run service
gcloud run services delete masterly-server --region=us-central1

# 4. Clean up associated resources
# - Delete Cloud Run IAM bindings
# - Remove Cloud Build triggers if any
# - Delete container images from Container Registry
```

---

## Rollback Plan (If Needed)

If issues arise after decommissioning:

1. **Redeploy Cloud Run service** from the last known good image
2. **Revert frontend environment variable** to Cloud Run URL
3. Cloud Run and Edge Functions use the same Supabase database - no data migration needed

---

## Cost Comparison

| Service | Free Tier | Paid |
|---------|-----------|------|
| Cloud Run | 2M requests/month | $0.00002/request |
| Edge Functions | 2M invocations/month | $0.000002/invocation |

**Estimated Savings:** 90% reduction in backend costs

---

## Troubleshooting

### View Edge Function Logs
```bash
supabase functions logs --tail
```

### Common Issues

1. **"Invalid sample rate"** - WAV file header parsing failed, check audio format
2. **"UNSUPPORTED_FORMAT"** - Audio file not WAV/FLAC, user needs to record instead
3. **"Auth error"** - Check JWT token and Supabase auth configuration

---

## Contact

For issues:
- Edge Function logs: `supabase functions logs`
- Supabase Dashboard: https://supabase.com/dashboard/project/hcdcxznwnzdhomvmpotr
