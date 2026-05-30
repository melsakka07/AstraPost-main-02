import { Suspense } from "react";
import { headers } from "next/headers";
import Link from "next/link";
import { and, asc, eq, gte, lt, lte, sql } from "drizzle-orm";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Home,
  PenSquare,
  PlusCircle,
  Send,
  TrendingDown,
  TrendingUp,
  Wand2,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { PostUsageBar } from "@/components/dashboard/post-usage-bar";
import { QuickActions, selectNextBestAction } from "@/components/dashboard/quick-actions";
import { QuickCompose } from "@/components/dashboard/quick-compose";
import { SetupChecklist } from "@/components/dashboard/setup-checklist";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiGenerations, posts, tweetAnalytics, tweets, user, xAccounts } from "@/lib/schema";

async function getDashboardData(userId: string) {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const startOfYesterday = new Date(
    yesterdayDate.getFullYear(),
    yesterdayDate.getMonth(),
    yesterdayDate.getDate(),
    0,
    0,
    0,
    0
  );
  const endOfYesterday = new Date(
    yesterdayDate.getFullYear(),
    yesterdayDate.getMonth(),
    yesterdayDate.getDate(),
    23,
    59,
    59,
    999
  );

  const [
    publishedTodayPosts,
    scheduledTodayPosts,
    scheduledPosts,
    publishedPosts,
    analytics,
    upcomingPosts,
    // Checklist Data
    hasXAccount,
    hasScheduledPost,
    hasUsedAI,
    userInfo,
    failedPosts,
    // Previous period queries
    yesterdayPublishedPosts,
    prevPeriodAnalytics,
  ] = await Promise.all([
    // Published today (status = published + scheduledAt today)
    db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(
        and(
          eq(posts.userId, userId),
          eq(posts.status, "published"),
          gte(posts.scheduledAt, startOfDay),
          lte(posts.scheduledAt, endOfDay)
        )
      ),
    // Scheduled today (status = scheduled + scheduledAt today)
    db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(
        and(
          eq(posts.userId, userId),
          eq(posts.status, "scheduled"),
          gte(posts.scheduledAt, startOfDay),
          lte(posts.scheduledAt, endOfDay)
        )
      ),
    // Scheduled posts count
    db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(and(eq(posts.userId, userId), eq(posts.status, "scheduled"))),
    // Published posts count
    db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(and(eq(posts.userId, userId), eq(posts.status, "published"))),
    // Avg Engagement Rate (last 30 days)
    db
      .select({ avg: sql<number>`avg(${tweetAnalytics.engagementRate})` })
      .from(tweetAnalytics)
      .innerJoin(tweets, eq(tweetAnalytics.tweetId, tweets.id))
      .innerJoin(posts, eq(tweets.postId, posts.id))
      .where(and(eq(posts.userId, userId), gte(posts.scheduledAt, thirtyDaysAgo))),

    // Upcoming scheduled posts
    db.query.posts.findMany({
      where: and(eq(posts.userId, userId), eq(posts.status, "scheduled")),
      orderBy: [asc(posts.scheduledAt)],
      limit: 5,
      with: {
        tweets: true,
      },
    }),

    // Checklist Checks
    db.query.xAccounts.findFirst({
      where: eq(xAccounts.userId, userId),
      columns: { id: true },
    }),
    db.query.posts.findFirst({
      where: eq(posts.userId, userId),
      columns: { id: true },
    }),
    db.query.aiGenerations.findFirst({
      where: eq(aiGenerations.userId, userId),
      columns: { id: true },
    }),
    db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { plan: true, onboardingState: true },
    }),
    // Failed posts count
    db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(and(eq(posts.userId, userId), eq(posts.status, "failed"))),
    // Yesterday published count (for delta comparison)
    db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(
        and(
          eq(posts.userId, userId),
          eq(posts.status, "published"),
          gte(posts.scheduledAt, startOfYesterday),
          lte(posts.scheduledAt, endOfYesterday)
        )
      ),
    // Previous period avg engagement (30-60 days ago)
    db
      .select({ avg: sql<number>`avg(${tweetAnalytics.engagementRate})` })
      .from(tweetAnalytics)
      .innerJoin(tweets, eq(tweetAnalytics.tweetId, tweets.id))
      .innerJoin(posts, eq(tweets.postId, posts.id))
      .where(
        and(
          eq(posts.userId, userId),
          gte(posts.scheduledAt, sixtyDaysAgo),
          lt(posts.scheduledAt, thirtyDaysAgo)
        )
      ),
  ]);

  const yesterdayPublishedCount = Number(yesterdayPublishedPosts[0]?.count || 0);
  const prevAvgEngagement = Number(prevPeriodAnalytics[0]?.avg || 0);

  return {
    publishedTodayCount: Number(publishedTodayPosts[0]?.count || 0),
    scheduledTodayCount: Number(scheduledTodayPosts[0]?.count || 0),
    scheduledCount: Number(scheduledPosts[0]?.count || 0),
    publishedCount: Number(publishedPosts[0]?.count || 0),
    avgEngagement: Number(analytics[0]?.avg || 0).toFixed(2),
    upcomingPosts,
    failedCount: Number(failedPosts[0]?.count || 0),
    yesterdayPublishedCount,
    prevAvgEngagement,
    checklist: {
      hasXAccount: !!hasXAccount,
      hasScheduledPost: !!hasScheduledPost,
      hasUsedAI: !!hasUsedAI,
      hasProPlan: userInfo?.plan !== "free",
      onboardingState: userInfo?.onboardingState ?? null,
    },
    userPlan: userInfo?.plan || "free",
  };
}

