import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { youtubeThreadJobs } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

// ── GET: Return recent ready YouTube thread jobs ─────────────────────────────

export async function GET(_req: Request) {
  // Step 1: Auth
  const ctx = await getTeamContext();
  if (!ctx) {
    return ApiError.unauthorized();
  }

  try {
    const jobs = await db.query.youtubeThreadJobs.findMany({
      where: and(
        eq(youtubeThreadJobs.userId, ctx.session.user.id),
        eq(youtubeThreadJobs.status, "ready")
      ),
      orderBy: desc(youtubeThreadJobs.completedAt),
      limit: 5,
      columns: {
        id: true,
        youtubeVideoId: true,
        threadResult: true,
        completedAt: true,
      },
    });

    const items = jobs.map((j) => ({
      id: j.id,
      youtubeVideoId: j.youtubeVideoId,
      thumbnailUrl: `https://i.ytimg.com/vi/${j.youtubeVideoId}/hqdefault.jpg`,
      title: (j.threadResult as { title?: string } | null)?.title ?? "",
      completedAt: j.completedAt,
    }));

    return Response.json({ items });
  } catch (error) {
    logger.error(
      `youtube_thread_history_failed: ${(error instanceof Error ? error.message : String(error)).slice(0, 200)}`,
      {
        error: error instanceof Error ? error.message : String(error),
        userId: ctx.session.user.id,
      }
    );
    return ApiError.internal("Failed to fetch YouTube thread history.");
  }
}
