
import { headers } from "next/headers";
import Link from "next/link";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import {
  Calendar,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  PenSquare,
  PlusCircle,
  Send,
  TrendingUp,
} from "lucide-react";
import { DashboardPageWrapper } from "@/components/dashboard/dashboard-page-wrapper";
import { QuickCompose } from "@/components/dashboard/quick-compose";
import { SetupChecklist } from "@/components/dashboard/setup-checklist";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiGenerations, posts, tweetAnalytics, tweets, user, xAccounts } from "@/lib/schema";

async function getDashboardData(userId: string) {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const [
    todayPosts,
    scheduledPosts,
    publishedPosts,
    analytics,
    upcomingPosts,
    // Checklist Data
    hasXAccount,
    hasScheduledPost,
    hasUsedAI,
    userInfo
  ] = await Promise.all([
    // Today's posts (published or scheduled for today)
    db.query.posts.findMany({
      where: and(
        eq(posts.userId, userId),
        gte(posts.scheduledAt, startOfDay),
        lte(posts.scheduledAt, endOfDay)
      )
    }),
    // Scheduled posts count
    db.select({ count: sql<number>`count(*)` }).from(posts).where(and(eq(posts.userId, userId), eq(posts.status, "scheduled"))),
    // Published posts count
    db.select({ count: sql<number>`count(*)` }).from(posts).where(and(eq(posts.userId, userId), eq(posts.status, "published"))),
    // Avg Engagement Rate
    db.select({ avg: sql<number>`avg(${tweetAnalytics.engagementRate})` })
      .from(tweetAnalytics)
      .innerJoin(tweets, eq(tweetAnalytics.tweetId, tweets.id))
      .innerJoin(posts, eq(tweets.postId, posts.id))
      .where(eq(posts.userId, userId)),

    // Upcoming scheduled posts
    db.query.posts.findMany({
      where: and(eq(posts.userId, userId), eq(posts.status, "scheduled")),
      orderBy: [asc(posts.scheduledAt)],
      limit: 5,
      with: {
        tweets: true
      }
    }),

    // Checklist Checks
    db.query.xAccounts.findFirst({
      where: eq(xAccounts.userId, userId),
      columns: { id: true }
    }),
    db.query.posts.findFirst({
      where: eq(posts.userId, userId),
      columns: { id: true }
    }),
    db.query.aiGenerations.findFirst({
      where: eq(aiGenerations.userId, userId),
      columns: { id: true }
    }),
    db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { plan: true }
    })
  ]);

  return {
    todayCount: todayPosts.length,
    scheduledCount: Number(scheduledPosts[0]?.count || 0),
    publishedCount: Number(publishedPosts[0]?.count || 0),
    avgEngagement: Number(analytics[0]?.avg || 0).toFixed(2),
    upcomingPosts,
    checklist: {
      hasXAccount: !!hasXAccount,
      hasScheduledPost: !!hasScheduledPost,
      hasUsedAI: !!hasUsedAI,
      hasProPlan: userInfo?.plan !== "free"
    }
  };
}

const STAT_CARDS = [
  {
    key: "today",
    label: "Today's Posts",
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
    key: "published",
    label: "Published",
    icon: CheckCircle2,
    accent: "border-l-emerald-500",
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-500/10",
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
  const data = session ? await getDashboardData(session.user.id) : {
    todayCount: 0, scheduledCount: 0, publishedCount: 0, avgEngagement: "0.00", upcomingPosts: [],
    checklist: { hasXAccount: false, hasScheduledPost: false, hasUsedAI: false, hasProPlan: false }
  };

  const statValues: Record<string, { value: string; sub: string }> = {
    today: { value: String(data.todayCount), sub: "Scheduled for today" },
    scheduled: { value: String(data.scheduledCount), sub: "Total in queue" },
    published: { value: String(data.publishedCount), sub: "All time" },
    engagement: { value: `${data.avgEngagement}%`, sub: "Average rate" },
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
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.iconBg}`}>
                  <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight">
                  {stat.value}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
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
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 py-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Send className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="mt-4 text-sm font-medium">
                  Your queue is empty
                </p>
                <p className="mt-1 max-w-[240px] text-center text-xs text-muted-foreground">
                  Schedule your first post and it will appear here.
                </p>
                <Button size="sm" asChild className="mt-4">
                  <Link href="/dashboard/compose">
                    <PenSquare className="mr-2 h-3.5 w-3.5" />
                    Create a Post
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {data.upcomingPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex min-w-0 items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium leading-relaxed">
                        {(post.tweets[0]?.content ?? "").substring(0, 80)}
                        {(post.tweets[0]?.content?.length ?? 0) > 80
                          ? "..."
                          : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground" suppressHydrationWarning>
                        {post.scheduledAt
                          ? new Date(post.scheduledAt).toLocaleString()
                          : "No date"}
                      </p>
                    </div>
                  </div>
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
