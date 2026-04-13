import { headers } from "next/headers";
import Link from "next/link";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  PenSquare,
  PlusCircle,
  Send,
  TrendingUp,
  Wand2,
} from "lucide-react";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { PostUsageBar } from "@/components/dashboard/post-usage-bar";
import { QuickCompose } from "@/components/dashboard/quick-compose";
import { SetupChecklist } from "@/components/dashboard/setup-checklist";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiGenerations, posts, tweetAnalytics, tweets, user, xAccounts } from "@/lib/schema";

async function getDashboardData(userId: string) {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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
      columns: { plan: true },
    }),
    // Failed posts count
    db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(and(eq(posts.userId, userId), eq(posts.status, "failed"))),
  ]);

  return {
    publishedTodayCount: Number(publishedTodayPosts[0]?.count || 0),
    scheduledTodayCount: Number(scheduledTodayPosts[0]?.count || 0),
    scheduledCount: Number(scheduledPosts[0]?.count || 0),
    publishedCount: Number(publishedPosts[0]?.count || 0),
    avgEngagement: Number(analytics[0]?.avg || 0).toFixed(2),
    upcomingPosts,
    failedCount: Number(failedPosts[0]?.count || 0),
    checklist: {
      hasXAccount: !!hasXAccount,
      hasScheduledPost: !!hasScheduledPost,
      hasUsedAI: !!hasUsedAI,
      hasProPlan: userInfo?.plan !== "free",
    },
    userPlan: userInfo?.plan || "free",
  };
}

const STAT_CARDS = [
  {
    key: "publishedToday",
    label: "Published Today",
    icon: CheckCircle2,
    accent: "border-l-emerald-500",
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-500/10",
  },
  {
    key: "scheduledToday",
    label: "Scheduled Today",
    icon: Calendar,
    accent: "border-l-blue-500",
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10",
  },
  {
    key: "scheduled",
    label: "Scheduled",
    icon: Clock,
    accent: "border-l-amber-500",
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10",
  },
  {
    key: "engagement",
    label: "Avg. Engagement",
    icon: TrendingUp,
    accent: "border-l-purple-500",
    iconColor: "text-purple-500",
    iconBg: "bg-purple-500/10",
  },
] as const;

export default async function DashboardPage() {
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
        checklist: {
          hasXAccount: false,
          hasScheduledPost: false,
          hasUsedAI: false,
          hasProPlan: false,
        },
        userPlan: "free",
      };

  const statValues: Record<string, { value: string; sub: string }> = {
    publishedToday: { value: String(data.publishedTodayCount), sub: "Today" },
    scheduledToday: { value: String(data.scheduledTodayCount), sub: "Today" },
    scheduled: { value: String(data.scheduledCount), sub: "Total in queue" },
    engagement: { value: `${data.avgEngagement}%`, sub: "Last 30 days" },
  };

  return (
    <DashboardPageWrapper
      icon={LayoutDashboard}
      title="Dashboard"
      description={`Welcome back, ${session?.user?.name || "User"}! Here's your account overview.`}
      actions={
        <Button asChild>
          <Link href="/dashboard/compose">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Post
          </Link>
        </Button>
      }
    >
      <SetupChecklist {...data.checklist} />

      {data.failedCount > 0 && (
        <Alert className="border-destructive/50 bg-destructive/5">
          <AlertCircle className="text-destructive h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {data.failedCount} post{data.failedCount > 1 ? "s" : ""} failed to publish.
            </span>
            <Button size="sm" variant="outline" asChild>
              <Link href="/dashboard/queue">View & Retry</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <PostUsageBar />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((card) => {
          const stat = statValues[card.key]!;
          return (
            <Card
              key={card.key}
              className={`border-l-4 ${card.accent} transition-shadow hover:shadow-md`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {card.label}
                </CardTitle>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.iconBg}`}
                >
                  <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
                <p className="text-muted-foreground mt-1 text-xs">{stat.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Upcoming Queue + Quick Compose */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Queue</CardTitle>
            {data.upcomingPosts.length > 0 && (
              <Button variant="ghost" size="sm" asChild className="text-xs">
                <Link href="/dashboard/queue">View all</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {data.upcomingPosts.length === 0 ? (
              <div className="border-border/60 flex flex-col items-center justify-center rounded-lg border border-dashed py-10">
                <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
                  <Send className="text-muted-foreground h-5 w-5" />
                </div>
                <p className="mt-4 text-sm font-medium">Your queue is empty</p>
                <p className="text-muted-foreground mt-1 max-w-[240px] text-center text-xs">
                  Schedule your first post and it will appear here.
                </p>
                <Button size="sm" asChild className="mt-4">
                  <Link href="/dashboard/compose">
                    <PenSquare className="mr-2 h-3.5 w-3.5" />
                    Create a Post
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild className="mt-2">
                  <Link href="/dashboard/ai/agentic">
                    <Wand2 className="mr-2 h-3.5 w-3.5" />
                    Generate with AI
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {data.upcomingPosts.map((post) => (
                  <Link
                    key={post.id}
                    href="/dashboard/queue"
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
                            : "No date"}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <QuickCompose />
      </div>
    </DashboardPageWrapper>
  );
}
