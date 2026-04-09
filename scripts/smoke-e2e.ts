import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db, dbClient } from "@/lib/db";
import { connection, scheduleQueue } from "@/lib/queue/client";
import { posts, tweets, user, xAccounts, jobRuns } from "@/lib/schema";
import { encryptToken } from "@/lib/security/token-encryption";

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const now = new Date();
  const correlationId = `smoke-${crypto.randomUUID()}`;

  const userId = crypto.randomUUID();
  const xAccountId = crypto.randomUUID();
  const postId = crypto.randomUUID();
  const tweetId = crypto.randomUUID();

  await db.insert(user).values({
    id: userId,
    name: "Smoke Test",
    email: `smoke-${userId}@example.com`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
    onboardingCompleted: true,
  });

  await db.insert(xAccounts).values({
    id: xAccountId,
    userId,
    xUserId: `smoke_x_${xAccountId}`,
    xUsername: "smoke_user",
    xDisplayName: "Smoke User",
    xAvatarUrl: null,
    accessToken: encryptToken("smoke-access-token"),
    refreshTokenEnc: null,
    tokenExpiresAt: null,
    followersCount: 0,
    isDefault: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(posts).values({
    id: postId,
    userId,
    xAccountId,
    groupId: null,
    type: "tweet",
    status: "scheduled",
    scheduledAt: now,
    publishedAt: null,
    failReason: null,
    lastErrorCode: null,
    lastErrorAt: null,
    retryCount: 0,
    aiGenerated: false,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(tweets).values({
    id: tweetId,
    postId,
    content: "Smoke test tweet",
    position: 1,
    xTweetId: null,
    mediaIds: [],
    createdAt: now,
  });

  await scheduleQueue.add(
    "publish-post",
    { postId, userId, correlationId },
    {
      delay: 0,
      jobId: postId,
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  const timeoutMs = 30_000;
  const started = Date.now();
  let runRow: any = null;
  let postRow: any = null;

  while (Date.now() - started < timeoutMs) {
    runRow = await db.query.jobRuns.findFirst({
      where: and(eq(jobRuns.queueName, "schedule-queue"), eq(jobRuns.jobId, postId)),
    });
    postRow = await db.query.posts.findFirst({ where: eq(posts.id, postId) });
    if (runRow?.status === "success" || runRow?.status === "failed") break;
    await sleep(500);
  }

  const tweetRow = await db.query.tweets.findFirst({ where: eq(tweets.id, tweetId) });

  console.log(
    JSON.stringify(
      {
        ok:
          runRow?.status === "success" &&
          postRow?.status === "published" &&
          Boolean(tweetRow?.xTweetId),
        correlationId,
        jobRuns: runRow,
        post: postRow,
        tweet: tweetRow,
      },
      null,
      2
    )
  );

  await scheduleQueue.close();
  await connection.quit();
  await dbClient.end({ timeout: 5 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
