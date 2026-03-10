import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  analyticsRefreshRuns,
  followerSnapshots,
  tweetAnalytics,
  tweetAnalyticsSnapshots,
  tweets,
  xAccounts,
} from "@/lib/schema";
import { XApiService } from "@/lib/services/x-api";

export async function updateTweetMetrics(options?: { accountIds?: string[] }) {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const recentTweets = await db.query.tweets.findMany({
    where: and(
      sql<boolean>`${tweets.xTweetId} IS NOT NULL`,
      sql<boolean>`${tweets.createdAt} >= ${since}`
    ),
    with: {
      post: {
        with: {
          xAccount: true,
        },
      },
    },
    limit: 200,
  });

  const tweetsToUpdate = recentTweets.filter(
    (t) =>
      t.xTweetId &&
      t.post.status === "published" &&
      t.post.xAccount &&
      (!options?.accountIds || options.accountIds.includes(t.post.xAccountId))
  );

  if (tweetsToUpdate.length === 0) return;

  const tweetsByAccount = tweetsToUpdate.reduce((acc, t) => {
    const accountId = t.post.xAccountId;
    if (!acc[accountId]) acc[accountId] = [];
    acc[accountId].push(t);
    return acc;
  }, {} as Record<string, typeof tweetsToUpdate>);

  for (const accountId of Object.keys(tweetsByAccount)) {
    const accountTweets = tweetsByAccount[accountId] || [];
    const ids = accountTweets.map((t) => t.xTweetId!).filter(Boolean);
    if (ids.length === 0) continue;

    const client = await XApiService.getClientForAccountId(accountId);
    if (!client) continue;

    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 100) {
      chunks.push(ids.slice(i, i + 100));
    }

    const metricsById: Record<
      string,
      {
        impressions: number;
        likes: number;
        retweets: number;
        replies: number;
        linkClicks: number;
        engagementRate: string;
      }
    > = {};

    for (const chunk of chunks) {
      const data = await client.getTweetsPublicMetrics(chunk);
      for (const t of data as any[]) {
        const pm = t?.public_metrics || {};
        const impressions = Number(pm.impression_count || 0);
        const likes = Number(pm.like_count || 0);
        const retweets = Number(pm.retweet_count || 0);
        const replies = Number(pm.reply_count || 0);
        const linkClicks = Number(pm.link_clicks || 0);
        const engagement = likes + retweets + replies;
        const engagementRate = (
          (engagement / Math.max(1, impressions)) * 100
        ).toFixed(2);

        metricsById[String(t.id)] = {
          impressions,
          likes,
          retweets,
          replies,
          linkClicks,
          engagementRate,
        };
      }
    }

    const tweetRows = accountTweets
      .map((t) => ({ tweetId: t.id, xTweetId: t.xTweetId! }))
      .filter((t) => Boolean(metricsById[t.xTweetId]));

    if (tweetRows.length === 0) continue;

    const now = new Date();

    await db.transaction(async (tx) => {
      for (const row of tweetRows) {
        const m = metricsById[row.xTweetId]!;
        await tx
          .insert(tweetAnalytics)
          .values({
            id: crypto.randomUUID(),
            tweetId: row.tweetId,
            xTweetId: row.xTweetId,
            impressions: m.impressions,
            likes: m.likes,
            retweets: m.retweets,
            replies: m.replies,
            linkClicks: m.linkClicks,
            engagementRate: m.engagementRate,
            fetchedAt: now,
          })
          .onConflictDoUpdate({
            target: tweetAnalytics.tweetId,
            set: {
              xTweetId: row.xTweetId,
              impressions: m.impressions,
              likes: m.likes,
              retweets: m.retweets,
              replies: m.replies,
              linkClicks: m.linkClicks,
              engagementRate: m.engagementRate,
              fetchedAt: now,
            },
          });

        await tx.insert(tweetAnalyticsSnapshots).values({
          id: crypto.randomUUID(),
          tweetId: row.tweetId,
          xTweetId: row.xTweetId,
          impressions: m.impressions,
          likes: m.likes,
          retweets: m.retweets,
          replies: m.replies,
          linkClicks: m.linkClicks,
          engagementRate: m.engagementRate,
          fetchedAt: now,
        });
      }
    });
  }
}

export async function refreshFollowersAndMetricsForRuns(runIds: string[]) {
  const runs = await db.query.analyticsRefreshRuns.findMany({
    where: sql<boolean>`${analyticsRefreshRuns.id} IN (${sql.join(
      runIds.map((id) => sql`${id}`),
      sql`,`
    )})`,
  });

  const byAccount = new Map<string, string[]>();
  for (const r of runs) {
    const arr = byAccount.get(r.xAccountId) || [];
    arr.push(r.id);
    byAccount.set(r.xAccountId, arr);
  }

  for (const [accountId, ids] of byAccount.entries()) {
    try {
      const xAcc = await db.query.xAccounts.findFirst({ where: eq(xAccounts.id, accountId) });
      if (!xAcc) throw new Error("X account not found");

      const client = await XApiService.getClientForAccountId(accountId);
      if (!client) throw new Error("No connected X account");

      const followers = await client.getFollowerCount();
      const now = new Date();

      await db.transaction(async (tx) => {
        await tx.insert(followerSnapshots).values({
          id: crypto.randomUUID(),
          userId: xAcc.userId,
          xAccountId: accountId,
          followersCount: followers,
          capturedAt: now,
        });

        await tx.update(xAccounts).set({ followersCount: followers }).where(eq(xAccounts.id, accountId));

        for (const runId of ids) {
          await tx
            .update(analyticsRefreshRuns)
            .set({ status: "success", error: null, finishedAt: now })
            .where(eq(analyticsRefreshRuns.id, runId));
        }
      });

      await updateTweetMetrics({ accountIds: [accountId] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Refresh failed";
      const now = new Date();
      for (const runId of ids) {
        await db
          .update(analyticsRefreshRuns)
          .set({ status: "failed", error: msg, finishedAt: now })
          .where(eq(analyticsRefreshRuns.id, runId));
      }
    }
  }
}
