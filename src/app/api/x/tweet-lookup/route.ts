/**
 * Tweet Lookup API Endpoint
 * POST /api/x/tweet-lookup
 *
 * Imports tweets from X/Twitter URLs with full context
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
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
      return ApiError.unauthorized();
    }

    // 2. Parse and validate request
    const body = await req.json();
    const validationResult = TweetLookupRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return ApiError.badRequest(validationResult.error.issues);
    }

    const { tweetUrl } = validationResult.data;

    // 3. Validate URL format
    if (!isValidTweetUrl(tweetUrl)) {
      return ApiError.badRequest("Invalid X/Twitter URL format");
    }

    // 4. Get user and plan info
    const userId = session.user.id;
    const userRecord = await db.query.user.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
    });

    if (!userRecord) {
      return ApiError.notFound("User not found");
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
      if (result.code === "TWEET_NOT_FOUND") return ApiError.notFound(result.error);
      if (result.code === "PRIVATE_ACCOUNT") return ApiError.forbidden(result.error);
      if (result.code === "RATE_LIMITED") return ApiError.tooManyRequests(result.error);
      return ApiError.internal(result.error);
    }

    // 8. Return successful result
    return Response.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Tweet lookup error", { error });
    return ApiError.internal("Failed to lookup tweet");
  }
}
