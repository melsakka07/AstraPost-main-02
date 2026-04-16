/**
 * Tweet Lookup API Endpoint
 * POST /api/x/tweet-lookup
 *
 * Imports tweets from X/Twitter URLs with full context
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { normalizePlan } from "@/lib/plan-limits";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { importTweet, isValidTweetUrl } from "@/lib/services/tweet-importer";

// ============================================================================
// Schema Validation
// ============================================================================

const TweetLookupRequestSchema = z.object({
  tweetUrl: z.string().url(),
});

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse and validate request
    const body = await req.json();
    const validationResult = TweetLookupRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return Response.json(
        { error: "Invalid request", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { tweetUrl } = validationResult.data;

    // 3. Validate URL format
    if (!isValidTweetUrl(tweetUrl)) {
      return Response.json({ error: "Invalid X/Twitter URL format" }, { status: 400 });
    }

    // 4. Get user and plan info
    const userId = session.user.id;
    const userRecord = await db.query.user.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
    });

    if (!userRecord) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const plan = normalizePlan(userRecord.plan);

    // 5. Check rate limit
    const rateLimitResult = await checkRateLimit(userId, plan, "tweet_lookup");
    if (!rateLimitResult.success) return createRateLimitResponse(rateLimitResult);

    // 6. Import tweet
    const result = await importTweet(tweetUrl);

    // 7. Check for errors
    if ("error" in result) {
      // Map error codes to HTTP status codes
      const statusMap: Record<string, number> = {
        TWEET_NOT_FOUND: 404,
        PRIVATE_ACCOUNT: 403,
        SUSPENDED_ACCOUNT: 410,
        RATE_LIMITED: 429,
        UNKNOWN: 500,
      };

      const status = statusMap[result.code] || 500;
      return Response.json({ error: result.error, code: result.code }, { status });
    }

    // 8. Return successful result
    return Response.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Tweet lookup error", { error });

    return Response.json(
      {
        error: "Failed to lookup tweet",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
