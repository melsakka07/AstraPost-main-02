import { Suspense } from "react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, gte, isNotNull } from "drizzle-orm";
import {
  BarChart3,
  Heart,
  MessageCircle,
  Repeat2,
  MousePointerClick,
  AlignJustify,
  LayoutGrid,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AccountSelector } from "@/components/analytics/account-selector";
import { AnalyticsSectionNav } from "@/components/analytics/analytics-section-nav";
import {
  FollowerChart,
  ImpressionsChart,
  EngagementRateChart,
  BestTimeHeatmap,
} from "@/components/analytics/charts-wrapper";
import { DateRangeSelector } from "@/components/analytics/date-range-selector";
import { ExportButton } from "@/components/analytics/export-button";
import { ManualRefreshButton } from "@/components/analytics/manual-refresh-button";
import { TopTweetsList } from "@/components/analytics/top-tweets-list";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { BlurredOverlay } from "@/components/ui/blurred-overlay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { UpgradeBanner } from "@/components/ui/upgrade-banner";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  analyticsRefreshRuns,
  followerSnapshots,
  posts,
  tweetAnalytics,
  tweetAnalyticsSnapshots,
  tweets,
  user,
  xAccounts,
} from "@/lib/schema";
import { AnalyticsEngine } from "@/lib/services/analytics-engine";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    accountId?: string | string[];
    density?: string | string[];
    range?: string | string[];
  }>;
}) {
  const t = await getTranslations("analytics");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?callbackUrl=/dashboard/analytics");
  const userLocale =
    session?.user && "language" in session.user ? (session.user as any).language : "en";

  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  // Params
  const densityParam = resolvedSearchParams?.density;
  const densityValue = Array.isArray(densityParam) ? densityParam[0] : densityParam;
  const density = densityValue === "compact" ? "compact" : "comfortable";
  const isCompact = density === "compact";

  const rangeParam = resolvedSearchParams?.range;
  const rangeValue = Array.isArray(rangeParam) ? rangeParam[0] : rangeParam;
  const range = rangeValue || "30d";

  // ── Round 1: two independent queries in parallel ──────────────────────────
  // dbUser is needed to compute effectiveRange/startDate.
  // accounts is needed to resolve selectedAccountId.
  // Both are independent so they run concurrently.
  const [dbUser, accounts] = await Promise.all([
    db.query.user.findFirst({
      where: eq(user.id, session.user.id),
      columns: { plan: true, trialEndsAt: true },
    }),
    db.query.xAccounts.findMany({
      where: and(eq(xAccounts.userId, session.user.id), eq(xAccounts.isActive, true)),
      orderBy: [desc(xAccounts.isDefault), asc(xAccounts.createdAt)],
    }),
  ]);

  const isTrialActive = dbUser?.trialEndsAt && new Date() < dbUser.trialEndsAt;
  const isFree = !isTrialActive && dbUser?.plan === "free";

  // Enforce limits if free
  const effectiveRange = isFree ? "7d" : range;
  const rangeDays = parseInt(effectiveRange.replace("d", "")) || 30;

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
  const prevStartDate = new Date(startDate.getTime() - rangeDays * 24 * 60 * 60 * 1000);

  // ── Round 2: five independent queries in parallel ──────────────────────────
  // All depend only on values already resolved above; none depend on each other.
  const [followerPoints, refreshRuns, snapshots, prevSnapshots, topTweets, bestTimeData] =
    await Promise.all([
      // 1. Follower snapshots
      selectedAccountId
        ? db.query.followerSnapshots.findMany({
            where: and(
              eq(followerSnapshots.userId, session.user.id),
              eq(followerSnapshots.xAccountId, selectedAccountId),
              gte(followerSnapshots.capturedAt, startDate)
            ),
            orderBy: [asc(followerSnapshots.capturedAt)],
            limit: 1000,
          })
        : Promise.resolve([]),

      // 2. Analytics refresh runs
      selectedAccountId
        ? db.query.analyticsRefreshRuns.findMany({
            where: and(
              eq(analyticsRefreshRuns.userId, session.user.id),
              eq(analyticsRefreshRuns.xAccountId, selectedAccountId)
            ),
            orderBy: [desc(analyticsRefreshRuns.startedAt)],
            limit: 5,
          })
        : Promise.resolve([]),

      // 3. Tweet metrics snapshots
      db
        .select({
          fetchedAt: tweetAnalyticsSnapshots.fetchedAt,
          impressions: tweetAnalyticsSnapshots.impressions,
          likes: tweetAnalyticsSnapshots.likes,
          retweets: tweetAnalyticsSnapshots.retweets,
          replies: tweetAnalyticsSnapshots.replies,
          clicks: tweetAnalyticsSnapshots.linkClicks,
          engagementRate: tweetAnalyticsSnapshots.engagementRate,
        })
        .from(tweetAnalyticsSnapshots)
        .innerJoin(tweets, eq(tweetAnalyticsSnapshots.tweetId, tweets.id))
        .innerJoin(posts, eq(tweets.postId, posts.id))
        .where(
          and(eq(posts.userId, session.user.id), gte(tweetAnalyticsSnapshots.fetchedAt, startDate))
        ),

      // 4. Previous period tweet metrics snapshots (for trend indicators)
      db
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
          and(
            eq(posts.userId, session.user.id),
            gte(tweetAnalyticsSnapshots.fetchedAt, prevStartDate),
            and(
              eq(posts.userId, session.user.id),
              gte(tweetAnalyticsSnapshots.fetchedAt, prevStartDate)
            )
          )
        )
        .then((rows) => rows.filter((r) => new Date(r.fetchedAt) < startDate)),

      // 5. Top tweets by impressions (isNotNull replaces the @ts-ignore sql string)
      db
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
        .where(and(eq(posts.userId, session.user.id), isNotNull(tweets.xTweetId)))
        .orderBy(desc(tweetAnalytics.impressions))
        .limit(5),

      // 5. Best times to post heatmap
      AnalyticsEngine.getBestTimesToPost(session.user.id),
    ]);

  // ── Derive chart data from query results ───────────────────────────────────
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

  const prevTotals = prevSnapshots.reduce(
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

  const delta = (current: number, previous: number) => {
    const diff = current - previous;
    if (previous === 0) return null;
    return diff;
  };

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

  const byDayEngagement = new Map<string, { sumRate: number; count: number }>();
  for (const s of snapshots) {
    const day = new Date(s.fetchedAt).toISOString().slice(0, 10);
    const existing = byDayEngagement.get(day) ?? { sumRate: 0, count: 0 };
    byDayEngagement.set(day, {
      sumRate: existing.sumRate + (Number(s.engagementRate) ?? 0),
      count: existing.count + 1,
    });
  }
  const engagementChartData = Array.from(byDayEngagement.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { sumRate, count }]) => ({
      date,
      value: parseFloat((sumRate / count).toFixed(2)),
    }));

  return (
    <DashboardPageWrapper
      icon={BarChart3}
      title={t("title")}
      description={t("description")}
      actions={
        <>
          <DateRangeSelector />
          <ExportButton range={effectiveRange} />
          <Link
            href={analyticsHref(isCompact ? "comfortable" : "compact")}
            aria-label={isCompact ? t("switch_to_comfortable") : t("switch_to_compact")}
          >
            <Button variant="outline" size="icon" className="h-9 w-9">
              {isCompact ? (
                <AlignJustify className="h-4 w-4" />
              ) : (
                <LayoutGrid className="h-4 w-4" />
              )}
            </Button>
          </Link>
        </>
      }
    >
      {isFree && (
        <UpgradeBanner
          title={t("upgrade_banner_title")}
          description={t("upgrade_banner_description")}
        />
      )}

      <AnalyticsSectionNav />

      {/* ── Overview Section ── */}
      <div id="section-overview" className="flex items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{t("overview_tab")}</h2>
        <div className="bg-border h-px flex-1" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t("follower_tracking")}</CardTitle>
          {selectedAccountId ? (
            <ManualRefreshButton
              xAccountId={selectedAccountId}
              lastRefreshedAt={refreshRuns[0]?.finishedAt ?? refreshRuns[0]?.startedAt ?? null}
            />
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.length > 1 && (
            <AccountSelector
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              isCompact={isCompact}
              range={effectiveRange}
            />
          )}

          <div className={`grid sm:grid-cols-2 md:grid-cols-3 ${isCompact ? "gap-3" : "gap-4"}`}>
            <Card>
              <CardHeader className="space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("current_followers")}</CardTitle>
              </CardHeader>
              <CardContent className={isCompact ? "px-4 pt-0 pb-4" : undefined}>
                <div className={`${isCompact ? "text-xl" : "text-xl md:text-2xl"} font-bold`}>
                  {latestFollowers?.toLocaleString(userLocale) || "—"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("growth", { range: effectiveRange })}
                </CardTitle>
              </CardHeader>
              <CardContent className={isCompact ? "px-4 pt-0 pb-4" : undefined}>
                <div className={`${isCompact ? "text-xl" : "text-xl md:text-2xl"} font-bold`}>
                  {followerGrowth > 0 ? "+" : ""}
                  {followerGrowth.toLocaleString(userLocale)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("start_of_period")}</CardTitle>
              </CardHeader>
              <CardContent className={isCompact ? "px-4 pt-0 pb-4" : undefined}>
                <div className={`${isCompact ? "text-xl" : "text-xl md:text-2xl"} font-bold`}>
                  {followersStart.toLocaleString(userLocale)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <BlurredOverlay
              isLocked={isFree && rangeDays > 7}
              title={t("follower_history")}
              description={t("follower_history_cta")}
            >
              {accounts.length === 0 ? (
                <EmptyState
                  icon={<BarChart3 className="h-6 w-6" />}
                  title={t("connect_x_cta")}
                  description={t("connect_x_description")}
                  primaryAction={
                    <Button asChild>
                      <Link href="/dashboard/settings">{t("connect_account")}</Link>
                    </Button>
                  }
                />
              ) : (
                <FollowerChart data={followerChartData} />
              )}
            </BlurredOverlay>
          </div>

          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 select-none">
              <h2 className="text-base font-semibold">{t("refresh_history")}</h2>
              <span className="text-muted-foreground text-xs group-open:hidden">
                {t("click_expand")}
              </span>
              <span className="text-muted-foreground hidden text-xs group-open:inline">
                {t("click_collapse")}
              </span>
            </summary>
            <div className="mt-2">
              {refreshRuns.length === 0 ? (
                <div className="text-muted-foreground text-sm">{t("no_refreshes")}</div>
              ) : (
                <div className="space-y-2">
                  {refreshRuns.map((r) => {
                    const statusIcon =
                      r.status === "success" ? (
                        <CheckCircle2
                          className="h-3.5 w-3.5 shrink-0 text-emerald-500"
                          aria-hidden="true"
                        />
                      ) : r.status === "failed" ? (
                        <XCircle
                          className="text-destructive h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <Clock
                          className="text-muted-foreground h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                      );
                    return (
                      <div
                        key={r.id}
                        className="flex flex-col gap-2 rounded-md border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="text-muted-foreground">
                          {new Date(r.startedAt).toLocaleString(userLocale, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </div>
                        <div className="flex items-center gap-2">
                          {statusIcon}
                          <span
                            className={
                              "rounded px-2 py-0.5 text-xs " +
                              (r.status === "success"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : r.status === "failed"
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-muted text-muted-foreground")
                            }
                            aria-label={`Status: ${r.status}`}
                          >
                            {String(r.status).toUpperCase()}
                          </span>
                          {r.error ? (
                            <span
                              className="text-muted-foreground max-w-[320px] truncate"
                              title={r.error}
                            >
                              {r.error}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </details>
        </CardContent>
      </Card>

      {/* ── Performance Section ── */}
      <div id="section-performance" className="flex items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{t("performance_tab")}</h2>
        <div className="bg-border h-px flex-1" />
      </div>

      <div
        className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 ${isCompact ? "gap-3" : "gap-4"}`}
      >
        {[
          {
            label: t("impressions"),
            icon: BarChart3,
            current: totals.impressions,
            prev: prevTotals.impressions,
          },
          { label: t("likes"), icon: Heart, current: totals.likes, prev: prevTotals.likes },
          {
            label: t("retweets"),
            icon: Repeat2,
            current: totals.retweets,
            prev: prevTotals.retweets,
          },
          {
            label: t("replies"),
            icon: MessageCircle,
            current: totals.replies,
            prev: prevTotals.replies,
          },
          {
            label: t("link_clicks"),
            icon: MousePointerClick,
            current: totals.clicks,
            prev: prevTotals.clicks,
          },
        ].map(({ label, icon: Icon, current, prev }) => {
          const d = delta(current, prev);
          return (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent className={isCompact ? "px-4 pt-0 pb-4" : undefined}>
                <div className={`${isCompact ? "text-xl" : "text-xl md:text-2xl"} font-bold`}>
                  {current.toLocaleString(userLocale)}
                </div>
                {d !== null && (
                  <p className={`mt-1 text-xs ${d >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                    {d >= 0 ? "↑" : "↓"} {Math.abs(d).toLocaleString(userLocale)} {t("vs_prev")}{" "}
                    {effectiveRange}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">
          {t("impressions")} ({effectiveRange})
        </h2>
        <BlurredOverlay
          isLocked={isFree && rangeDays > 7}
          title={t("impressions_history_cta")}
          description={t("impressions_history_cta_detail")}
        >
          <ImpressionsChart data={impressionsChartData} />
        </BlurredOverlay>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">
          {t("engagement_rate_title", { range: effectiveRange })}
        </h2>
        <BlurredOverlay
          isLocked={isFree && rangeDays > 7}
          title={t("engagement_history_cta")}
          description={t("engagement_history_cta_detail")}
        >
          <EngagementRateChart data={engagementChartData} />
        </BlurredOverlay>
      </div>

      {/* ── Insights Section ── */}
      <div id="section-insights" className="flex items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{t("insights_tab")}</h2>
        <div className="bg-border h-px flex-1" />
      </div>

      <div className="space-y-3">
        <h3 className="text-xl font-semibold">{t("best_time_post")}</h3>
        <BlurredOverlay
          isLocked={isFree}
          title={t("optimization_insights")}
          description={t("optimization_cta_detail")}
        >
          <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-lg" />}>
            <BestTimeHeatmap data={bestTimeData} />
          </Suspense>
        </BlurredOverlay>
      </div>

      <div className="space-y-3">
        <h3 className="text-xl font-semibold">{t("top_tweets")}</h3>
        <BlurredOverlay
          isLocked={isFree}
          title={t("top_tweets")}
          description={t("top_tweets_cta_detail")}
        >
          {topTweets.length === 0 ? (
            <EmptyState
              icon={<BarChart3 className="h-6 w-6" />}
              title={t("no_tweet_analytics")}
              description={t("no_tweet_analytics_description")}
              primaryAction={
                <Button asChild>
                  <Link href="/dashboard/compose">{t("publish_post")}</Link>
                </Button>
              }
            />
          ) : (
            <TopTweetsList
              // Narrow xTweetId from string|null to string — isNotNull() in the
              // WHERE clause guarantees no nulls, but Drizzle's type inference
              // can't reflect WHERE clause narrowing on selected columns.
              tweets={topTweets.filter(
                (tw): tw is typeof tw & { xTweetId: string } => tw.xTweetId !== null
              )}
              isCompact={isCompact}
              userLocale={userLocale}
            />
          )}
        </BlurredOverlay>
      </div>
    </DashboardPageWrapper>
  );
}
