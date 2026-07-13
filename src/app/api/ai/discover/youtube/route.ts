import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { logger } from "@/lib/logger";
import {
  checkAiDiscoveryAccessDetailed,
  createPlanLimitResponse,
  getUserPlanType,
} from "@/lib/middleware/require-plan";
import { checkRateLimit, createRateLimitResponse, redis } from "@/lib/rate-limiter";
import { youtubeSearchRequestSchema, type YouTubeSearchResult } from "@/lib/schemas/youtube-search";
import { searchYouTube, YouTubeApiError } from "@/lib/services/youtube-search";
import { getTeamContext } from "@/lib/team-context";

const CACHE_TTL_SECONDS = 3600; // 1 hour — queries are shared across tenants

/**
 * Derives YouTube regionCode + relevanceLanguage from the request's Accept-Language.
 * MENA tuning: Arabic → SA/ar, everything else → US/en. Kept in the cache key.
 */
function deriveRegion(req: Request): { regionCode: string; relevanceLanguage: string } {
  const acceptLanguage = (req.headers.get("accept-language") ?? "").toLowerCase();
  if (acceptLanguage.startsWith("ar")) {
    return { regionCode: "SA", relevanceLanguage: "ar" };
  }
  return { regionCode: "US", relevanceLanguage: "en" };
}

export async function POST(req: Request) {
  const correlationId = getCorrelationId(req);

  try {
    // ── 1. Auth ────────────────────────────────────────────────────────────────
    const ctx = await getTeamContext();
    if (!ctx) return new Response("Unauthorized", { status: 401 });

    // Read-only discovery — viewers allowed. No role check.

    // ── 2. Validate ──────────────────────────────────────────────────────────────
    const parsed = youtubeSearchRequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);
    const { query, order } = parsed.data;

    // ── 3. Config guard ─────────────────────────────────────────────────────────
    if (!process.env.YOUTUBE_API_KEY) {
      logger.error("youtube_discovery_missing_key", { correlationId });
      return ApiError.serviceUnavailable(
        "YouTube discovery is temporarily unavailable. Please try again later."
      );
    }

    // ── 4. Rate limit ────────────────────────────────────────────────────────────
    const plan = await getUserPlanType(ctx.currentTeamId);
    const rl = await checkRateLimit(ctx.currentTeamId, plan, "discover");
    if (!rl.success) return createRateLimitResponse(rl);

    // ── 5. Plan gate (Trial + Pro + Agency) ──────────────────────────────────────
    const gate = await checkAiDiscoveryAccessDetailed(ctx.currentTeamId);
    if (!gate.allowed) return createPlanLimitResponse(gate);

    // ── 6. Redis cache (shared per region/order/query) ───────────────────────────
    const { regionCode, relevanceLanguage } = deriveRegion(req);
    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = `yt-search:v1:${regionCode}:${order ?? "relevance"}:${normalizedQuery}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const results = JSON.parse(cached) as YouTubeSearchResult[];
        logger.info("youtube_discovery_cache_hit", { correlationId, userId: ctx.currentTeamId });
        const res = Response.json({ results });
        res.headers.set("x-correlation-id", correlationId);
        return res;
      }
    } catch (cacheErr) {
      logger.warn("youtube_discovery_cache_read_failed", {
        correlationId,
        error: cacheErr instanceof Error ? cacheErr.message : String(cacheErr),
      });
    }

    // ── 7. Fetch from YouTube ────────────────────────────────────────────────────
    const results = await searchYouTube({
      query,
      regionCode,
      relevanceLanguage,
      ...(order !== undefined && { order }),
    });

    // ── 8. Cache result ──────────────────────────────────────────────────────────
    try {
      await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(results));
    } catch (cacheWriteErr) {
      logger.warn("youtube_discovery_cache_write_failed", {
        correlationId,
        error: cacheWriteErr instanceof Error ? cacheWriteErr.message : String(cacheWriteErr),
      });
    }

    logger.info("youtube_discovery_done", {
      correlationId,
      userId: ctx.currentTeamId,
      count: results.length,
    });
    const res = Response.json({ results });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (err) {
    if (err instanceof YouTubeApiError) {
      logger.error(
        `youtube_discovery_upstream_error: status=${err.status} quota=${err.quotaExceeded}`,
        { correlationId, status: err.status, quotaExceeded: err.quotaExceeded }
      );
      // Quota-exceeded or missing key → friendly "temporarily unavailable".
      return ApiError.serviceUnavailable(
        "Search is temporarily unavailable. Please try again shortly."
      );
    }
    logger.error(
      `youtube_discovery_error: ${(err instanceof Error ? err.message : String(err)).slice(0, 200)}`,
      { correlationId, error: err instanceof Error ? err.message : String(err) }
    );
    return ApiError.internal();
  }
}
