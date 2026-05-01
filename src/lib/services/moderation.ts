import "server-only";

import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { moderationFlag, type InsertModerationFlag } from "@/lib/schema";

// ============================================================================
// Types
// ============================================================================

export interface ModerationResult {
  flagged: boolean;
  categories: string[];
}

// ============================================================================
// Pattern-based keyword/pattern checks for Phase 1
// ============================================================================

/** Hate speech patterns — targeting protected groups, slurs, incitement */
const HATE_SPEECH_PATTERNS = [
  // Ethnic/racial slurs (covered as regex fragments)
  /\b(kill all|exterminate|wipe out)\s+(the\s+)?\w+(s|ers|people)\b/i,
  // Religious hate
  /\b(infidel|kafir|apostate)\s+(must|should|deserve)\s+(die|be killed|be punished)\b/i,
  // Dehumanizing language
  /\b(subhuman|vermin|cockroach|parasite|scum)\b.*\b(must|need|should)\s+(be|get)\s+(eliminated|eradicated|wiped out)\b/i,
];

/** Harassment patterns — targeted abuse, doxxing threats, intimidation */
const HARASSMENT_PATTERNS = [
  // Direct threats of violence
  /\b(I('ll| will) (kill|hurt|destroy|end|murder) you)\b/i,
  /\b(you (deserve|should) (to )?(die|be killed|be hurt))\b/i,
  // Doxxing threats
  /\b(I('ll| will) (dox|doxx|leak|expose|post) (your )?(address|location|phone|number|info))\b/i,
  // Coordinated harassment
  /\b(everyone|everybody|all of you|y'all) (go )?(attack|harass|report|brigade|mass report) (this|that|them)\b/i,
];

/** Self-harm / suicide promotion patterns */
const SELF_HARM_PATTERNS = [
  // Encouraging self-harm
  /\b(you should|just|go) (kill yourself|end it|commit suicide|cut yourself|self[- ]?harm)\b/i,
  // Suicide encouragement
  /\b(kill yourself|kys|commit suicide)\b.*\b(now|today|tonight|please)\b/i,
  // Detailed methods
  /\b(here('s| is) how to) (kill yourself|commit suicide|hang yourself|overdose)\b/i,
];

/** Sexual content involving minors patterns */
const MINOR_SEXUAL_PATTERNS = [
  // CSAM-related terms
  /\b(cp|csam|child\s*porn|underage\s*(porn|nude|sex|content))\b/i,
  // Grooming patterns
  /\b(under\s*(18|age)|minor|teen\s*(girl|boy|child))\b.*\b(pics|pictures|photos|nudes|cam|meet)\b/i,
];

/** Violence / graphic content patterns */
const VIOLENCE_PATTERNS = [
  // Gore/explicit violence
  /\b(beheading|decapitation|mutilation|torture|dismemberment)\b.*\b(video|photo|watch|see)\b/i,
  // Terrorism content
  /\b(how to make|instructions for) (a\s+)?(bomb|explosive|IED|weapon)\b/i,
];

/** All pattern checks grouped by category */
const CATEGORY_CHECKS: [string, RegExp[]][] = [
  ["hate_speech", HATE_SPEECH_PATTERNS],
  ["harassment", HARASSMENT_PATTERNS],
  ["self_harm", SELF_HARM_PATTERNS],
  ["sexual_minors", MINOR_SEXUAL_PATTERNS],
  ["violence", VIOLENCE_PATTERNS],
];

// ============================================================================
// OpenAI Moderation API (primary when key is available)
// ============================================================================

const OPENAI_MODERATION_URL = "https://api.openai.com/v1/moderations";

interface OpenAIModerationResponse {
  results: {
    flagged: boolean;
    categories: Record<string, boolean>;
    category_scores: Record<string, number>;
  }[];
}

/**
 * Maps OpenAI moderation category names to our internal category names.
 * OpenAI returns categories like "hate", "hate/threatening", "self-harm", etc.
 */
const OPENAI_CATEGORY_MAP: Record<string, string> = {
  hate: "hate_speech",
  "hate/threatening": "hate_speech",
  harassment: "harassment",
  "harassment/threatening": "harassment",
  "self-harm": "self_harm",
  "self-harm/intent": "self_harm",
  "self-harm/instructions": "self_harm",
  sexual: "sexual_adult",
  "sexual/minors": "sexual_minors",
  violence: "violence",
  "violence/graphic": "violence",
};

async function moderateViaOpenAI(text: string): Promise<ModerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not available");
  }

  const response = await fetch(OPENAI_MODERATION_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: text,
      model: process.env.OPENAI_MODERATION_MODEL || "omni-moderation-latest",
    }),
  });

  if (!response.ok) {
    logger.error("openai_moderation_failed", {
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(`OpenAI moderation API returned ${response.status}`);
  }

  const data: OpenAIModerationResponse = await response.json();
  const result = data.results[0];
  if (!result) return { flagged: false, categories: [] };

  const categories: string[] = [];
  for (const [openAiCat, flagged] of Object.entries(result.categories)) {
    if (flagged && OPENAI_CATEGORY_MAP[openAiCat]) {
      categories.push(OPENAI_CATEGORY_MAP[openAiCat]);
    }
  }

  // Deduplicate (multiple OpenAI sub-categories can map to the same internal category)
  const unique = [...new Set(categories)];

  return { flagged: unique.length > 0, categories: unique };
}

// ============================================================================
// Pattern-based fallback
// ============================================================================

function moderateViaPatterns(text: string): ModerationResult {
  const categories: string[] = [];

  for (const [category, patterns] of CATEGORY_CHECKS) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        categories.push(category);
        break; // one match per category is enough
      }
    }
  }

  return { flagged: categories.length > 0, categories };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Checks text for policy-violating content.
 *
 * Uses the OpenAI moderation API when OPENAI_API_KEY is configured,
 * falling back to a lightweight pattern-based check for Phase 1.
 *
 * @returns A ModerationResult with `flagged` and `categories` fields
 */
export async function moderateText(text: string): Promise<ModerationResult> {
  // Try OpenAI moderation API first (more accurate)
  if (process.env.OPENAI_API_KEY) {
    try {
      return await moderateViaOpenAI(text);
    } catch (err) {
      logger.warn("openai_moderation_fallback", {
        error: err instanceof Error ? err.message : String(err),
      });
      // Fall through to pattern-based
    }
  }

  return moderateViaPatterns(text);
}

/**
 * Runs moderation on AI-generated output and persists a flag row if flagged.
 *
 * Returns only data — callers (ai-preamble or route handlers) own the HTTP
 * response decision. This keeps the service layer free of HTTP/framework concerns.
 *
 * @param text         - The AI-generated output text to check
 * @param userId       - The user who generated the content
 * @param generationId - Optional link to an aiGenerations row for traceability
 * @returns Whether flagged and which categories matched
 */
export async function moderateOutput(
  text: string,
  userId: string,
  generationId?: string
): Promise<{ flagged: boolean; categories: string[] }> {
  const result = await moderateText(text);

  if (result.flagged) {
    const snippet = text.slice(0, 200);

    try {
      const insert: InsertModerationFlag = {
        id: nanoid(),
        userId,
        categories: result.categories,
        snippet,
        ...(generationId !== undefined && { generationId }),
      };

      await db.insert(moderationFlag).values(insert);

      logger.warn("moderation_flagged", {
        userId,
        generationId: generationId ?? undefined,
        categories: result.categories,
        snippetLength: snippet.length,
      });
    } catch (err) {
      // Persistence failure should not block the moderation response
      logger.error("moderation_persist_failed", {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return { flagged: true, categories: result.categories };
  }

  return { flagged: false, categories: [] };
}
