import type { AgenticTweet, ContentPlan, ResearchBrief } from "@/lib/ai/agentic-types";
import type { XSubscriptionTier } from "@/lib/schemas/common";
import { canPostLongContent, getMaxCharacterLimit } from "@/lib/services/x-subscription";

// ── Language helpers ──────────────────────────────────────────────────────────

function languageInstruction(language: string): string {
  if (language === "ar") {
    return `LANGUAGE: Arabic (ar)
- Write ALL content natively in Modern Standard Arabic or Gulf/Levantine dialect as appropriate for social media
- Do NOT translate from English — think and write directly in Arabic
- Use Arabic-native expressions, idioms, and cultural references relevant to the MENA region
- Hashtags: mix Arabic hashtags (with # prefix) and relevant English hashtags
- Numbers, statistics, and proper nouns may remain in their conventional form
- JSON keys MUST remain in English — only the content values should be in Arabic`;
  }
  return `LANGUAGE: ${language}
- Write ALL content in ${language}
- Use natural, idiomatic expressions for this language — not literal translations
- JSON keys MUST remain in English`;
}

// ── 5A: Research prompt ───────────────────────────────────────────────────────

export function buildResearchPrompt(
  topic: string,
  language: string,
  audience = "general audience"
): string {
  return `You are a social media research analyst specializing in viral content for the MENA region and global markets.

TASK: Analyze the topic below and identify the most engaging angles for a Twitter/X post.

TOPIC: "${topic}"
AUDIENCE: ${audience}

${languageInstruction(language)}

RESEARCH FRAMEWORK:
- Think about what is currently driving engagement on X/Twitter for this topic
- Consider controversy, novelty, counter-intuitive facts, practical value, and emotional resonance
- Rank angles by their viral potential on X — not just informational value
- Only include hashtags that are genuinely used on X (no invented tags)
- Hashtags should be a mix of high-volume discovery tags and niche community tags

BROAD TOPIC DETECTION:
If the topic is too vague or broad to produce focused content (e.g., "technology", "business", "sports", "life", "news", "social media", "health"), you MUST set "too_broad": true and provide 4–5 specific, actionable subtopic suggestions in "broadSuggestions" that would each make a compelling post. Do NOT set too_broad for specific topics like "AI coding tools" or "Ramadan marketing campaigns".

Return ONLY valid JSON. No markdown, no explanation, no preamble.

{
  "topic": "${topic}",
  "angles": [
    {
      "title": "concise angle title (max 60 chars)",
      "description": "1-2 sentences explaining the angle and why it resonates",
      "viralPotential": "high" | "medium" | "low"
    }
  ],
  "trendingHashtags": ["hashtag1", "hashtag2"],
  "keyFacts": ["fact or statistic that strengthens the content"],
  "recommendedAngle": "title of the single best angle (must match one of the angle titles above)",
  "too_broad": true,
  "broadSuggestions": ["Specific subtopic 1", "Specific subtopic 2"]
}

RULES:
- Provide exactly 3–5 angles, ranked from highest to lowest viral potential
- Include 5–8 hashtags (no spaces, no # prefix needed — the system adds it)
- List 3–5 key facts or statistics; cite source type if relevant (e.g., "According to recent reports...")
- The recommendedAngle MUST match the title of the angle with the highest viral score
- Omit "too_broad" and "broadSuggestions" entirely if the topic is specific enough`;
}

// ── 5B: Strategy prompt ───────────────────────────────────────────────────────

