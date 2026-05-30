import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { getCorrelationId } from "@/lib/correlation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getUserPlanType } from "@/lib/middleware/require-plan";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limiter";
import { media } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

const listMediaSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  fileType: z.enum(["image", "video", "gif"]).optional(),
});

export async function GET(req: Request) {
  try {
    // 1. Auth
    const ctx = await getTeamContext();
    if (!ctx) {
      return new Response("Unauthorized", { status: 401 });
    }

    // 2. Role check — viewers can read their own media (no restriction needed)

    // 3. Correlation ID
    const correlationId = getCorrelationId(req);

    // 4. Parse + validate query params
    const url = new URL(req.url);
    const parsed = listMediaSchema.safeParse({
      cursor: url.searchParams.get("cursor") || undefined,
      limit: url.searchParams.get("limit") || undefined,
      fileType: url.searchParams.get("fileType") || undefined,
    });

    if (!parsed.success) {
      return ApiError.badRequest(parsed.error.issues);
    }

    const { cursor, limit, fileType } = parsed.data;

    // Validate cursor is a parseable ISO date string
    if (cursor && isNaN(new Date(cursor).getTime())) {
      return ApiError.badRequest("Invalid cursor format");
    }

    // 5. Rate limit
    const planType = await getUserPlanType(ctx.currentTeamId);
    const rlResult = await checkRateLimit(ctx.currentTeamId, planType, "media");
    if (!rlResult.success) return createRateLimitResponse(rlResult);

    logger.info("api_request", {
      route: "/api/media/library",
      method: "GET",
      correlationId,
      userId: ctx.currentTeamId,
      actorId: ctx.isOwner ? undefined : ctx.session.user.id,
    });

    // 6. Plan gate — no special gate needed; user existence is verified via getTeamContext

    // 7. Business logic — query media with dedup + cursor pagination
    // Filter by the authenticated user (not team owner) — each user owns their own media rows
    const userId = ctx.session.user.id;
    const conditions = [eq(media.userId, userId)];
    if (fileType) {
      conditions.push(eq(media.fileType, fileType));
    }

    // GROUP BY file_url to deduplicate (same media may be reused across posts).
    // MAX aggregates pick the most recent / largest representative row per file.
    const maxCreatedAt = sql<Date>`MAX(${media.createdAt})`;

    const items = await db
      .select({
        id: sql<string>`MAX(${media.id})`.as("id"),
        fileUrl: media.fileUrl,
        fileType: media.fileType,
        fileSize: sql<number | null>`MAX(${media.fileSize})`.as("file_size"),
        createdAt: maxCreatedAt,
      })
      .from(media)
      .where(and(...conditions))
      .groupBy(media.fileUrl, media.fileType)
      // HAVING filters post-aggregation: exclude groups whose latest row falls on/after the cursor
      .having(cursor ? sql`${maxCreatedAt} < ${new Date(cursor)}` : sql`TRUE`)
      .orderBy(sql`${maxCreatedAt} DESC`)
      .limit(limit + 1);

    // Cursor-based pagination: request N+1; extra row means more pages exist
    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;
    const lastItem = resultItems[resultItems.length - 1];
    const nextCursor = hasMore && lastItem ? lastItem.createdAt.toISOString() : null;

    // 8. Return
    const res = Response.json({ items: resultItems, nextCursor });
    res.headers.set("x-correlation-id", correlationId);
    return res;
  } catch (error) {
    logger.error("media_library_failed", { error });
    return ApiError.internal("Failed to fetch media library");
  }
}
