# AI Voice Profile

> Train the AI to write exactly like you by analyzing your best tweets.

## Overview

The AI Voice Profile feature allows Pro and Agency users to personalize AI-generated content by teaching the system their unique writing style. Users provide 3-10 sample tweets, and the AI analyzes them to build a comprehensive writing profile covering tone, sentence structure, vocabulary, formatting habits, and more.

Once created, the voice profile is automatically injected into AI prompts — ensuring every thread, hook, CTA, and rewrite sounds like the user wrote it themselves.

## User Flow

### 1. Create a Voice Profile

1. Navigate to **Settings** (`/dashboard/settings`) → scroll to **AI Voice** section
2. Paste **3-10 sample tweets** into the text areas (minimum 10 characters each)
   - These should be your best-performing or most representative tweets
   - The more samples, the more accurate the profile
3. Click **"Generate Voice Profile"**
4. The AI analyzes your samples and extracts:
   - **Tone** — e.g., authoritative, conversational, humorous
   - **Style Keywords** — defining characteristics of your writing
   - **Sentence Structure** — short & punchy vs. long & flowing
   - **Vocabulary Level** — technical jargon vs. simple language
   - **Emoji Usage** — how and when you use emojis
   - **Formatting Habits** — line breaks, lowercase style, lists, etc.
   - **Do's and Don'ts** — specific rules derived from your style
5. The profile is saved and displayed for review

### 2. Use It

Once created, the voice profile works automatically. When you use any supported AI tool:

- **Thread Writer** — generates threads in your voice
- **Hook Generator** — writes hooks that sound like you
- **CTA Generator** — creates calls-to-action matching your style
- **Rewrite Tool** — rewrites content preserving your voice

No additional action is needed — the profile is injected into every AI prompt behind the scenes.

### 3. Manage the Profile

- **View**: The active profile is displayed in Settings with all analyzed fields
- **Reset**: Click **"Reset Profile"** to delete and start fresh

## Plan Requirements

| Plan   | Access                                           |
| ------ | ------------------------------------------------ |
| Free   | Not available (shows Pro badge + upgrade prompt) |
| Pro    | Full access                                      |
| Agency | Full access                                      |

---

## Technical Design

### Database Schema

The voice profile is stored as a single `jsonb` column in the `user` table:

```sql
-- src/lib/schema.ts (line 130)
voice_profile jsonb DEFAULT NULL
```

**Why jsonb?** The profile has a variable number of fields (keywords array, rules array, etc.) that don't map cleanly to flat columns. `jsonb` allows schema evolution without migrations.

### Voice Profile Data Shape

```typescript
{
  tone: string;              // max 200 chars — e.g., "Authoritative yet approachable"
  styleKeywords: string[];   // max 10 items, 50 chars each — e.g., ["concise", "data-driven"]
  emojiUsage: string;        // max 200 chars — e.g., "Minimal, only for emphasis"
  sentenceStructure: string; // max 200 chars — e.g., "Short punchy sentences, no flowery prose"
  vocabularyLevel: string;   // max 200 chars — e.g., "Simple English, avoids jargon"
  formattingHabits: string;  // max 200 chars — e.g., "Heavy use of line breaks, lowercase only"
  doAndDonts: string[];      // max 10 items, 150 chars each — e.g., ["Never use hashtags in the middle", "Always start with a bold claim"]
}
```

### Zod Validation Schema

Defined in `src/lib/ai/voice-profile.ts`:

```typescript
export const voiceProfileSchema = z.object({
  tone: noNewline("tone").max(200),
  styleKeywords: z.array(noNewline("styleKeywords item").max(50)),
  emojiUsage: noNewline("emojiUsage").max(200),
  sentenceStructure: noNewline("sentenceStructure").max(200),
  vocabularyLevel: noNewline("vocabularyLevel").max(200),
  formattingHabits: noNewline("formattingHabits").max(200),
  doAndDonts: z.array(noNewline("doAndDonts item").max(150)),
});
```

