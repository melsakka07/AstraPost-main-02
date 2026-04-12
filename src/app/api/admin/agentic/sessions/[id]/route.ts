import { eq } from "drizzle-orm";
import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { agenticPosts, tweets } from "@/lib/schema";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  try {
    const { id } = await params;

    const session = await db.query.agenticPosts.findFirst({
      where: eq(agenticPosts.id, id),
    });

    if (!session) return ApiError.notFound("Session");

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

    if (!session.postId) {
      return Response.json({
        data: {
          id: session.id,
          topic: session.topic ?? "",
          status: statusMap[session.status] ?? "pending",
          postsGenerated: 0,
          qualityScore: session.qualityScore ?? 0,
          startedAt: session.createdAt?.toISOString() ?? new Date().toISOString(),
          completedAt: session.updatedAt?.toISOString() ?? null,
          createdAt: session.createdAt?.toISOString() ?? new Date().toISOString(),
          description: session.topic,
          posts: [],
        },
      });
    }

    const sessionTweets = await db
      .select({
        id: tweets.id,
        content: tweets.content,
        createdAt: tweets.createdAt,
      })
      .from(tweets)
      .where(eq(tweets.postId, session.postId));

    const posts = sessionTweets.map((tweet) => ({
      id: tweet.id,
      content: tweet.content ?? "",
      status: "generated",
      likes: 0,
      replies: 0,
      retweets: 0,
      shares: 0,
      qualityScore: session.qualityScore ?? 0,
      createdAt: tweet.createdAt?.toISOString() ?? new Date().toISOString(),
    }));

    return Response.json({
      data: {
        id: session.id,
        topic: session.topic ?? "",
        status: statusMap[session.status] ?? "pending",
        postsGenerated: posts.length,
        qualityScore: session.qualityScore ?? 0,
        startedAt: session.createdAt?.toISOString() ?? new Date().toISOString(),
        completedAt: session.updatedAt?.toISOString() ?? null,
        createdAt: session.createdAt?.toISOString() ?? new Date().toISOString(),
        description: session.topic,
        posts,
      },
    });
  } catch (err) {
    console.error("[agentic/sessions/[id]] Error:", err);
    return ApiError.internal("Failed to load agentic session details");
  }
}
