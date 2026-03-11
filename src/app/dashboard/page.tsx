
import { headers } from "next/headers";
import Link from "next/link";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { PlusCircle, Calendar, CheckCircle2, BarChart } from "lucide-react";
import { QuickCompose } from "@/components/dashboard/quick-compose";
import { SetupChecklist } from "@/components/dashboard/setup-checklist";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { posts, tweetAnalytics, tweets, user, xAccounts, aiGenerations } from "@/lib/schema";

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
      orderBy: [desc(posts.scheduledAt)],
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

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const data = session ? await getDashboardData(session.user.id) : {
    todayCount: 0, scheduledCount: 0, publishedCount: 0, avgEngagement: "0.00", upcomingPosts: [],
    checklist: { hasXAccount: false, hasScheduledPost: false, hasUsedAI: false, hasProPlan: false }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session?.user?.name || "User"}!
          </p>
        </div>
        <div className="flex gap-2">
           <Button asChild>
            <Link href="/dashboard/compose">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Post
            </Link>
          </Button>
        </div>
      </div>

      <SetupChecklist {...data.checklist} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Posts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.todayCount}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled for today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.scheduledCount}</div>
            <p className="text-xs text-muted-foreground">
              Total in queue
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.publishedCount}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Engagement</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgEngagement}%</div>
            <p className="text-xs text-muted-foreground">
              Average rate
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Upcoming Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingPosts.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No upcoming posts scheduled.
              </div>
            ) : (
              <div className="space-y-4">
                {data.upcomingPosts.map((post) => (
                  <div key={post.id} className="flex min-w-0 flex-col gap-4 rounded-md border p-3 sm:flex-row sm:items-start">
                    <div className="bg-muted p-2 rounded">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium">
                        {post.tweets[0]?.content.substring(0, 50)}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : "No date"}
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
    </div>
  );
}
