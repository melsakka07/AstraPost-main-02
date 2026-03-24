/**
 * Self-stats endpoint
 * GET /api/analytics/self-stats
 *
 * Returns a lightweight summary of the authenticated user's own posting
 * patterns — posting frequency, top hashtags, and preferred content types
 * derived from published posts in the last 90 days.
 *
 * Used by the Competitor Analyzer to power the A33 side-by-side comparison.
 * No plan-gate required: this is the user's own data and the call is only
 * triggered after a successful competitor analysis (already plan-gated).
 */

import { headers } from "next/headers";
import { and, desc, eq, gte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { posts, tweets } from "@/lib/schema";

export async function GET(_req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return new Response("Unauthorized", { status: 401 });

    const userId = session.user.id;

    // Fetch published tweets from the last 90 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const publishedTweets = await db
      .select({
        postId: posts.id,
        content: tweets.content,
        publishedAt: posts.publishedAt,
      })
      .from(tweets)
      .innerJoin(posts, eq(tweets.postId, posts.id))
      .where(
        and(
          eq(posts.userId, userId),
          eq(posts.status, "published"),
          gte(posts.publishedAt, cutoff)
        )
      )
      .orderBy(desc(posts.publishedAt))
      .limit(200);

    if (publishedTweets.length === 0) {
      return Response.json({ hasData: false });
    }

    // ── Posting frequency ───────────────────────────────────────────────────
    // Count distinct posts (a thread's N tweets = 1 post unit)
    const distinctPostCount = new Set(publishedTweets.map((t) => t.postId)).size;
    const postsPerWeek = Math.round((distinctPostCount / 90) * 7 * 10) / 10;
    const postingFrequency =
      postsPerWeek < 1
        ? "< 1 post/week"
        : postsPerWeek === 1
          ? "~1 post/week"
          : `~${postsPerWeek} posts/week`;

    // ── Top hashtags ────────────────────────────────────────────────────────
    const hashtagCounts = new Map<string, number>();
    for (const t of publishedTweets) {
      // Match ASCII + Arabic + Hebrew hashtags
      const matches = t.content.match(/#[\w\u0590-\u05FF\u0600-\u06FF]+/g) ?? [];
      for (const tag of matches) {
        const norm = tag.toLowerCase();
        hashtagCounts.set(norm, (hashtagCounts.get(norm) ?? 0) + 1);
      }
    }

    const topHashtags = Array.from(hashtagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag.replace(/^#/, ""));

    // ── Content types ────────────────────────────────────────────────────────
    const contentTypeCounts = new Map<string, number>();
    const addType = (type: string) =>
      contentTypeCounts.set(type, (contentTypeCounts.get(type) ?? 0) + 1);

    for (const t of publishedTweets) {
      const text = t.content;
      if (text.includes("?")) addType("question");
      if (/https?:\/\//.test(text)) addType("link");
      if (/["\u201c\u201d\u00ab\u00bb]/.test(text)) addType("quote");
      if (/\d+%|\d+ percent|\d+\/\d+/.test(text)) addType("statistic");
      if (/\n\n/.test(text)) addType("thread");
      if (
        !text.includes("?") &&
        !/https?:\/\//.test(text) &&
        !/\n\n/.test(text)
      ) {
        addType("plain text");
      }
    }

    const preferredContentTypes = Array.from(contentTypeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([type]) => type);

    return Response.json({
      hasData: true,
      tweetsAnalyzed: distinctPostCount,
      postingFrequency,
      topHashtags,
      preferredContentTypes,
    });
  } catch (error) {
    console.error("Self-stats error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to compute self stats" }),
      { status: 500 }
    );
  }
}
