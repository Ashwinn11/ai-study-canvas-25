# Gen Z Copy Updates - Web App Reference

## Overview
This document maps all user-facing text changes from formal corporate language to casual Gen Z slang to make Masterly feel like a supportive friend instead of a corporate learning platform.

## Copy Philosophy
- **Casual & Friendly**: Use lowercase, contractions, and conversational tone
- **Authentic Slang**: "no cap", "fr" (for real), "locked in", "cooking"
- **Emoji Usage**: Strategic use of emojis for emphasis (🔥💪✨🎯🧊)
- **Supportive**: Encouraging without being patronizing
- **Brief**: Keep it short and punchy

---

## Dashboard Copy

### Greetings

| Before | After |
|--------|-------|
| "Ready to master something new?" | "ready to lock in? 💪" |
| "Keep the momentum going" | "keep that energy up ✨" |
| "Finish your day strong" | "end the day on a high note 🎯" |

### Daily Goal Status

| Before | After |
|--------|-------|
| "Goal Crushed!" | "no cap, you're on fire 🔥" |
| "Daily goal crushed!" | "daily goal crushed! 🎯" |
| "You reviewed X cards today!" | "X cards crushed today! 💪" |

### Streak Display

| Before | After |
|--------|-------|
| "Day Streak" | "day streak 🔥" |
| "Current Streak" | "current streak" |

---

## Exam Pages Copy

### Zero States

| Before | After |
|--------|-------|
| "No exams yet" | "no exams yet 👀" |
| "Create your first exam to organize your study materials and track your progress" | "add your first exam to get started 📚" |
| "No review items available for this exam yet. Generate flashcards and quizzes from your seeds first." | "no cards ready yet - generate some flashcards first 📝" |

### Status Messages

| Before | After |
|--------|-------|
| "All caught up!" | "all caught up! 🎉" |
| "Cards Due" | "cards due" |
| "Review Due" | "time to review 📖" |

---

## Review Session Copy

### Progress Messages

| Before | After |
|--------|-------|
| "You're building momentum!" | "you're building momentum! 🚀" |
| "Great flow—keep going!" | "great flow—keep going! 🔥" |
| "Nice streak, stay sharp!" | "nice streak, stay sharp! ⚡" |
| "Learning mode: engaged!" | "locked in fr 💪" |
| "Brains are warming up!" | "big brain energy 🧠" |

### Completion Modal

| Before | After |
|--------|-------|
| "SESSION REPORT" | "BRAIN GAINS RECEIPT 🧾" |
| "Session Report" | "session report" |
| "COMPLETED" | "COMPLETED ✅" |

---

## Achievement & Celebration Copy

### Achievement Unlocks

| Before | After |
|--------|-------|
| "Achievement Unlocked!" | "YOU DID THAT! 🔥" |
| "You earned a new badge!" | "new badge unlocked! 🏆" |

### Daily Goal Celebrations

| Before | After |
|--------|-------|
| "Daily Goal Crushed!" | "Daily Goal Crushed! 🎯" |
| "You reviewed X cards today!" | "X cards crushed today! 💪" |

### Streak Freeze Messages

| Before | After |
|--------|-------|
| "Freeze Earned!" | "Freeze Earned! 🧊" |
| "You earned a streak freeze for your 7-day streak!" | "Your streak is now protected 🛡️" |
| "Streak saved! 1 freeze used" | "Streak Saved! 🧊 - 1 freeze used to protect your streak" |

### Combo Counter Messages

| Before | After |
|--------|-------|
| N/A | "5x COMBO! 🔥 - you're on fire!" |
| N/A | "10x COMBO! 🔥 - no cap, you're cooking!" |
| N/A | "15x COMBO! 🔥 - absolute legend!" |

### Mid-Session Encouragement

Random messages shown every 10 cards:
- "you're cooking! 🔥"
- "big brain energy 🧠"
- "locked in fr 💪"
- "no cap, you're crushing it 🎯"
- "keep going bestie! ✨"

### Progress Milestones

| Before | After |
|--------|-------|
| N/A | "Halfway there! 💪" |

---

## Onboarding & Upload Copy

### Upload States

| Before | After |
|--------|-------|
| "Upload notes to start" | "add your first material 📚" |
| "Add materials" | "add materials 📝" |

### Buttons

| Before | After |
|--------|-------|
| "Continue Learning" | "Keep Going" |
| "Get Started" | "let's go 🚀" |

---

## Profile & Stats Copy

### Quick Stats

| Before | After |
|--------|-------|
| "Cards Reviewed" | "cards reviewed" |
| "Avg Grade" | "avg grade" |
| "Day Streak" | "day streak" |

---

## Implementation Notes

1. **Consistency**: Use lowercase for most text except proper nouns and acronyms
2. **Emoji Placement**: Place emojis at the end of sentences or after key words
3. **Tone**: Keep it supportive and encouraging, never condescending
4. **Slang Usage**: Use Gen Z slang naturally, don't force it
5. **Testing**: Test all copy changes to ensure they fit within UI constraints

---

## Files to Update

### High Priority
1. `app/(app)/dashboard/page.tsx` - Dashboard greetings and goal messages
2. `app/(app)/exams/page.tsx` - Zero states and status messages
3. `app/(app)/exams/[id]/review/page.tsx` - Review session and completion modal
4. `src/components/profile/QuickStats.tsx` - Stats labels

### Medium Priority
5. Onboarding screens
6. Upload screens
7. Achievement modals
8. Toast notifications

---

## Testing Checklist

- [ ] Dashboard greetings display correctly
- [ ] Daily goal messages show proper copy
- [ ] Exam zero states are friendly and encouraging
- [ ] Review session messages are motivating
- [ ] Completion modal has Gen Z vibe
- [ ] Achievement toasts use new copy
- [ ] All text fits within UI constraints
- [ ] Emoji rendering works across browsers
