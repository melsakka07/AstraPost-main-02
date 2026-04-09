import { eq, and, count, gte, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { milestones, posts, xAccounts } from "@/lib/schema";

export const MILESTONES = {
  FIRST_POST: {
    id: "first_post",
    title: "First Post",
    description: "Published your first post",
    icon: "🚀",
  },
  TEN_POSTS: {
    id: "10_posts",
    title: "Consistent Creator",
    description: "Published 10 posts",
    icon: "✍️",
  },
  HUNDRED_FOLLOWERS: {
    id: "100_followers",
    title: "Growing Audience",
    description: "Reached 100 followers",
    icon: "📈",
  },
  TEN_DAY_STREAK: {
    id: "10_day_streak",
    title: "On Fire",
    description: "Posted for 10 consecutive days",
    icon: "🔥",
  },
} as const;

export async function checkMilestone(
  userId: string,
  event: "post_published" | "analytics_refresh"
) {
  // 1. Check Post Milestones
  if (event === "post_published") {
    const postCountRes = await db
      .select({ count: count() })
      .from(posts)
      .where(and(eq(posts.userId, userId), eq(posts.status, "published")));
    const postCount = postCountRes[0]?.count ?? 0;

    if (postCount >= 1) await unlock(userId, MILESTONES.FIRST_POST.id);
    if (postCount >= 10) await unlock(userId, MILESTONES.TEN_POSTS.id);

    // Check Streak
    const streak = await calculateStreak(userId);
    if (streak >= 10) await unlock(userId, MILESTONES.TEN_DAY_STREAK.id, { streak });
  }

  // 2. Check Analytics Milestones
  if (event === "analytics_refresh") {
    // Get max followers from snapshots or xAccounts
    const account = await db.query.xAccounts.findFirst({
      where: and(eq(xAccounts.userId, userId), eq(xAccounts.isDefault, true)),
      columns: { followersCount: true },
    });

    if (account && (account.followersCount || 0) >= 100) {
      await unlock(userId, MILESTONES.HUNDRED_FOLLOWERS.id, { followers: account.followersCount });
    }
  }
}

async function unlock(userId: string, milestoneId: string, metadata: any = {}) {
  try {
    // Check if already unlocked
    const existing = await db.query.milestones.findFirst({
      where: and(eq(milestones.userId, userId), eq(milestones.milestoneId, milestoneId)),
    });

    if (!existing) {
      await db.insert(milestones).values({
        id: nanoid(),
        userId,
        milestoneId,
        metadata,
        unlockedAt: new Date(),
      });
    }
  } catch (error) {
    console.error(`Failed to unlock milestone ${milestoneId} for user ${userId}`, error);
  }
}

async function calculateStreak(userId: string): Promise<number> {
  // Fetch recent posts dates (last 30 days to cover gaps)
  const recentPosts = await db
    .select({ publishedAt: posts.publishedAt })
    .from(posts)
    .where(
      and(
        eq(posts.userId, userId),
        eq(posts.status, "published"),
        gte(posts.publishedAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      )
    )
    .orderBy(desc(posts.publishedAt));

  if (recentPosts.length === 0) return 0;

  // Use Set to get unique dates (UTC YYYY-MM-DD)
  const dates = new Set<string>();
  recentPosts.forEach((p) => {
    if (p.publishedAt) {
      const dateStr = p.publishedAt.toISOString().split("T")[0];
      if (dateStr) dates.add(dateStr);
    }
  });

  const today = new Date().toISOString().split("T")[0]!;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]!;

  let currentStreak = 0;

  // Start checking from today or yesterday
  let checkDate = new Date();
  if (!dates.has(today)) {
    if (!dates.has(yesterday)) return 0; // Streak broken
    checkDate = new Date(Date.now() - 86400000);
  }

  while (true) {
    const dateStr = checkDate.toISOString().split("T")[0]!;
    if (dates.has(dateStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return currentStreak;
}