export function buildStrategyPrompt(
  brief: ResearchBrief,
  tier: XSubscriptionTier,
  language: string,
  preferences?:
    | {
        tone?: string | undefined;
        audience?: string | undefined;
        includeImages?: boolean | undefined;
      }
    | undefined
): string {
  const canUseLong = canPostLongContent(tier);
  const maxChars = getMaxCharacterLimit(tier);
  const toneHint = preferences?.tone ?? "auto";
  const audience = preferences?.audience ?? "general audience";
  const includeImages = preferences?.includeImages !== false;

  const tierBlock = canUseLong
    ? `ACCOUNT TIER: ${tier} (Premium)
Available formats:
  • Single tweet — SHORT (≤280 chars): for punchy, viral takes
  • Single tweet — MEDIUM (281–1,000 chars): for thought leadership and detailed analysis
  • Single tweet — LONG (1,001–${maxChars} chars): for long-form stories and deep dives
  • Thread (3–10 tweets, each ≤280 chars): for educational content, step-by-step guides, listicles`
    : `ACCOUNT TIER: ${tier} (Free/Basic)
Available formats:
  • Single tweet — SHORT (≤280 chars): for punchy, viral takes
  • Thread (3–10 tweets, each ≤280 chars): for topics requiring more depth
  NOTE: Medium and Long single posts are NOT available on this tier`;

  return `You are an expert social media content strategist who maximizes engagement on X/Twitter.

TASK: Choose the optimal content format and structure for the following research brief.

${tierBlock}

RESEARCH BRIEF:
${JSON.stringify(brief, null, 2)}

TONE PREFERENCE: ${toneHint === "auto" ? "Choose the tone that best fits the topic and recommended angle" : toneHint}
AUDIENCE: ${audience}
LANGUAGE: ${language}
INCLUDE IMAGES: ${includeImages}

ENGAGEMENT PRINCIPLES:
- Threads outperform single posts for educational/listicle content (higher save rate)
- Single long posts outperform threads for opinion/thought leadership (higher repost rate)
- Images significantly increase engagement — use them on tweets with statistics or key claims
- The hook (first tweet or opening line) determines whether anyone reads the rest

THREAD STRUCTURE BEST PRACTICES:
- Tweet 1: Hook — a bold claim, surprising fact, or compelling question
- Tweet 2–N-1: Value delivery — one insight, step, or example per tweet
- Tweet N: CTA — follow for more, reply with your take, or share if useful
- Optimal thread length: 5–7 tweets (3 minimum, 10 maximum)

Return ONLY valid JSON. No markdown, no explanation, no preamble.

{
  "format": "single" | "thread",
  "lengthOption": "short" | "medium" | "long",
  "tweetCount": number,
  "tone": "string",
  "structure": "narrative description, e.g. hook → 3 value points → CTA",
  "imageSlots": [0, 2],
  "rationale": "one sentence explaining why this format was chosen"
}

RULES:
- tweetCount must be 1 for single format; 3–10 for thread format
- imageSlots: 0-based indices of tweets that should have images; max 2 images per thread; empty array [] if includeImages is false
- Choose image slots strategically: tweet 0 (hook) and the most data-rich tweet
- ${canUseLong ? `lengthOption may be "short", "medium", or "long" for single posts` : `lengthOption MUST be "short" — this account cannot use medium or long`}
- rationale should explain why this format beats alternatives for this specific topic`;
}

// ── 5C: Writing prompt ────────────────────────────────────────────────────────

export function buildWritingPrompt(
  brief: ResearchBrief,
  plan: ContentPlan,
  voiceProfile: string | null,
  language: string
): string {
  const charLimit =
    plan.lengthOption === "long" ? 2000 : plan.lengthOption === "medium" ? 1000 : 280;
  const isThread = plan.format === "thread";

  const formatRule = isThread
    ? `FORMAT: Thread with exactly ${plan.tweetCount} tweets
- Each individual tweet: ≤280 characters (including hashtags) — this is a hard limit enforced by X
- Tweet 1 MUST be a scroll-stopping hook
- Tweet ${plan.tweetCount} MUST include a clear CTA (call to action)
- Thread numbering: do NOT add "1/" or "🧵" markers — the platform handles this`
    : `FORMAT: Single post
- Maximum ${charLimit} characters total (including hashtags)
- Open strong — the first sentence determines whether anyone stops scrolling`;

  const voiceBlock = voiceProfile
    ? `\nVOICE & STYLE (match this user's writing style exactly):
${voiceProfile}
`
    : "";

  return `You are a world-class social media copywriter who creates content that people actually want to read and share.

TASK: Write the complete content following the strategy below.

RESEARCH BRIEF:
${JSON.stringify(brief, null, 2)}

CONTENT PLAN:
${JSON.stringify(plan, null, 2)}
${voiceBlock}
${languageInstruction(language)}

${formatRule}

IMAGE SLOTS (0-based indices requiring imagePrompt): ${JSON.stringify(plan.imageSlots)}

COPYWRITING PRINCIPLES:
- Every sentence must earn the next — cut anything that doesn't add value
- Use concrete specifics (numbers, names, examples) over vague generalities
- Vary sentence length — short punchy sentences create rhythm
- The hook must create curiosity, not reveal the answer
- Hashtags should feel natural, not appended — place them at the end or weave them in
- For Arabic: use expressions that resonate with Arab social media culture, not formal MSA prose

IMAGE PROMPT GUIDELINES (for hasImage: true tweets):
- Write a detailed, specific Replicate/Stable Diffusion prompt
- Style: professional editorial photography or clean infographic
- Specify: subject, lighting, mood, color palette, composition
- Example: "Professional flat-lay photo of a laptop keyboard with glowing code on screen, blue and purple ambient lighting, dark background, high contrast, editorial style"

Return ONLY valid JSON. No markdown, no explanation, no preamble.

[
  {
    "position": 0,
    "text": "tweet text (NO hashtags in text — they go in the hashtags array)",
    "hashtags": ["tag1", "tag2"],
    "hasImage": false,
    "imagePrompt": "only include this field when hasImage is true",
    "charCount": 142
  }
]

RULES:
- Array must have exactly ${plan.tweetCount} items
- position is 0-based
- text must NOT contain # hashtags — put them in hashtags array only
- hashtags: 2–3 tags maximum per tweet; only include in tweet[0] and tweet[last]; others should be []
- charCount: character count of text + space + all hashtags combined (with # prefix)
- hasImage: true ONLY for tweets at indices ${JSON.stringify(plan.imageSlots)}
- imagePrompt: include ONLY when hasImage is true; omit the field entirely when hasImage is false`;
}

