/**
 * Inspiration History API Endpoint
 * POST /api/inspiration/history — record an import/adaptation
 * GET  /api/inspiration/history — list history entries
 */

import { NextRequest } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { inspirationHistory } from "@/lib/schema";

const CreateHistorySchema = z.object({
  sourceTweetId: z.string(),
  sourceTweetUrl: z.string().url(),
  sourceAuthorHandle: z.string(),
  sourceText: z.string().max(5000),
  adaptedText: z.string().max(5000).optional(),
  action: z.string().optional(),
  tone: z.string().optional(),
  language: z.string().optional(),
});

const MAX_HISTORY = 50;

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return ApiError.unauthorized();

    const body = await req.json();
    const parsed = CreateHistorySchema.safeParse(body);
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

    const data = parsed.data;

    await db.insert(inspirationHistory).values({
      id: nanoid(),
      userId: session.user.id,
      sourceTweetId: data.sourceTweetId,
      sourceTweetUrl: data.sourceTweetUrl,
      sourceAuthorHandle: data.sourceAuthorHandle,
      sourceText: data.sourceText,
      ...(data.adaptedText !== undefined && { adaptedText: data.adaptedText }),
      ...(data.action !== undefined && { action: data.action }),
      ...(data.tone !== undefined && { tone: data.tone }),
      ...(data.language !== undefined && { language: data.language }),
      createdAt: new Date(),
    });

    // Prune history beyond MAX_HISTORY for this user
    const oldEntries = await db
      .select({ id: inspirationHistory.id })
      .from(inspirationHistory)
      .where(eq(inspirationHistory.userId, session.user.id))
      .orderBy(desc(inspirationHistory.createdAt))
      .offset(MAX_HISTORY);

    if (oldEntries.length > 0) {
      const oldIds = oldEntries.map((e) => e.id);
      await db
        .delete(inspirationHistory)
        .where(
          and(
            eq(inspirationHistory.userId, session.user.id),
            inArray(inspirationHistory.id, oldIds)
          )
        );
    }

    return Response.json({ success: true });
  } catch (error) {
    logger.error("History creation error", { error });
    return ApiError.internal("Failed to record history");
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return ApiError.unauthorized();

    const entries = await db.query.inspirationHistory.findMany({
      where: eq(inspirationHistory.userId, session.user.id),
      orderBy: [desc(inspirationHistory.createdAt)],
      limit: MAX_HISTORY,
    });

    return Response.json({ history: entries });
  } catch (error) {
    logger.error("History fetch error", { error });
    return ApiError.internal("Failed to fetch history");
  }
}
