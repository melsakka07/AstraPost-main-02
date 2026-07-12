import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { pdfThreadJobs } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

// ── GET: Return recent ready PDF thread jobs ────────────────────────────────

export async function GET(_req: Request) {
  // Step 1: Auth
  const ctx = await getTeamContext();
  if (!ctx) {
    return ApiError.unauthorized();
  }

  try {
    const jobs = await db.query.pdfThreadJobs.findMany({
      where: and(eq(pdfThreadJobs.userId, ctx.session.user.id), eq(pdfThreadJobs.status, "ready")),
      orderBy: desc(pdfThreadJobs.completedAt),
      limit: 5,
      columns: {
        id: true,
        fileName: true,
        pageCount: true,
        threadResult: true,
        completedAt: true,
      },
    });

    const items = jobs.map((j) => ({
      id: j.id,
      fileName: j.fileName,
      pageCount: j.pageCount,
      title: (j.threadResult as { title?: string } | null)?.title ?? "",
      completedAt: j.completedAt,
    }));

    return Response.json({ items });
  } catch (error) {
    logger.error(
      `pdf_thread_history_failed: ${(error instanceof Error ? error.message : String(error)).slice(0, 200)}`,
      {
        error: error instanceof Error ? error.message : String(error),
        userId: ctx.session.user.id,
      }
    );
    return ApiError.internal("Failed to fetch PDF thread history.");
  }
}
