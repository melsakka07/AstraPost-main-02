
import { redirect } from "next/navigation";
import { eq, and, asc, gte, sql, inArray } from "drizzle-orm";
import { QueueContent } from "@/components/queue/queue-content";
import { db } from "@/lib/db";
import { getPlanLimits } from "@/lib/plan-limits";
import { posts, user, xAccounts } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

const SCHEDULED_PAGE_SIZE = 20;

export default async function QueuePage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string | string[] }>;
}) {
  const ctx = await getTeamContext();
  if (!ctx) redirect("/login?callbackUrl=/dashboard/queue");

  const resolvedParams = searchParams ? await searchParams : undefined;
  const pageParam = resolvedParams?.page;
  const scheduledPage = Math.max(0, parseInt(Array.isArray(pageParam) ? (pageParam[0] ?? "0") : (pageParam ?? "0"), 10) || 0);

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, ctx.currentTeamId),
    columns: { plan: true, trialEndsAt: true, name: true },
  });

  const isTrialActive = dbUser?.trialEndsAt && new Date() < dbUser.trialEndsAt;
  const plan = isTrialActive ? "pro_monthly" : dbUser?.plan;
  const limits = getPlanLimits(plan);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const teamAccounts = await db.query.xAccounts.findMany({
    where: eq(xAccounts.userId, ctx.currentTeamId),
    columns: { id: true },
  });
  const accountIds = teamAccounts.map((a) => a.id);

  let postCount = 0;
  let scheduledPosts: any[] = [];
  let hasMoreScheduled = false;
  let totalScheduled = 0;
  let failedPosts: any[] = [];
  let awaitingApprovalPosts: any[] = [];

  if (accountIds.length > 0) {
    const [postCountRes, scheduledCountRes] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(posts)
        .where(and(inArray(posts.xAccountId, accountIds), gte(posts.createdAt, startOfMonth))),
      db
        .select({ count: sql<number>`count(*)` })
        .from(posts)
        .where(and(inArray(posts.xAccountId, accountIds), eq(posts.status, "scheduled"))),
    ]);
    postCount = Number(postCountRes[0]?.count ?? 0);
    totalScheduled = Number(scheduledCountRes[0]?.count ?? 0);

    // P1 — paginate scheduled posts; fetch one extra to detect hasMore
    const scheduledRaw = await db.query.posts.findMany({
      where: and(inArray(posts.xAccountId, accountIds), eq(posts.status, "scheduled")),
      orderBy: [asc(posts.scheduledAt)],
      limit: SCHEDULED_PAGE_SIZE + 1,
      offset: scheduledPage * SCHEDULED_PAGE_SIZE,
      with: {
        tweets: { orderBy: (tweets, { asc }) => [asc(tweets.position)] },
        user: { columns: { name: true, image: true } },
        xAccount: { columns: { id: true, xUsername: true, xSubscriptionTier: true } },
      },
    });
    hasMoreScheduled = scheduledRaw.length > SCHEDULED_PAGE_SIZE;
    scheduledPosts = hasMoreScheduled ? scheduledRaw.slice(0, SCHEDULED_PAGE_SIZE) : scheduledRaw;

    failedPosts = await db.query.posts.findMany({
      where: and(inArray(posts.xAccountId, accountIds), sql`${posts.status}::text IN ('failed', 'paused_needs_reconnect')`),
      orderBy: [asc(posts.updatedAt)],
      with: {
        tweets: { orderBy: (tweets, { asc }) => [asc(tweets.position)] },
        user: { columns: { name: true, image: true } },
        xAccount: { columns: { id: true, xUsername: true, xSubscriptionTier: true } },
      },
    });

    awaitingApprovalPosts = await db.query.posts.findMany({
      where: and(inArray(posts.xAccountId, accountIds), eq(posts.status, "awaiting_approval")),
      orderBy: [asc(posts.createdAt)],
      with: {
        tweets: { orderBy: (tweets, { asc }) => [asc(tweets.position)] },
        user: { columns: { name: true, image: true } },
        xAccount: { columns: { id: true, xUsername: true, xSubscriptionTier: true } },
      },
    });
  }

  const isNearLimit =
    limits.postsPerMonth !== Infinity && postCount >= limits.postsPerMonth - 2;

  // Serialize Infinity as null for the client component (Infinity can't cross RSC boundary)
  const postsPerMonthLimit =
    limits.postsPerMonth === Infinity ? null : limits.postsPerMonth;

  return (
    <QueueContent
      title={ctx.isOwner ? "Scheduled Queue" : `${dbUser?.name || "Team"}'s Queue`}
      postCount={postCount}
      postsPerMonthLimit={postsPerMonthLimit}
      isNearLimit={isNearLimit}
      scheduledPosts={scheduledPosts}
      hasMoreScheduled={hasMoreScheduled}
      scheduledPage={scheduledPage}
      totalScheduled={totalScheduled}
      failedPosts={failedPosts}
      awaitingApprovalPosts={awaitingApprovalPosts}
      isOwner={ctx.isOwner}
      role={ctx.role ?? ""}
      currentUserId={ctx.session.user.id}
    />
  );
}
