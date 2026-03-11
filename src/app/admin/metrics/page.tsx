import { db } from "@/lib/db";
import { user, subscriptions, jobRuns } from "@/lib/schema";
import { sql, gte, eq, count } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricsCharts } from "./metrics-charts";

export const dynamic = "force-dynamic";

async function getMetrics() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Signups per day (last 30 days)
  const signupsData = await db
    .select({
      date: sql<string>`to_char(${user.createdAt}, 'YYYY-MM-DD')`,
      count: count(user.id),
    })
    .from(user)
    .where(gte(user.createdAt, thirtyDaysAgo))
    .groupBy(sql`to_char(${user.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${user.createdAt}, 'YYYY-MM-DD')`);

  // Active Subscriptions & MRR Estimate
  const activeSubs = await db
    .select({
      plan: subscriptions.plan,
    })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"));

  let mrr = 0;
  activeSubs.forEach((sub) => {
    // Pricing hardcoded for estimation as per plan descriptions
    if (sub.plan === "pro_monthly") mrr += 29;
    if (sub.plan === "pro_annual") mrr += 24.16; // $290/12
    if (sub.plan === "agency") mrr += 99;
  });

  // Total Users
  const [totalUsers] = await db
    .select({ count: count(user.id) })
    .from(user);

  // Jobs in last 24h
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const [jobs24h] = await db
    .select({ count: count(jobRuns.id) })
    .from(jobRuns)
    .where(gte(jobRuns.startedAt, oneDayAgo));

  return {
    signups: signupsData.map(d => ({ date: d.date, count: Number(d.count) })),
    mrr,
    totalUsers: totalUsers?.count || 0,
    activeSubscriptions: activeSubs.length,
    jobs24h: jobs24h?.count || 0
  };
}

export default async function MetricsPage() {
  const metrics = await getMetrics();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Metrics</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (MRR)</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.mrr.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Estimated from active subscriptions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeSubscriptions} active subscriptions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jobs (24h)</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.jobs24h}</div>
            <p className="text-xs text-muted-foreground">
              Processed in last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Signups Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <MetricsCharts data={metrics.signups} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
