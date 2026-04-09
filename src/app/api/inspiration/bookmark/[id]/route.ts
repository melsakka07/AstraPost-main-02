/**
 * Inspiration Bookmark Delete API Endpoint
 * DELETE /api/inspiration/bookmark/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = await context.params;

    // 2. Check if bookmark exists and belongs to user
    const existing = await db.query.inspirationBookmarks.findFirst({
      where: and(eq(inspirationBookmarks.id, id), eq(inspirationBookmarks.userId, userId)),
    });

    if (!existing) {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
    }

    // 3. Delete bookmark
    await db
      .delete(inspirationBookmarks)
      .where(and(eq(inspirationBookmarks.id, id), eq(inspirationBookmarks.userId, userId)));

    return NextResponse.json({
      success: true,
      message: "Bookmark removed",
    });
  } catch (error) {
    console.error("Bookmark deletion error:", error);

    return NextResponse.json(
      {
        error: "Failed to delete bookmark",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
