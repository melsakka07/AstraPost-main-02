import { eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import { checkAdminRateLimit } from "@/lib/admin/rate-limit";
import { ApiError } from "@/lib/api/errors";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { user, posts, tweets, templates, featureFlags } from "@/lib/schema";

// ── Query params schema ───────────────────────────────────────────────────────

const querySchema = z.object({
  q: z.string().min(2).max(200),
  type: z.enum(["all", "user", "post", "content", "config"]).default("all"),
});

// ── GET /api/admin/search ──────────────────────────────────────────────────────

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const rl = await checkAdminRateLimit("read");
  if (rl) return rl;

  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) return ApiError.badRequest(parsed.error.issues);

    const { q, type } = parsed.data;
    const safeQuery = q.replace(/[%_\\]/g, "\\$&");
    const searchPattern = `%${safeQuery}%`;

    const results: {
      users?: { id: string; name: string | null; email: string; plan: string | null }[];
      posts?: { id: string; content: string | null; createdBy: string; engagement: number }[];
      content?: { id: string; type: string; title: string; description: string | null }[];
      config?: { key: string; label: string; value: boolean }[];
    } = {};

    // Search users
    if (type === "all" || type === "user") {
      const userResults = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          plan: user.plan,
        })
        .from(user)
        .where(or(ilike(user.name, searchPattern), ilike(user.email, searchPattern))!)
        .limit(10);

      results.users = userResults;
    }

    // Search posts (by content)
    if (type === "all" || type === "post") {
      const postResults = await db
        .select({
          id: posts.id,
          content: tweets.content,
          createdBy: posts.userId,
          engagement: sql<number>`
            COALESCE(
              (SELECT (
                COALESCE(likes, 0) + COALESCE(retweets, 0) + COALESCE(replies, 0)
              ) FROM tweet_analytics WHERE tweet_id IN (
                SELECT id FROM tweets WHERE post_id = ${posts.id}
              ) LIMIT 1),
              0
            )
          `,
        })
        .from(posts)
        .innerJoin(tweets, eq(tweets.postId, posts.id))
        .where(ilike(tweets.content, searchPattern))
        .limit(10);

      results.posts = postResults.map((p) => ({
        ...p,
        engagement: Number(p.engagement ?? 0),
      }));
    }

    // Search templates and content
    if (type === "all" || type === "content") {
      const templateResults = await db
        .select({
          id: templates.id,
          type: sql<string>`'template'`,
          title: templates.title,
          description: templates.description,
        })
        .from(templates)
        .where(
          or(ilike(templates.title, searchPattern), ilike(templates.description, searchPattern))!
        )
        .limit(10);

      results.content = templateResults;
    }

    // Search feature flags and config
    if (type === "all" || type === "config") {
      const flagResults = await db
        .select({
          key: featureFlags.key,
          label: sql<string>`${featureFlags.key}`,
          value: featureFlags.enabled,
        })
        .from(featureFlags)
        .where(ilike(featureFlags.key, searchPattern))
        .limit(10);

      results.config = flagResults;
    }

    return Response.json({
      data: {
        users: results.users ?? [],
        posts: results.posts ?? [],
        content: results.content ?? [],
        config: results.config ?? [],
      },
    });
  } catch (err) {
    logger.error("[search] Error", { error: err });
    return ApiError.internal("Failed to perform search");
  }
}
