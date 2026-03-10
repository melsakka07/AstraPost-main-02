import { headers } from "next/headers";
import Link from "next/link";
import { eq, and, asc, gte, sql } from "drizzle-orm";
import { Calendar, Clock, AlertTriangle } from "lucide-react";
import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { CancelPostButton } from "@/components/queue/cancel-post-button";
import { RetryPostButton } from "@/components/queue/retry-post-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { UpgradeBanner } from "@/components/ui/upgrade-banner";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlanLimits } from "@/lib/plan-limits";
import { posts, user } from "@/lib/schema";

export default async function QueuePage({
  searchParams,
}: {
  searchParams?: Promise<{ density?: string | string[] }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const densityParam = resolvedSearchParams?.density;
  const densityValue = Array.isArray(densityParam) ? densityParam[0] : densityParam;
  const density = densityValue === "compact" ? "compact" : "comfortable";
  const isCompact = density === "compact";

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { plan: true, trialEndsAt: true }
  });

  const isTrialActive = dbUser?.trialEndsAt && new Date() < dbUser.trialEndsAt;
  const plan = isTrialActive ? "pro_monthly" : dbUser?.plan;
  const limits = getPlanLimits(plan);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const postCountRes = await db.select({ count: sql<number>`count(*)` })
    .from(posts)
    .where(and(
      eq(posts.userId, session.user.id),
      gte(posts.createdAt, startOfMonth)
    ));
  
  const postCount = Number(postCountRes[0]?.count ?? 0);
  const isNearLimit = limits.postsPerMonth !== Infinity && postCount >= limits.postsPerMonth - 2;

  const scheduledPosts = await db.query.posts.findMany({
    where: and(
        eq(posts.userId, session.user.id),
        eq(posts.status, "scheduled")
    ),
    orderBy: [asc(posts.scheduledAt)],
    with: {
        tweets: {
            orderBy: (tweets, { asc }) => [asc(tweets.position)],
        }
    }
  });

  const failedPosts = await db.query.posts.findMany({
    where: and(eq(posts.userId, session.user.id), eq(posts.status, "failed")),
    orderBy: [asc(posts.updatedAt)],
    with: {
      tweets: {
        orderBy: (tweets, { asc }) => [asc(tweets.position)],
      },
    },
  });
  const queueDensityHref = (nextDensity: "comfortable" | "compact") => {
    const params = new URLSearchParams();
    if (nextDensity === "compact") {
      params.set("density", "compact");
    }
    const query = params.toString();
    return query ? `/dashboard/queue?${query}` : "/dashboard/queue";
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8">
      <PageToolbar
        title="Scheduled Queue"
        description="Manage scheduled and failed posts with faster scan and control."
        actions={
          <>
            <Badge variant="outline" className="text-muted-foreground">
              {postCount} / {limits.postsPerMonth === Infinity ? "∞" : limits.postsPerMonth} Posts this month
            </Badge>
            <div className="hidden items-center rounded-md border p-0.5 lg:flex">
              <Button
                variant={isCompact ? "ghost" : "secondary"}
                size="sm"
                className="h-7 px-2"
                asChild
              >
                <Link href={queueDensityHref("comfortable")}>Comfortable</Link>
              </Button>
              <Button
                variant={isCompact ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2"
                asChild
              >
                <Link href={queueDensityHref("compact")}>Compact</Link>
              </Button>
            </div>
            <Button asChild size="sm">
              <Link href="/dashboard/compose">New Post</Link>
            </Button>
          </>
        }
      />

      {isNearLimit && (
        <UpgradeBanner 
          title={postCount >= limits.postsPerMonth ? "Monthly Limit Reached" : "Approaching Monthly Limit"}
          description={`You have used ${postCount} of your ${limits.postsPerMonth} posts this month. Upgrade to Pro for unlimited scheduling.`}
        />
      )}
      
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Scheduled Posts</h2>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/calendar">Open Calendar</Link>
        </Button>
      </div>

      {scheduledPosts.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-6 w-6" />}
          title="No scheduled posts yet"
          description="Create your first scheduled post to start filling your publishing queue."
          primaryAction={
            <Button asChild>
              <Link href="/dashboard/compose">Create Post</Link>
            </Button>
          }
          secondaryAction={
            <Button variant="outline" asChild>
              <Link href="/dashboard/drafts">Open Drafts</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
            {scheduledPosts.map((post) => (
                <Card key={post.id}>
                    <CardContent className={`flex flex-col gap-4 sm:flex-row sm:gap-6 ${isCompact ? "p-3 sm:p-4" : "p-4 sm:p-6"}`}>
                        <div className="flex flex-col items-center justify-center rounded-lg bg-muted/50 p-4 text-center sm:min-w-[100px]">
                            <Clock className="h-6 w-6 mb-2 text-primary" />
                            <div className="text-sm font-bold">
                                {post.scheduledAt ? new Date(post.scheduledAt).toLocaleDateString() : "No Date"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {post.scheduledAt ? new Date(post.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                            </div>
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex gap-2">
                                    <Badge variant="outline">{post.type === "thread" ? "Thread" : "Tweet"}</Badge>
                                    <Badge variant="secondary">Scheduled</Badge>
                                </div>
                                <CancelPostButton postId={post.id} />
                            </div>
                            <p className={`${isCompact ? "line-clamp-4 text-sm" : "line-clamp-5"} whitespace-pre-wrap break-words`}>{post.tweets[0]?.content}</p>
                            {post.tweets.length > 1 && (
                                <p className="text-sm text-muted-foreground mt-2">
                                    + {post.tweets.length - 1} more tweets
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Failed Posts</h2>
        <p className="text-sm text-muted-foreground">Retry or edit failed content quickly</p>
      </div>

      {failedPosts.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6" />}
          title="No failed posts"
          description="All queue jobs are currently healthy."
          primaryAction={
            <Button variant="outline" asChild>
              <Link href="/dashboard/jobs">View Job History</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {failedPosts.map((post) => (
            <Card key={post.id}>
              <CardContent className={`flex flex-col gap-4 sm:flex-row sm:gap-6 ${isCompact ? "p-3 sm:p-4" : "p-4 sm:p-6"}`}>
                <div className="flex flex-col items-center justify-center rounded-lg bg-muted/50 p-4 text-center sm:min-w-[100px]">
                  <AlertTriangle className="h-6 w-6 mb-2 text-destructive" />
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        {post.type === "thread" ? "Thread" : "Tweet"}
                      </Badge>
                      <Badge variant="destructive">{post.status}</Badge>
                    </div>
                    <RetryPostButton postId={post.id} />
                  </div>
                  <p className="whitespace-pre-wrap break-words">{post.tweets[0]?.content}</p>
                  {post.failReason && (
                    <p className="break-words text-sm text-muted-foreground">{post.failReason}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