// ── 5D: Review prompt ─────────────────────────────────────────────────────────

export function buildReviewPrompt(
  brief: ResearchBrief,
  tweets: AgenticTweet[],
  plan: ContentPlan
): string {
  const charLimit =
    plan.format === "thread"
      ? 280
      : plan.lengthOption === "long"
        ? 2000
        : plan.lengthOption === "medium"
          ? 1000
          : 280;
  const tweetSummaries = tweets
    .map(
      (t, i) =>
        `[${i}] (${t.charCount} chars) "${t.text.slice(0, 80)}${t.text.length > 80 ? "…" : ""}"`
    )
    .join("\n");

  return `You are a senior editor and content quality reviewer for a social media publishing platform.

TASK: Review the generated content for quality, accuracy, and compliance before publishing.

ORIGINAL TOPIC: "${brief.topic}"
RECOMMENDED ANGLE: "${brief.recommendedAngle}"
FORMAT: ${plan.format === "thread" ? `Thread (${plan.tweetCount} tweets)` : `Single post (${plan.lengthOption})`}
CHARACTER LIMIT: ${charLimit} chars per tweet${plan.format === "thread" ? " (hard X platform limit)" : ""}

CONTENT TO REVIEW:
${tweetSummaries}

FULL CONTENT:
${JSON.stringify(tweets, null, 2)}

REVIEW CHECKLIST:
1. CHARACTER LIMITS: Does every tweet comply? (${charLimit} char max)
2. HOOK QUALITY: Does tweet[0] create curiosity and stop the scroll?
3. CTA PRESENCE: Does the last tweet include a clear call to action?
4. FACTUAL ALIGNMENT: Does the content match the research brief's key facts?
5. FLOW: Do the tweets form a coherent narrative from hook to CTA?
6. LANGUAGE QUALITY: Grammar, style, naturalness in the target language
7. HASHTAG QUALITY: Are hashtags relevant and not spammy?
8. ENGAGEMENT POTENTIAL: Would you personally share or save this content?

SCORING GUIDE:
- 9–10: Exceptional content, ready to post immediately
- 7–8: Good content with minor improvements possible
- 5–6: Adequate but generic; needs improvement
- 3–4: Significant issues with quality or compliance
- 1–2: Fundamental problems; consider regenerating

Return ONLY valid JSON. No markdown, no explanation, no preamble.

{
  "qualityScore": number (1–10),
  "summary": "one compelling sentence describing what this content is about (written as if promoting it)",
  "issues": [
    "Specific issue description (e.g., 'Tweet 2 is 312 chars — exceeds 280 char limit')"
  ],
  "passed": true | false
}

RULES:
- passed: true if qualityScore ≥ 6 and no character limit violations; false otherwise
- issues: empty array [] if no problems found; be specific and actionable
- summary: write the summary in the same language as the content`;
}
