import "server-only";

import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { openrouterFallbackBody } from "@/lib/ai/openrouter-fallback";
import { logger } from "@/lib/logger";
import { trendItemSchema, type TrendItem } from "@/lib/schemas/common";

// NOTE: A web-search-capable model produces significantly better results here.
// Configure OPENROUTER_MODEL_TRENDS to a model with online access via OpenRouter
// (e.g. perplexity/sonar or perplexity/sonar-pro). Without it, the fallback chain
// uses training data which may not reflect current trends.

function buildSubjectTrendsPrompt(query: string): { system: string; prompt: string } {
  const system = `You are a social media trends analyst.

Return EXACTLY 5 trending topics as a JSON array. For each topic, include:
- "title": the trending topic or hashtag name (as it appears on X)
- "description": a one-sentence explanation of why it's trending (15-25 words max)
- "postCount": estimated engagement level ("High", "Medium", or "Trending")
- "category": a short label for the topic's theme
- "suggestedAngle": a one-sentence content angle a creator could use for a post about this trend
- "evidenceUrl": if possible, include a relevant source URL as evidenceUrl (omit if no source is available)

Return ONLY valid JSON. No markdown, no explanation, no preamble.
Format: [{ "title": "...", "description": "...", "postCount": "...", "category": "...", "suggestedAngle": "..." }]`;

  const prompt = `Research what is currently trending on X (Twitter) right now about the subject: "${query}". Focus on topics genuinely trending RIGHT NOW on X/Twitter that relate to this subject, not general evergreen topics. Prioritize topics with high engagement and conversation volume.`;

  return { system, prompt };
}

/**
 * The result of a subject-trends generation, exposing the metadata the route
 * needs to record usage (model, tokens) alongside the validated trends.
 */
export interface SubjectTrendsResult {
  trends: TrendItem[];
  modelId: string;
  tokensIn: number;
  tokensOut: number;
  system: string;
  prompt: string;
}

/**
 * Generates trending topics for a free-text subject via OpenRouter web-search.
 *
 * Extracted from the `/api/ai/trends` generation block and tuned for an
 * arbitrary user subject rather than a fixed category. Throws on generation
 * failure — the route formats the error. Returns an empty `trends` array when
 * the model output cannot be parsed/validated (non-fatal, cached-skip upstream).
 */
export async function generateSubjectTrendsDetailed(query: string): Promise<SubjectTrendsResult> {
  const modelId =
    process.env.OPENROUTER_MODEL_TRENDS ??
    process.env.OPENROUTER_MODEL_FREE ??
    process.env.OPENROUTER_MODEL_AGENTIC ??
    process.env.OPENROUTER_MODEL!;
  // Native fallback across the same preference chain — on 429/transient errors
  // OpenRouter routes to the next configured model instead of failing.
  const fallbackBody = openrouterFallbackBody(
    process.env.OPENROUTER_MODEL_TRENDS,
    process.env.OPENROUTER_MODEL_FREE,
    process.env.OPENROUTER_MODEL_AGENTIC,
    process.env.OPENROUTER_MODEL
  );
  const model = openrouter(modelId, {
    ...(fallbackBody && { extraBody: fallbackBody }),
  });
  const { system, prompt } = buildSubjectTrendsPrompt(query);

  const result = await generateText({
    model,
    system,
    prompt,
    maxOutputTokens: 800,
    abortSignal: AbortSignal.timeout(60_000),
  });

  let trends: TrendItem[] = [];
  try {
    const jsonMatch =
      result.text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? result.text.match(/(\[[\s\S]*\])/);
    const raw = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : result.text;
    const parsed = JSON.parse(raw.trim()) as unknown;
    const validated = trendItemSchema.array().safeParse(parsed);
    if (validated.success) {
      trends = validated.data;
    } else {
      logger.warn("discover_trends_validation_failed", { issues: validated.error.issues });
    }
  } catch (parseErr) {
    logger.warn("discover_trends_parse_failed", {
      error: parseErr instanceof Error ? parseErr.message : String(parseErr),
      rawText: result.text.slice(0, 200),
    });
  }

  return {
    trends,
    modelId,
    tokensIn: result.usage?.inputTokens ?? 0,
    tokensOut: result.usage?.outputTokens ?? 0,
    system,
    prompt,
  };
}

/**
 * Convenience wrapper returning just the trends for callers that don't need
 * usage metadata.
 */
export async function generateSubjectTrends(query: string): Promise<TrendItem[]> {
  const { trends } = await generateSubjectTrendsDetailed(query);
  return trends;
}