The `noNewline` refinement rejects any value containing `\n` or `\r` — critical for prompt injection prevention.

---

## Security Architecture

The voice profile is user-controlled text that gets interpolated into AI prompts. This makes it a potential prompt injection vector. The implementation uses a **3-layer defense**:

### Layer 1: Write-Time Schema Validation

The Zod schema enforces:

- **No newlines** — `noNewline()` refinement rejects `\n` and `\r` characters
- **Max lengths** — every field has strict character limits
- **Array bounds** — keywords (max 10) and rules (max 10) are bounded
- Applied at both the API endpoint (user input) and re-validated on AI output before saving

### Layer 2: Read-Time Re-Validation

`buildVoiceInstructions()` re-validates the DB value against the same schema every time it's read:

```typescript
export function buildVoiceInstructions(raw: unknown): string {
  if (!raw) return "";
  const parsed = voiceProfileSchema.safeParse(raw);
  if (!parsed.success) return ""; // Reject corrupted/legacy data
  // ... build prompt
}
```

**Fail-closed design**: if the data is corrupted, tampered, or doesn't match the schema, an empty string is returned — never raw untrusted data.

### Layer 3: Sanitization Before Interpolation

Every field value is sanitized via `sanitizeFieldValue()` before being interpolated into the prompt:

```typescript
export function sanitizeFieldValue(text: string, maxLength: number): string {
  return text
    .replace(/[\x00-\x1f\x7f]/g, " ") // Strip ALL control characters
    .replace(/ {2,}/g, " ") // Collapse multiple spaces
    .trim()
    .slice(0, maxLength);
}
```

This strips control characters, normalizes whitespace, and enforces length limits as a final safeguard.

### Security Review

Documented in `docs/audit/full-stack-code-review-2026-03-16.md` (Finding 1.5, fixed 2026-03-15).

---

## Prompt Building

### Generated Prompt Block

When a user has an active voice profile, this block is appended to AI prompts:

```
Voice Profile Instructions:
- Tone: {tone}
- Style Keywords: {keyword1}, {keyword2}, ...
- Sentence Structure: {structure}
- Vocabulary: {vocabulary}
- Emoji Usage: {emoji}
- Formatting: {formatting}
- Rules: {rule1}; {rule2}; ...

ADHERE STRICTLY TO THIS WRITING STYLE. Mimic the user's voice perfectly.
```

### Function Signature

```typescript
// src/lib/ai/voice-profile.ts
export function buildVoiceInstructions(raw: unknown): string;
```

- Input: raw `voiceProfile` value from database (`unknown` type for safety)
- Output: formatted prompt block, or `""` if no profile / invalid data
- Called by: `ai-preamble.ts` → fetched via `dbUser.voiceProfile`

---

## API Endpoints

### `POST /api/user/voice-profile` — Analyze & Save

Analyzes sample tweets and creates a voice profile.

**Request:**

```json
{
  "tweets": [
    "Sample tweet text (min 10 chars, max 560)...",
    "Another sample...",
    "At least 3 samples required (max 10)"
  ]
}
```

**Validation:** 3-10 tweets, each 10-560 characters.

**Process:**

1. Authenticate session
2. Check Pro/Agency plan (returns 402 for Free users)
3. Send tweets to AI (OpenRouter) with analysis prompt
4. AI returns structured profile matching the Zod schema
5. Re-validate AI output against the schema before saving
6. Store in `user.voiceProfile` jsonb column

**Response:**

```json
{
  "tone": "...",
  "styleKeywords": ["..."],
  "emojiUsage": "...",
  "sentenceStructure": "...",
  "vocabularyLevel": "...",
  "formattingHabits": "...",
  "doAndDonts": ["..."]
}
```

### `GET /api/user/voice-profile` — Fetch Current

Returns the user's current voice profile or `null`.

**Response:** Same shape as POST response, or `{ "voiceProfile": null }`.

### `DELETE /api/user/voice-profile` — Delete

Clears the voice profile (sets `voice_profile` to `NULL` in database).

**Response:** `{ "success": true }`

