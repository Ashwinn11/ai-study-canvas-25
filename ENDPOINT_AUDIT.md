# API Endpoint Audit - Web App vs Backend Server

## Backend Server Endpoints (Actually Available)

From `/tmp/masterly-ios/backend-source/server.js`:

### ✅ Document Processing
- `POST /api/documentai/process` - PDF/Image OCR processing
- `POST /api/document/extract` - Document extraction
- `POST /api/audio/transcribe` - Audio transcription
- `POST /api/video/transcribe` - Video transcription

### ✅ AI/Chat
- `POST /api/ai/chat` - Chat endpoint

### ✅ Utility
- `POST /api/cleanup` - Cleanup operations
- `GET /health` - Health check

### ✅ Configuration
- `GET /api/config` - General config
- `GET /api/config/bloom` - Bloom taxonomy config
- `GET /api/config/messages/:locale` - Localized messages
- `GET /api/config/prompts` - Prompt templates
- `GET /api/config/intent-distributions` - Intent distributions
- `GET /api/config/subscription` - Subscription config
- `GET /api/config/contact` - Contact info
- `GET /api/config/onboarding` - Onboarding config
- `GET /api/config/faq` - FAQ data

### ✅ Admin
- `GET /api/admin/prompts` - Get all prompts
- `PUT /api/admin/prompts/:type` - Update prompt
- `POST /api/admin/prompts/:type/render` - Render prompt
- `POST /api/admin/prompts/clear-cache` - Clear prompt cache

---

## Endpoints Called by Web App (What We're Trying to Use)

### ❌ **DOES NOT EXIST**: `/api/ai/flashcards`
- **File:** `src/lib/api/flashcards.ts:34`
- **Usage:** Generate flashcards from seed content
- **Status:** **ENDPOINT MISSING FROM BACKEND**

### ❌ **DOES NOT EXIST**: `/api/ai/feynman`
- **File:** `src/lib/api/documentProcessing.ts:235`
- **Usage:** Generate Feynman-style explanations
- **Status:** **ENDPOINT MISSING FROM BACKEND** (404 in logs)
- **Already disabled in:** `src/lib/api/upload.ts:158, 243`

### ❌ **DOES NOT EXIST**: `/api/generate/quiz`
- **File:** `src/lib/api/quiz.ts:70`
- **Usage:** Generate quiz questions from seed content
- **Status:** **ENDPOINT MISSING FROM BACKEND**

### ✅ **EXISTS**: `/api/document/extract`
- **File:** Used in `src/lib/api/documentProcessing.ts`
- **Status:** ✅ Works (confirmed in logs: "✅ POST /api/document/extract | 200")

### ✅ **EXISTS**: `/api/documentai/process`
- **File:** `src/lib/api/documentProcessing.ts:53`
- **Status:** ✅ Should work

---

## Critical Issues Found

### 🔴 Issue #1: Flashcard Generation Completely Broken
**Web app calls:** `POST /api/ai/flashcards`
**Backend has:** Nothing

**Impact:** Users cannot generate flashcards at all

### 🔴 Issue #2: Quiz Generation Completely Broken
**Web app calls:** `POST /api/generate/quiz`
**Backend has:** Nothing

**Impact:** Users cannot generate quiz questions at all

### 🔴 Issue #3: Feynman Explanation Broken (Already Fixed)
**Web app calls:** `POST /api/ai/feynman`
**Backend has:** Nothing
**Status:** ✅ Already commented out in upload.ts

---

## How iOS App Works vs Web App

### iOS App Approach
Looking at iOS services, they likely:
1. Generate content **locally** using internal services
2. Use `contentGeneratorService.generateFlashcardsFromSeed()`
3. Use `contentGeneratorService.generateQuizFromSeed()`
4. **Do NOT call backend HTTP endpoints** for generation

### Web App Mistake
Web app tries to:
1. Call backend HTTP endpoints that don't exist
2. Expects backend to handle AI generation
3. **This doesn't match the backend server implementation**

---

## Solutions

### Option 1: Use Existing `/api/ai/chat` Endpoint
The backend HAS `/api/ai/chat` - we could potentially use this for generation by:
1. Sending appropriate prompts for flashcard generation
2. Sending appropriate prompts for quiz generation
3. Parsing the chat response into structured data

**Pros:** Uses existing endpoint
**Cons:** Chat endpoint might not be designed for structured output

### Option 2: Add Missing Endpoints to Backend
Add to `server.js`:
```javascript
app.post("/api/ai/flashcards", async (req, res) => { ... });
app.post("/api/generate/quiz", async (req, res) => { ... });
```

**Pros:** Clean API design
**Cons:** Need to modify backend server

### Option 3: Check if There's Another Backend Server
The iOS app might use a **different backend server** for AI generation.

**Action:** Search iOS code for where flashcards/quiz are actually generated

---

## Immediate Actions Required

1. ✅ **DONE**: Disable `/api/ai/feynman` calls (already commented out)

2. ❌ **TODO**: Fix flashcard generation in `src/lib/api/flashcards.ts`
   - Currently calls non-existent `/api/ai/flashcards`
   - Need to find correct endpoint or implementation

3. ❌ **TODO**: Fix quiz generation in `src/lib/api/quiz.ts`
   - Currently calls non-existent `/api/generate/quiz`
   - Need to find correct endpoint or implementation

4. ❌ **TODO**: Check iOS code to see how it ACTUALLY generates flashcards/quiz
   - Look for the real API endpoint or local generation

---

## Environment Variables

The web app uses:
- `NEXT_PUBLIC_API_BASE_URL` - Points to backend server
- `NEXT_PUBLIC_SERVER_URL` - Also points to backend server (redundant?)

Both should point to: `https://masterly-server-463902357410.us-central1.run.app`

---

## Next Steps

1. Search iOS code for actual flashcard/quiz generation implementation
2. Determine if there's a different API server or local generation
3. Update web app to match iOS implementation
4. Remove calls to non-existent endpoints
