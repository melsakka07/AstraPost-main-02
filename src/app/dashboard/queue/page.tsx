
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, and, asc, gte, sql, inArray } from "drizzle-orm";
import { Calendar, CheckCircle2, Clock, AlertTriangle, ListOrdered, PlusCircle, ShieldCheck } from "lucide-react";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { CancelPostButton } from "@/components/queue/cancel-post-button";
import { PostApprovalActions } from "@/components/queue/post-approval-actions";
import { QueueRealtimeListener } from "@/components/queue/queue-realtime-listener";
import { RetryPostButton } from "@/components/queue/retry-post-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { UpgradeBanner } from "@/components/ui/upgrade-banner";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlanLimits } from "@/lib/plan-limits";
import { posts, user, xAccounts } from "@/lib/schema";
import { getTeamContext } from "@/lib/team-context";

export default async function QueuePage({
  searchParams,
}: {
  searchParams?: Promise<{ density?: string | string[] }>;
}) {
  const ctx = await getTeamContext();
  if (!ctx) redirect("/login?callbackUrl=/dashboard/queue");

  const session = await auth.api.getSession({ headers: await headers() });
  
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const densityParam = resolvedSearchParams?.density;
  const densityValue = Array.isArray(densityParam) ? densityParam[0] : densityParam;
  const density = densityValue === "compact" ? "compact" : "comfortable";
  const isCompact = density === "compact";

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, ctx.currentTeamId),
    columns: { plan: true, trialEndsAt: true, name: true }
  });

  const isTrialActive = dbUser?.trialEndsAt && new Date() < dbUser.trialEndsAt;
  const plan = isTrialActive ? "pro_monthly" : dbUser?.plan;
  const limits = getPlanLimits(plan);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Get accounts belonging to the current team context
  const teamAccounts = await db.query.xAccounts.findMany({
      where: eq(xAccounts.userId, ctx.currentTeamId),
      columns: { id: true }
  });
  const accountIds = teamAccounts.map(a => a.id);

  let postCount = 0;
  let scheduledPosts: any[] = [];
  let failedPosts: any[] = [];
  let awaitingApprovalPosts: any[] = [];

  if (accountIds.length > 0) {
      const postCountRes = await db.select({ count: sql<number>`count(*)` })
        .from(posts)
        .where(and(
          inArray(posts.xAccountId, accountIds),
          gte(posts.createdAt, startOfMonth)
        ));
      
      postCount = Number(postCountRes[0]?.count ?? 0);

      scheduledPosts = await db.query.posts.findMany({
        where: and(
            inArray(posts.xAccountId, accountIds),
            eq(posts.status, "scheduled")
        ),
        orderBy: [asc(posts.scheduledAt)],
        with: {
            tweets: {
                orderBy: (tweets, { asc }) => [asc(tweets.position)],
            },
            user: {
                columns: { name: true, image: true }
            }
        }
      });

      failedPosts = await db.query.posts.findMany({
        where: and(inArray(posts.xAccountId, accountIds), eq(posts.status, "failed")),
        orderBy: [asc(posts.updatedAt)],
        with: {
          tweets: {
            orderBy: (tweets, { asc }) => [asc(tweets.position)],
          },
          user: {
            columns: { name: true, image: true }
          }
        },
      });

      awaitingApprovalPosts = await db.query.posts.findMany({
        where: and(inArray(posts.xAccountId, accountIds), eq(posts.status, "awaiting_approval")),
        orderBy: [asc(posts.createdAt)],
        with: {
            tweets: {
                orderBy: (tweets, { asc }) => [asc(tweets.position)],
            },
            user: {
                columns: { name: true, image: true }
            }
        }
      });
  }
  
  const isNearLimit = limits.postsPerMonth !== Infinity && postCount >= limits.postsPerMonth - 2;

  const queueDensityHref = (nextDensity: "comfortable" | "compact") => {
    const params = new URLSearchParams();
    if (nextDensity === "compact") {
      params.set("density", "compact");
    }
    const query = params.toString();
    return query ? `/dashboard/queue?${query}` : "/dashboard/queue";
  };

  return (
    <DashboardPageWrapper
      icon={ListOrdered}
      title={ctx.isOwner ? "Scheduled Queue" : `${dbUser?.name || 'Team'}'s Queue`}
      description="Manage scheduled and failed posts."
      actions={
        <>
          <Badge variant="outline" className="text-muted-foreground">
            {postCount} / {limits.postsPerMonth === Infinity ? "∞" : limits.postsPerMonth} this month
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
          <Button asChild>
            <Link href="/dashboard/compose">
              <PlusCircle className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">New Post</span>
            </Link>
          </Button>
        </>
      }
    >
      <QueueRealtimeListener />

      {isNearLimit && (
        <UpgradeBanner 
          title={postCount >= limits.postsPerMonth ? "Monthly Limit Reached" : "Approaching Monthly Limit"}
          description={`You have used ${postCount} of your ${limits.postsPerMonth} posts this month. Upgrade to Pro for unlimited scheduling.`}
        />
      )}
      
      {awaitingApprovalPosts.length > 0 && (
          <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight text-warning flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    Awaiting Approval
                </h2>
              </div>
              {awaitingApprovalPosts.map((post, index) => (
                <Card key={post.id} className="border-warning/30 bg-warning/10">
                    <CardContent className={`flex flex-col gap-4 sm:flex-row sm:gap-6 ${isCompact ? "p-3 sm:p-4" : "p-4 sm:p-6"}`}>
                        <div className="flex flex-row items-center gap-3 rounded-lg bg-warning/15 p-3 sm:flex-col sm:justify-center sm:p-4 sm:text-center sm:min-w-[100px]">
                            <ShieldCheck className="h-5 w-5 shrink-0 text-warning sm:h-6 sm:w-6 sm:mb-2" />
                            <div className="text-xs text-muted-foreground">Needs Review</div>
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex gap-2 items-center">
                                    <Badge variant="outline" className="border-warning/30 text-warning bg-warning/10">
                                        {post.type === "thread" ? "Thread" : "Tweet"}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        by {post.user.name}
                                    </span>
                                </div>
                                {(ctx.isOwner || ctx.role === "admin") && (
                                    <PostApprovalActions
                                      postId={post.id}
                                      ariaLabel={`post ${index + 1}: ${String(post.tweets[0]?.content ?? "").slice(0, 50)}`}
                                    />
                                )}
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
            {scheduledPosts.map((post, index) => (
                <Card key={post.id}>
                    <CardContent className={`flex flex-col gap-4 sm:flex-row sm:gap-6 ${isCompact ? "p-3 sm:p-4" : "p-4 sm:p-6"}`}>
                        <div className="flex flex-row items-center gap-3 rounded-lg bg-muted/50 p-3 sm:flex-col sm:justify-center sm:p-4 sm:text-center sm:min-w-[100px]">
                            <Clock className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6 sm:mb-1" />
                            <div>
                                <div className="text-sm font-bold">
                                    {post.scheduledAt ? new Date(post.scheduledAt).toLocaleDateString() : "No Date"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {post.scheduledAt ? new Date(post.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                </div>
                            </div>
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex gap-2 items-center">
                                    <Badge variant="outline">{post.type === "thread" ? "Thread" : "Tweet"}</Badge>
                                    <Badge variant="secondary">Scheduled</Badge>
                                    {!ctx.isOwner && post.user.id !== session?.user.id && (
                                        <span className="text-xs text-muted-foreground">by {post.user.name}</span>
                                    )}
                                </div>
                                <CancelPostButton
                                  postId={post.id}
                                  ariaLabel={`Cancel scheduled post ${index + 1}: ${String(post.tweets[0]?.content ?? "").slice(0, 50)}`}
                                />
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
        <h2 className="text-xl font-semibold tracking-tight">Failed Posts</h2>
        {failedPosts.length > 0 && (
          <p className="hidden text-sm text-muted-foreground sm:block">Retry or edit failed content quickly</p>
        )}
      </div>

      {failedPosts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-success/30 bg-success/10 px-4 py-6 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-success/15">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <h3 className="text-sm font-semibold text-success">All clear!</h3>
          <p className="mt-1 text-xs text-success/70">No failed posts. All queue jobs are healthy.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {failedPosts.map((post, index) => (
            <Card key={post.id}>
              <CardContent className={`flex flex-col gap-4 sm:flex-row sm:gap-6 ${isCompact ? "p-3 sm:p-4" : "p-4 sm:p-6"}`}>
                <div className="flex flex-row items-center gap-3 rounded-lg bg-muted/50 p-3 sm:flex-col sm:justify-center sm:p-4 sm:text-center sm:min-w-[100px]">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-destructive sm:h-6 sm:w-6 sm:mb-2" />
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
                    <RetryPostButton
                    postId={post.id}
                    ariaLabel={`Retry failed post ${index + 1}: ${String(post.tweets[0]?.content ?? "").slice(0, 50)}`}
                  />
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
    </DashboardPageWrapper>
  );
}