const STAT_CARDS = [
  {
    key: "publishedToday",
    icon: CheckCircle2,
    accent: "border-s-success-9",
    iconColor: "text-success-11",
    iconBg: "bg-success-3",
  },
  {
    key: "scheduledToday",
    icon: Calendar,
    accent: "border-s-info-9",
    iconColor: "text-info-11",
    iconBg: "bg-info-3",
  },
  {
    key: "scheduled",
    icon: Clock,
    accent: "border-s-warning-9",
    iconColor: "text-warning-11",
    iconBg: "bg-warning-3",
  },
  {
    key: "engagement",
    icon: TrendingUp,
    accent: "border-s-info-9",
    iconColor: "text-info-11",
    iconBg: "bg-info-3",
  },
] as const;

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const session = await auth.api.getSession({ headers: await headers() });
  const userLocale =
    session?.user && "language" in session.user ? (session.user as any).language : "en";

  const data = session
    ? await getDashboardData(session.user.id)
    : {
        publishedTodayCount: 0,
        scheduledTodayCount: 0,
        scheduledCount: 0,
        publishedCount: 0,
        avgEngagement: "0.00",
        upcomingPosts: [],
        failedCount: 0,
        yesterdayPublishedCount: 0,
        prevAvgEngagement: 0,
        checklist: {
          hasXAccount: false,
          hasScheduledPost: false,
          hasUsedAI: false,
          hasProPlan: false,
          onboardingState: null,
        },
        userPlan: "free",
      };

  const publishedTodayDelta =
    data.yesterdayPublishedCount > 0 || data.publishedTodayCount > 0
      ? data.publishedTodayCount !== data.yesterdayPublishedCount
        ? {
            text:
              data.publishedTodayCount > data.yesterdayPublishedCount
                ? `+${data.publishedTodayCount - data.yesterdayPublishedCount}`
                : `${data.publishedTodayCount - data.yesterdayPublishedCount}`,
            positive: data.publishedTodayCount > data.yesterdayPublishedCount,
          }
        : null
      : null;

  const engagementDelta =
    data.prevAvgEngagement > 0
      ? (() => {
          const diff = parseFloat(data.avgEngagement) - data.prevAvgEngagement;
          if (Math.abs(diff) < 0.01) return null;
          return {
            text: `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`,
            positive: diff > 0,
          };
        })()
      : null;

  const statValues: Record<
    string,
    {
      value: string;
      sub: string;
      label: string;
      tooltip: string;
      delta: { text: string; positive: boolean } | null;
    }
  > = {
    publishedToday: {
      value: String(data.publishedTodayCount),
      sub: t("today"),
      label: t("published_today"),
      tooltip: t("stat_tooltips.published_today"),
      delta: publishedTodayDelta,
    },
    scheduledToday: {
      value: String(data.scheduledTodayCount),
      sub: t("today"),
      label: t("scheduled_today"),
      tooltip: t("stat_tooltips.scheduled_today"),
      delta: null,
    },
    scheduled: {
      value: String(data.scheduledCount),
      sub: t("total_in_queue"),
      label: t("scheduled"),
      tooltip: t("stat_tooltips.scheduled"),
      delta: null,
    },
    engagement: {
      value: `${data.avgEngagement}%`,
      sub: t("last_30_days"),
      label: t("avg_engagement"),
      tooltip: t("stat_tooltips.engagement"),
      delta: engagementDelta,
    },
  };

  // Mirror SetupChecklist's milestone semantics exactly: hasScheduledPost means
  // "has ever created a post" (the source query has no status filter). The
  // empty-queue nudge is already handled by the Upcoming Queue card's EmptyState,
  // so the hero must not re-gate on scheduledCount or the two surfaces contradict.
  const nextBestAction = selectNextBestAction({
    hasXAccount: data.checklist.hasXAccount,
    hasScheduledPost: data.checklist.hasScheduledPost,
    hasUsedAI: data.checklist.hasUsedAI,
  });

  return (
    <DashboardPageWrapper
      icon={Home}
      title={t("title")}
      description={t("welcome", { name: session?.user?.name ?? "" })}
      actions={
        <Button asChild>
          <Link href="/dashboard/compose">
            <PlusCircle className="me-2 h-4 w-4" />
            {t("new_post")}
          </Link>
        </Button>
      }
    >
      <Suspense fallback={<Skeleton className="h-12 w-full rounded-xl" />}>
        <SetupChecklist {...data.checklist} />
      </Suspense>

      {data.failedCount > 0 && (
        <Alert className="border-destructive/50 bg-destructive/5">
          <AlertCircle className="text-destructive h-4 w-4 shrink-0" />
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm">{t("failed_posts", { count: data.failedCount })}</span>
            <Button size="sm" variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/dashboard/schedule?view=list">{t("view_retry")}</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <PostUsageBar />

      {/* Hero: What's next (next-best-action) + Quick Compose */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-7">
        <QuickActions action={nextBestAction} />
        <QuickCompose />
      </div>

      {/* Upcoming Queue — primary, full-width */}
      <div className="grid grid-cols-1">
        <Card>
          <CardHeader className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base sm:text-lg">{t("upcoming_queue")}</CardTitle>
            {data.upcomingPosts.length > 0 && (
              <Button variant="ghost" size="sm" asChild className="w-full text-xs sm:w-auto">
                <Link href="/dashboard/schedule?view=list">{t("view_all")}</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {data.upcomingPosts.length === 0 ? (
              data.checklist.hasXAccount ? (
                <EmptyState
                  icon={<Send className="h-5 w-5" />}
                  title={t("queue_empty")}
                  description={t("queue_empty_description")}
                  whyMessage={t("empty_why")}
                  primaryAction={
                    <Button size="sm" asChild>
                      <Link href="/dashboard/compose">
                        <PenSquare className="me-2 h-3.5 w-3.5" />
                        {t("create_post")}
                      </Link>
                    </Button>
                  }
                  secondaryAction={
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/dashboard/ai/agentic">
                        <Wand2 className="me-2 h-3.5 w-3.5" />
                        {t("generate_ai")}
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={<AlertCircle className="h-5 w-5" />}
                  iconBgClass="bg-warning-3 text-warning-11"
                  title={t("connect_x_account")}
                  description={t("connect_x_description")}
                  whyMessage={t("empty_why")}
                  primaryAction={
                    <Button size="sm" asChild>
                      <Link href="/dashboard/settings">
                        <PlusCircle className="me-2 h-3.5 w-3.5" />
                        {t("connect_x_account")}
                      </Link>
                    </Button>
                  }
                />
              )
            ) : (
              <div className="space-y-3">
                {data.upcomingPosts.map((post) => (
                  <Link
                    key={post.id}
                    href="/dashboard/schedule?view=list"
                    className="hover:bg-muted/50 block min-w-0 items-start gap-3 rounded-lg border p-3 transition-colors"
                  >
                    <div className="flex gap-3">
                      <div className="bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                        <Calendar className="text-primary h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-relaxed font-medium break-words">
                          {(post.tweets[0]?.content ?? "").substring(0, 80)}
                          {(post.tweets[0]?.content?.length ?? 0) > 80 ? "..." : ""}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs" suppressHydrationWarning>
                          {post.scheduledAt
                            ? new Date(post.scheduledAt).toLocaleString(userLocale, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : t("no_date")}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats — demoted to a compact secondary strip */}
      <TooltipProvider>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {STAT_CARDS.map((card) => {
            const stat = statValues[card.key]!;
            return (
              <Card
                key={card.key}
                className={`border-s-2 ${card.accent} transition-shadow hover:shadow-sm`}
              >
                <CardContent className="flex items-center gap-2.5 px-3 py-2.5">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${card.iconBg}`}
                  >
                    <card.icon className={`h-3.5 w-3.5 ${card.iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-muted-foreground cursor-help truncate text-[11px] font-medium">
                          {stat.label}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>{stat.tooltip}</TooltipContent>
                    </Tooltip>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-bold tracking-tight">{stat.value}</span>
                      {stat.delta && (
                        <span
                          className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
                            stat.delta.positive ? "text-success-11" : "text-danger-11"
                          }`}
                        >
                          {stat.delta.positive ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {stat.delta.text}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </TooltipProvider>
    </DashboardPageWrapper>
  );
}
