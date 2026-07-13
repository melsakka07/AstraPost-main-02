import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import {
  checkAiDiscoveryAccessDetailed,
  createPlanLimitResponse,
  getUserPlanType,
} from "@/lib/middleware/require-plan";
import { checkRateLimit, createRateLimitResponse, redis } from "@/lib/rate-limiter";
import type { TrendItem } from "@/lib/schemas/common";
import { discoverTrendsRequestSchema } from "@/lib/schemas/discover-trends";
import { estimateCost, recordAiUsage } from "@/lib/services/ai-quota";
import { generateSubjectTrendsDetailed } from "@/lib/services/discover-trends";
import { getTeamContext } from "@/lib/team-context";

const CACHE_TTL_SECONDS = 1800; // 30 minutes — shared per normalized subject across tenants

/** Normalize a subject query: trim + lowercase + collapse internal whitespace. */
function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function POST(req: Request) {
  const correlationId = getCorrelationId(req);

  try {
    // ── 1. Auth ────────────────────────────────────────────────────────────────
    const ctx = await getTeamContext();
    if (!ctx) return new Response("Unauthorized", { status: 401 });

    // Read-only discovery — viewers allowed. No role check.

    // ── 2. Validate ──────────────────────────────────────────────────────────────
    const parsed = discoverTrendsRequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);
    const { query } = parsed.data;

    // ── 3. Rate limit ────────────────────────────────────────────────────────────
    const plan = await getUserPlanType(ctx.currentTeamId);
    const rl = await checkRateLimit(ctx.currentTeamId, plan, "discover");
    if (!rl.success) return createRateLimitResponse(rl);

    // ── 4. Plan gate (Trial + Pro + Agency) ──────────────────────────────────────
    const gate = await checkAiDiscoveryAccessDetailed(ctx.currentTeamId);
    if (!gate.allowed) return createPlanLimitResponse(gate);

    // ── 5. Redis cache (shared per normalized subject) ───────────────────────────
    const cacheKey = `discover-trends:v1:${normalizeQuery(query)}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const trends = JSON.parse(cached) as TrendItem[];
        logger.info("discover_trends_cache_hit", { correlationId, userId: ctx.currentTeamId });
        const res = Response.json({ trends });
        res.headers.set("x-correlation-id", correlationId);
        return res;
      }
    } catch (cacheErr) {
      logger.warn("discover_trends_cache_read_failed", {
        correlationId,
        error: cacheErr instanceof Error ? cacheErr.message : String(cacheErr),
      });
    }

    // ── 6. Generate (quota-free, like /api/ai/trends) ────────────────────────────
    logger.info("discover_trends_fetch_start", { correlationId, userId: ctx.currentTeamId });
    const t0 = performance.now();
    const generated = await generateSubjectTrendsDetailed(query);
    const latencyMs = Math.round(performance.now() - t0);
    const { trends, modelId, tokensIn, tokensOut, system, prompt } = generated;

    // ── 7. Cache result ──────────────────────────────────────────────────────────
    if (trends.length > 0) {
      try {
        await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(trends));
      } catch (cacheWriteErr) {
        logger.warn("discover_trends_cache_write_failed", {
          correlationId,
          error: cacheWriteErr instanceof Error ? cacheWriteErr.message : String(cacheWriteErr),
        });
      }
    }

    // ── 8. Record usage (quota-free but tracked for cost visibility) ─────────────
    await recordAiUsage({
      userId: ctx.currentTeamId,
      type: "tools",
      model: modelId,
      subFeature: "discover.trends",
      tokensIn,
      tokensOut,
      costEstimateCents: estimateCost(modelId, tokensIn, tokensOut),
      promptVersion: "discover-trends:v1",
      latencyMs,
      fallbackUsed: false,
      inputPrompt: JSON.stringify({ system, prompt }),
      outputContent: JSON.stringify(trends),
    });

    logger.info("discover_trends_fetch_done", {
      correlationId,
      userId: ctx.currentTeamId,
      count: trends.length,
    });
    const res = Response.json({ trends });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (err) {
    logger.error(
      `discover_trends_error: ${(err instanceof Error ? err.message : String(err)).slice(0, 200)}`,
      { correlationId, error: err instanceof Error ? err.message : String(err) }
    );
    return ApiError.internal();
  }
}
