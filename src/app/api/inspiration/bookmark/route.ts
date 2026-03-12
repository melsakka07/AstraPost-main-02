/**
 * Inspiration Bookmark API Endpoint
 * POST /api/inspiration/bookmark
 * GET /api/inspiration/bookmark
 * DELETE /api/inspiration/bookmark/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { and, eq, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlanLimits, normalizePlan } from "@/lib/plan-limits";
import { inspirationBookmarks } from "@/lib/schema";

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
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse and validate request
    const body = await req.json();
    const validationResult = CreateBookmarkRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 3. Get user and plan info
    const userId = session.user.id;
    const userRecord = await db.query.user.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
    });

    if (!userRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const plan = normalizePlan(userRecord.plan);
    const planLimits = getPlanLimits(plan);

    // 4. Check if user can use inspiration feature
    if (!planLimits.canUseInspiration) {
      return NextResponse.json(
        { error: "Inspiration feature not available in your plan" },
        { status: 403 }
      );
    }

    // 5. Check bookmark limit
    if (planLimits.maxInspirationBookmarks > 0) {
      const existingCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(inspirationBookmarks)
        .where(eq(inspirationBookmarks.userId, userId));

      const count = existingCount[0]?.count || 0;

      if (count >= planLimits.maxInspirationBookmarks) {
        return NextResponse.json(
          {
            error: "Bookmark limit exceeded",
            limit: planLimits.maxInspirationBookmarks,
          },
          { status: 403 }
        );
      }
    }

    // 6. Check for duplicate bookmark
    const existing = await db.query.inspirationBookmarks.findFirst({
      where: and(
        eq(inspirationBookmarks.userId, userId),
        eq(inspirationBookmarks.sourceTweetId, data.sourceTweetId)
      ),
    });

    if (existing) {
      return NextResponse.json(
        { error: "Tweet already bookmarked" },
        { status: 409 }
      );
    }

    // 7. Create bookmark
    const bookmark = await db
      .insert(inspirationBookmarks)
      .values({
        id: nanoid(),
        userId,
        sourceTweetId: data.sourceTweetId,
        sourceTweetUrl: data.sourceTweetUrl,
        sourceAuthorHandle: data.sourceAuthorHandle,
        sourceText: data.sourceText,
        adaptedText: data.adaptedText || null,
        action: data.action || null,
        tone: data.tone || null,
        language: data.language || null,
        createdAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      bookmark: bookmark[0],
    });
  } catch (error) {
    console.error("Bookmark creation error:", error);

    return NextResponse.json(
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
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // 2. Get user and plan info
    const userRecord = await db.query.user.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
    });

    if (!userRecord) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const plan = normalizePlan(userRecord.plan);
    const planLimits = getPlanLimits(plan);

    // 3. Check if user can use inspiration feature
    if (!planLimits.canUseInspiration) {
      return NextResponse.json(
        { error: "Inspiration feature not available in your plan" },
        { status: 403 }
      );
    }

    // 4. Fetch bookmarks
    const bookmarks = await db.query.inspirationBookmarks.findMany({
      where: eq(inspirationBookmarks.userId, userId),
      orderBy: [desc(inspirationBookmarks.createdAt)],
      limit: planLimits.maxInspirationBookmarks > 0
        ? planLimits.maxInspirationBookmarks
        : 100,
    });

    return NextResponse.json({
      bookmarks,
      limit: planLimits.maxInspirationBookmarks,
    });
  } catch (error) {
    console.error("Bookmark fetch error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch bookmarks",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Import sql function
