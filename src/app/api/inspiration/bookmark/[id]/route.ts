/**
 * Inspiration Bookmark Delete API Endpoint
 * DELETE /api/inspiration/bookmark/[id]
 */

import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { inspirationBookmarks } from "@/lib/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// ============================================================================
// DELETE Handler - Remove Bookmark
// ============================================================================

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    // 1. Authentication
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return ApiError.unauthorized();
    }

    const userId = session.user.id;
    const { id } = await context.params;

    // 2. Check if bookmark exists and belongs to user
    const existing = await db.query.inspirationBookmarks.findFirst({
      where: and(eq(inspirationBookmarks.id, id), eq(inspirationBookmarks.userId, userId)),
    });

    if (!existing) {
      return ApiError.notFound("Bookmark not found");
    }

    // 3. Delete bookmark
    await db
      .delete(inspirationBookmarks)
      .where(and(eq(inspirationBookmarks.id, id), eq(inspirationBookmarks.userId, userId)));

    return Response.json({
      success: true,
      message: "Bookmark removed",
    });
  } catch (error) {
    logger.error("Bookmark deletion error", { error });
    return ApiError.internal("Failed to delete bookmark");
  }
}