---

## Integration Points

### Routes That Use Voice Profile

| Route                         | File                             | Integration                                                         |
| ----------------------------- | -------------------------------- | ------------------------------------------------------------------- |
| Thread Writer                 | `src/app/api/ai/thread/route.ts` | `buildVoiceInstructions(dbUser?.voiceProfile)` injected into prompt |
| AI Tools (Hook, CTA, Rewrite) | `src/app/api/ai/tools/route.ts`  | `buildVoiceInstructions(dbUser?.voiceProfile)` injected into prompt |

### Routes That Do NOT Use Voice Profile

| Route       | File                                | Reason                                                              |
| ----------- | ----------------------------------- | ------------------------------------------------------------------- |
| Translate   | `src/app/api/ai/translate/route.ts` | Translation should preserve source meaning, not impose user's style |
| Affiliate   | `src/app/api/ai/affiliate/route.ts` | Affiliate tweets have specific promotional style requirements       |
| Chat        | `src/app/api/chat/route.ts`         | Chat is conversational, not tweet-style writing                     |
| Inspiration | `src/app/api/ai/inspire/route.ts`   | Inspiration generates ideas, not user-voiced content                |

### Shared Preamble Helper

All AI routes call `aiPreamble()` from `src/lib/api/ai-preamble.ts`, which:

1. Authenticates the session
2. Fetches `dbUser` with `plan` and `voiceProfile` fields
3. Checks rate limits and plan access
4. Validates AI quota
5. Instantiates the OpenRouter model

The `voiceProfile` is available on `dbUser` for any route that wants to use it.

---

## UI Component

### Settings Form (`src/components/settings/voice-profile-form.tsx`)

**States:**

- `samples: string[]` — Array of tweet text areas (default: 3 empty)
- `profile: VoiceProfile | null` — Current active profile
- `isLoading: boolean` — Initial profile fetch
- `isAnalyzing: boolean` — AI analysis in progress

**Features:**

- Dynamic tweet sample inputs (3 minimum, 10 maximum)
- "Add another sample" button
- Validation: minimum 3 non-empty samples with 10+ characters
- Loading spinner during analysis
- Active profile display with all analyzed fields
- "Reset Profile" delete button with confirmation
- Pro feature badge with upgrade modal for Free users
- Success/error toast notifications

### Settings Page Integration

```tsx
// src/app/dashboard/settings/page.tsx (lines 204-207)
<div id="voice" className="scroll-mt-24">
  <VoiceProfileForm />
</div>
```

---

## File Reference

| File                                             | Purpose                                                       |
| ------------------------------------------------ | ------------------------------------------------------------- |
| `src/lib/ai/voice-profile.ts`                    | Core module: schema, sanitization, `buildVoiceInstructions()` |
| `src/lib/schema.ts`                              | Database schema (`voiceProfile` jsonb column, line 130)       |
| `src/lib/api/ai-preamble.ts`                     | Shared AI route helper (fetches `voiceProfile` on `dbUser`)   |
| `src/app/api/user/voice-profile/route.ts`        | API endpoint (POST/GET/DELETE)                                |
| `src/components/settings/voice-profile-form.tsx` | Settings UI component                                         |
| `src/app/dashboard/settings/page.tsx`            | Settings page (renders form)                                  |
| `src/app/api/ai/thread/route.ts`                 | Thread writer (uses voice profile)                            |
| `src/app/api/ai/tools/route.ts`                  | AI tools — Hook, CTA, Rewrite (uses voice profile)            |

---

## Future Considerations

1. **Extend coverage** — Voice profile could be injected into translate and affiliate routes for users who want their style preserved across all AI outputs
2. **Manual editing** — Allow users to manually tweak individual profile fields after generation
3. **Live preview** — Show a sample AI-generated tweet using the voice profile so users can test it before saving
4. **Auto-analyze best tweets** — Pull top-performing tweets from analytics instead of requiring manual paste
5. **Multiple profiles** — Support different voices for different contexts (professional account vs. personal)
