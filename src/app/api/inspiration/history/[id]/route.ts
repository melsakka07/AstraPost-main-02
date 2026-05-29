/**
 * Inspiration History Delete API Endpoint
 * DELETE /api/inspiration/history/[id]
 */

import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { inspirationHistory } from "@/lib/schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return ApiError.unauthorized();

    const { id } = await context.params;

    const existing = await db.query.inspirationHistory.findFirst({
      where: and(eq(inspirationHistory.id, id), eq(inspirationHistory.userId, session.user.id)),
    });

    if (!existing) return ApiError.notFound("History entry not found");

    await db
      .delete(inspirationHistory)
      .where(and(eq(inspirationHistory.id, id), eq(inspirationHistory.userId, session.user.id)));

    return Response.json({ success: true });
  } catch (error) {
    logger.error("History deletion error", { error });
    return ApiError.internal("Failed to delete history entry");
  }
}
