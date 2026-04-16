/**
 * Inspiration Bookmark API Endpoint
 * POST /api/inspiration/bookmark
 * GET /api/inspiration/bookmark
 */

import { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkBookmarkLimitDetailed, createPlanLimitResponse } from "@/lib/middleware/require-plan";
import { getPlanLimits, normalizePlan } from "@/lib/plan-limits";
import { inspirationBookmarks, user } from "@/lib/schema";

// ============================================================================
// Schema Validation
// ============================================================================

const CreateBookmarkRequestSchema = z.object({
  sourceTweetId: z.string(),
  sourceTweetUrl: z.string().url(),
  sourceAuthorHandle: z.string(),
  sourceText: z.string().max(5000),
  adaptedText: z.string().max(5000).optional(),
  action: z.string().optional(),
  tone: z.string().optional(),
  language: z.string().optional(),
});

// ============================================================================
// POST Handler - Create Bookmark
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // 2. Plan gate — respects trial period, returns 402 + upgrade_url on failure
    const bookmarkGate = await checkBookmarkLimitDetailed(userId);
    if (!bookmarkGate.allowed) return createPlanLimitResponse(bookmarkGate);

    // 3. Parse and validate request
    const body = await req.json();
    const validationResult = CreateBookmarkRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return Response.json(
        { error: "Invalid request", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 4. Check for duplicate bookmark
    const existing = await db.query.inspirationBookmarks.findFirst({
      where: and(
        eq(inspirationBookmarks.userId, userId),
        eq(inspirationBookmarks.sourceTweetId, data.sourceTweetId)
      ),
    });

    if (existing) {
      return Response.json({ error: "Tweet already bookmarked" }, { status: 409 });
    }

    // 5. Create bookmark
    const bookmark = await db
      .insert(inspirationBookmarks)
      .values({
        id: nanoid(),
        userId,
        sourceTweetId: data.sourceTweetId,
        sourceTweetUrl: data.sourceTweetUrl,
        sourceAuthorHandle: data.sourceAuthorHandle,
        sourceText: data.sourceText,
        ...(data.adaptedText !== undefined && { adaptedText: data.adaptedText }),
        ...(data.action !== undefined && { action: data.action }),
        ...(data.tone !== undefined && { tone: data.tone }),
        ...(data.language !== undefined && { language: data.language }),
        createdAt: new Date(),
      })
      .returning();

    return Response.json({ success: true, bookmark: bookmark[0] });
  } catch (error) {
    logger.error("Bookmark creation error", { error });
    return Response.json(
      {
        error: "Failed to create bookmark",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET Handler - List Bookmarks
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    // 1. Authentication
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // 2. Fetch plan limits for display only — no gating decision is made here.
    // The limit is used solely to cap the query result for UI rendering and to
    // return the limit value to the client for progress display.
    // Intentional exception to CLAUDE.md §16 — no enforcement side effects.
    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { plan: true },
    });
    const planLimits = getPlanLimits(normalizePlan(dbUser?.plan));

    // 3. Fetch bookmarks
    const bookmarks = await db.query.inspirationBookmarks.findMany({
      where: eq(inspirationBookmarks.userId, userId),
      orderBy: [desc(inspirationBookmarks.createdAt)],
      limit: planLimits.maxInspirationBookmarks > 0 ? planLimits.maxInspirationBookmarks : 100,
    });

    return Response.json({ bookmarks, limit: planLimits.maxInspirationBookmarks });
  } catch (error) {
    logger.error("Bookmark fetch error", { error });
    return Response.json(
      {
        error: "Failed to fetch bookmarks",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
