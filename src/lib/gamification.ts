import "server-only";

import { eq, and, count, gte, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { MILESTONES } from "@/lib/milestones";
import { milestones, posts, xAccounts } from "@/lib/schema";

export { MILESTONES };

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
    logger.error("milestone_unlock_failed", {
      milestoneId,
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
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
