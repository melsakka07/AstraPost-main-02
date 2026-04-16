import { and, desc, eq, ilike, count } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { agenticPosts, tweets } from "@/lib/schema";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(["pending", "running", "completed", "failed"]).optional(),
  topic: z.string().max(200).optional(),
});

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  try {
    const { searchParams } = new URL(request.url);
    const parsed = listQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

    const { limit, offset, status, topic } = parsed.data;

    const conditions: any[] = [];

    if (status) {
      const statusMap: Record<string, string> = {
        completed: "completed",
        failed: "failed",
        pending: "generating",
        running: "processing",
      };
      const dbStatus = statusMap[status] ?? status;
      conditions.push(eq(agenticPosts.status, dbStatus));
    }

    if (topic) {
      conditions.push(ilike(agenticPosts.topic, `%${topic}%`));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const sessions = await db
      .select({
        id: agenticPosts.id,
        topic: agenticPosts.topic,
        status: agenticPosts.status,
        qualityScore: agenticPosts.qualityScore,
        startedAt: agenticPosts.createdAt,
        completedAt: agenticPosts.updatedAt,
        createdAt: agenticPosts.createdAt,
      })
      .from(agenticPosts)
      .where(where)
      .orderBy(desc(agenticPosts.createdAt))
      .limit(limit)
      .offset(offset);

    const enriched = await Promise.all(
      sessions.map(async (session) => {
        const [tweetCount] = await db
          .select({ c: count() })
          .from(tweets)
          .where(eq(tweets.postId, session.id));

        const statusMap: Record<string, "pending" | "running" | "completed" | "failed"> = {
          generating: "pending",
          processing: "running",
          completed: "completed",
          failed: "failed",
          ready: "completed",
          posted: "completed",
          scheduled: "completed",
          approved: "completed",
        };

        return {
          ...session,
          status: statusMap[session.status] ?? "pending",
          postsGenerated: tweetCount?.c ?? 0,
          qualityScore: session.qualityScore ?? 0,
        };
      })
    );

    return Response.json({ data: enriched });
  } catch (err) {
    logger.error("[agentic/sessions] Error", { error: err });
    return ApiError.internal("Failed to load agentic sessions");
  }
}
