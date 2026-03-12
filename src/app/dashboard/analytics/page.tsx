import { headers } from "next/headers";
import Link from "next/link";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { BarChart3, Heart, MessageCircle, Repeat2, MousePointerClick } from "lucide-react";
import { BestTimeHeatmap } from "@/components/analytics/best-time-heatmap";
import { DateRangeSelector } from "@/components/analytics/date-range-selector";
import { ExportButton } from "@/components/analytics/export-button";
import { FollowerChart } from "@/components/analytics/follower-chart";
import { ImpressionsChart } from "@/components/analytics/impressions-chart";
import { ManualRefreshButton } from "@/components/analytics/manual-refresh-button";
import { TopTweetsList } from "@/components/analytics/top-tweets-list";
import { PageToolbar } from "@/components/dashboard/page-toolbar";
import { BlurredOverlay } from "@/components/ui/blurred-overlay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { UpgradeBanner } from "@/components/ui/upgrade-banner";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { analyticsRefreshRuns, followerSnapshots, posts, tweetAnalytics, tweetAnalyticsSnapshots, tweets, user, xAccounts } from "@/lib/schema";
import { AnalyticsEngine } from "@/lib/services/analytics-engine";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{ accountId?: string | string[]; density?: string | string[]; range?: string | string[] }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  
  // Params
  const densityParam = resolvedSearchParams?.density;
  const densityValue = Array.isArray(densityParam) ? densityParam[0] : densityParam;
  const density = densityValue === "compact" ? "compact" : "comfortable";
  const isCompact = density === "compact";

  const rangeParam = resolvedSearchParams?.range;
  const rangeValue = Array.isArray(rangeParam) ? rangeParam[0] : rangeParam;
  const range = rangeValue || "30d";

  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: { plan: true, trialEndsAt: true }
  });
  
  const isTrialActive = dbUser?.trialEndsAt && new Date() < dbUser.trialEndsAt;
  const isFree = !isTrialActive && dbUser?.plan === "free";
  
  // Enforce limits if free
  const effectiveRange = isFree ? "7d" : range;
  const rangeDays = parseInt(effectiveRange.replace("d", "")) || 30;

  const accounts = await db.query.xAccounts.findMany({
    where: and(eq(xAccounts.userId, session.user.id), eq(xAccounts.isActive, true)),
    orderBy: [desc(xAccounts.isDefault), asc(xAccounts.createdAt)],
  });

  const selectedAccountIdParam = resolvedSearchParams?.accountId;
  const selectedAccountId =
    (Array.isArray(selectedAccountIdParam) ? selectedAccountIdParam[0] : selectedAccountIdParam) ||
    accounts[0]?.id;

  const analyticsHref = (nextDensity: "comfortable" | "compact") => {
    const params = new URLSearchParams();
    if (selectedAccountId) params.set("accountId", selectedAccountId);
    if (nextDensity === "compact") params.set("density", "compact");
    if (range) params.set("range", range);
    const query = params.toString();
    return query ? `/dashboard/analytics?${query}` : "/dashboard/analytics";
  };

  const now = new Date();
  const nowTimestamp = now.getTime();
  const startDate = new Date(nowTimestamp - rangeDays * 24 * 60 * 60 * 1000);

  // 1. Follower Data
  const followerPoints = selectedAccountId
    ? await db.query.followerSnapshots.findMany({
        where: and(
          eq(followerSnapshots.userId, session.user.id),
          eq(followerSnapshots.xAccountId, selectedAccountId),
          gte(followerSnapshots.capturedAt, startDate)
        ),
        orderBy: [asc(followerSnapshots.capturedAt)],
        limit: 1000,
      })
    : [];

  const followerByDay = new Map<string, number>();
  for (const p of followerPoints) {
    const key = new Date(p.capturedAt).toISOString().slice(0, 10);
    followerByDay.set(key, p.followersCount);
  }

  const followerChartData: Array<{ date: string; value: number }> = [];
  let lastValue = followerPoints[0]?.followersCount || 0;

  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(nowTimestamp - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const val = followerByDay.get(d);
    if (val !== undefined) lastValue = val;
    followerChartData.push({ date: d, value: lastValue });
  }

  const latestFollowers = lastValue;
  const followersStart = followerChartData[0]?.value || 0;
  const followerGrowth = latestFollowers - followersStart;

  // 2. Refresh Runs
  const refreshRuns = selectedAccountId
    ? await db.query.analyticsRefreshRuns.findMany({
        where: and(
          eq(analyticsRefreshRuns.userId, session.user.id),
          eq(analyticsRefreshRuns.xAccountId, selectedAccountId)
        ),
        orderBy: [desc(analyticsRefreshRuns.startedAt)],
        limit: 5,
      })
    : [];

  // 3. Tweet Metrics
  const snapshots = await db
    .select({
      fetchedAt: tweetAnalyticsSnapshots.fetchedAt,
      impressions: tweetAnalyticsSnapshots.impressions,
      likes: tweetAnalyticsSnapshots.likes,
      retweets: tweetAnalyticsSnapshots.retweets,
      replies: tweetAnalyticsSnapshots.replies,
      clicks: tweetAnalyticsSnapshots.linkClicks,
    })
    .from(tweetAnalyticsSnapshots)
    .innerJoin(tweets, eq(tweetAnalyticsSnapshots.tweetId, tweets.id))
    .innerJoin(posts, eq(tweets.postId, posts.id))
    .where(
      and(eq(posts.userId, session.user.id), gte(tweetAnalyticsSnapshots.fetchedAt, startDate))
    );

  const totals = snapshots.reduce(
    (acc, s) => {
      acc.impressions += s.impressions || 0;
      acc.likes += s.likes || 0;
      acc.retweets += s.retweets || 0;
      acc.replies += s.replies || 0;
      acc.clicks += s.clicks || 0;
      return acc;
    },
    { impressions: 0, likes: 0, retweets: 0, replies: 0, clicks: 0 }
  );

  const byDay = new Map<string, number>();
  for (const s of snapshots) {
    const key = new Date(s.fetchedAt).toISOString().slice(0, 10);
    const cur = byDay.get(key) || 0;
    byDay.set(key, cur + (s.impressions || 0));
  }

  const impressionsChartData: Array<{ date: string; value: number }> = [];
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(nowTimestamp - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    impressionsChartData.push({ date: d, value: byDay.get(d) || 0 });
  }

  // 4. Top Tweets
  const topTweets = await db
    .select({
      content: tweets.content,
      xTweetId: tweets.xTweetId,
      tweetId: tweets.id,
      impressions: tweetAnalytics.impressions,
      likes: tweetAnalytics.likes,
      retweets: tweetAnalytics.retweets,
      replies: tweetAnalytics.replies,
    })
    .from(tweetAnalytics)
    .innerJoin(tweets, eq(tweetAnalytics.tweetId, tweets.id))
    .innerJoin(posts, eq(tweets.postId, posts.id))
    .where(and(eq(posts.userId, session.user.id), sql`${tweets.xTweetId} IS NOT NULL`))
    .orderBy(desc(tweetAnalytics.impressions))
    .limit(5);

  // 5. Best Time Data
  const bestTimeData = await AnalyticsEngine.getBestTimesToPost(session.user.id);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8">
      <PageToolbar
        title="Analytics Overview"
        description="Track growth trends, post performance, and job refresh health."
        actions={
          <>
            <DateRangeSelector />
            <ExportButton range={effectiveRange} />
            <div className="hidden items-center rounded-md border p-0.5 lg:flex">
              <Button
                variant={isCompact ? "ghost" : "secondary"}
                size="sm"
                className="h-7 px-2"
                asChild
              >
                <Link href={analyticsHref("comfortable")}>Comfortable</Link>
              </Button>
              <Button
                variant={isCompact ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2"
                asChild
              >
                <Link href={analyticsHref("compact")}>Compact</Link>
              </Button>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/queue">Open Queue</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/dashboard/compose">New Post</Link>
            </Button>
          </>
        }
      />

      {isFree && (
        <UpgradeBanner 
          title="Unlock Advanced Analytics"
          description="See 30-day history, top performing tweets, and deeper insights with Pro."
        />
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Follower Tracking</CardTitle>
          {selectedAccountId ? <ManualRefreshButton xAccountId={selectedAccountId} /> : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max items-center gap-2">
            {accounts.length === 0 ? (
              <div className="text-sm text-muted-foreground">Connect an X account to enable follower tracking.</div>
            ) : (
              accounts.map((a) => {
                const active = a.id === selectedAccountId;
                const params = new URLSearchParams({ accountId: a.id });
                if (isCompact) params.set("density", "compact");
                if (range) params.set("range", range);
                return (
                  <Link
                    key={a.id}
                    href={`/dashboard/analytics?${params.toString()}`}
                    className={
                      "rounded-md border px-3 py-1.5 text-sm transition-colors " +
                      (active
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "text-muted-foreground hover:bg-muted")
                    }
                  >
                    @{a.xUsername}
                  </Link>
                );
              })
            )}
            </div>
          </div>

          <div className={`grid md:grid-cols-3 ${isCompact ? "gap-3" : "gap-4"}`}>
            <Card>
              <CardHeader className="space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current followers</CardTitle>
              </CardHeader>
              <CardContent className={isCompact ? "px-4 pb-4 pt-0" : undefined}>
                <div className={`${isCompact ? "text-xl" : "text-2xl"} font-bold`}>{latestFollowers?.toLocaleString() || "—"}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Growth ({effectiveRange})</CardTitle>
              </CardHeader>
              <CardContent className={isCompact ? "px-4 pb-4 pt-0" : undefined}>
                <div className={`${isCompact ? "text-xl" : "text-2xl"} font-bold`}>
                  {followerGrowth > 0 ? "+" : ""}{followerGrowth.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Start of Period</CardTitle>
              </CardHeader>
              <CardContent className={isCompact ? "px-4 pb-4 pt-0" : undefined}>
                <div className={`${isCompact ? "text-xl" : "text-2xl"} font-bold`}>
                  {followersStart.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <BlurredOverlay isLocked={isFree && rangeDays > 7} title="Follower History" description="Upgrade to Pro to see detailed follower growth over time.">
              {accounts.length === 0 ? (
                <EmptyState
                  icon={<BarChart3 className="h-6 w-6" />}
                  title="Connect an X account to unlock analytics"
                  description="Follower and performance insights appear after an active account is connected."
                  primaryAction={
                    <Button asChild>
                      <Link href="/dashboard/settings">Connect Account</Link>
                    </Button>
                  }
                />
              ) : (
                <FollowerChart data={followerChartData} />
              )}
            </BlurredOverlay>
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold">Refresh history</h2>
            {refreshRuns.length === 0 ? (
              <div className="text-sm text-muted-foreground">No refreshes yet.</div>
            ) : (
              <div className="space-y-2">
                {refreshRuns.map((r) => (
                  <div key={r.id} className="flex flex-col gap-2 rounded-md border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-muted-foreground">
                      {new Date(r.startedAt).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          "rounded px-2 py-0.5 text-xs " +
                          (r.status === "success"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : r.status === "failed"
                              ? "bg-red-500/10 text-red-600"
                              : "bg-muted text-muted-foreground")
                        }
                      >
                        {String(r.status).toUpperCase()}
                      </span>
                      {r.error ? (
                        <span className="max-w-[320px] truncate text-muted-foreground" title={r.error}>
                          {r.error}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className={`grid md:grid-cols-2 lg:grid-cols-5 ${isCompact ? "gap-3" : "gap-4"}`}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impressions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className={isCompact ? "px-4 pb-4 pt-0" : undefined}>
            <div className={`${isCompact ? "text-xl" : "text-2xl"} font-bold`}>{totals.impressions.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Likes</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className={isCompact ? "px-4 pb-4 pt-0" : undefined}>
            <div className={`${isCompact ? "text-xl" : "text-2xl"} font-bold`}>{totals.likes.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retweets</CardTitle>
            <Repeat2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className={isCompact ? "px-4 pb-4 pt-0" : undefined}>
            <div className={`${isCompact ? "text-xl" : "text-2xl"} font-bold`}>{totals.retweets.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Replies</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className={isCompact ? "px-4 pb-4 pt-0" : undefined}>
            <div className={`${isCompact ? "text-xl" : "text-2xl"} font-bold`}>{totals.replies.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Link Clicks</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className={isCompact ? "px-4 pb-4 pt-0" : undefined}>
            <div className={`${isCompact ? "text-xl" : "text-2xl"} font-bold`}>{totals.clicks.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Impressions ({effectiveRange})</h2>
        <BlurredOverlay isLocked={isFree && rangeDays > 7} title="Impressions History" description="Upgrade to Pro to see detailed impressions history over time.">
            <ImpressionsChart data={impressionsChartData} />
        </BlurredOverlay>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
              <h2 className="text-xl font-semibold">Best Time to Post</h2>
              <BlurredOverlay isLocked={isFree} title="Optimization Insights" description="Upgrade to Pro to see when your audience is most active.">
                  <BestTimeHeatmap data={bestTimeData} />
              </BlurredOverlay>
          </div>

          <div className="space-y-4">
              <h2 className="text-xl font-semibold">Top Performing Tweets</h2>
              <BlurredOverlay isLocked={isFree} title="Top Tweets" description="See your best performing content with Pro analytics.">
                {topTweets.length === 0 ? (
                  <EmptyState
                    icon={<BarChart3 className="h-6 w-6" />}
                    title="No tweet analytics yet"
                    description="Once published posts are tracked by the analytics worker, your top tweets appear here."
                    primaryAction={
                      <Button asChild>
                        <Link href="/dashboard/compose">Publish a Post</Link>
                      </Button>
                    }
                  />
                ) : (
                  // @ts-ignore - xTweetId is filtered to be not null in the query
                  <TopTweetsList tweets={topTweets} isCompact={isCompact} />
                )}
              </BlurredOverlay>
          </div>
      </div>
    </div>
  );
}
