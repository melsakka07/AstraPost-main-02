"use client";

import { useState } from "react";
import { TrendingUp, RefreshCw } from "lucide-react";
import {
  MRRTrendChart,
  LTVEstimatesTable,
  CohortRetentionTable,
} from "@/components/admin/billing/revenue-charts";
import { EmptyState } from "@/components/admin/empty-state";
import { useAdminPolling } from "@/components/admin/use-admin-polling";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro_monthly: "Pro Monthly",
  pro_annual: "Pro Annual",
  agency: "Agency",
};

const REASON_LABELS: Record<string, string> = {
  checkout: "Checkout",
  webhook_plan_change: "Plan Change",
  subscription_deleted: "Subscription Deleted",
  incomplete_expired: "Trial Expired",
  grace_period_expired: "Grace Period Expired",
  payment_failed_grace_period: "Payment Failed",
  admin: "Admin Action",
  sync_failsafe_cancelled: "Sync Failsafe",
  sync_failsafe_plan_change: "Sync Failsafe",
};

interface BillingAnalyticsData {
  planDistribution: Record<string, number>;
  recentChanges: Array<{
    id: number;
    userId: string;
    oldPlan: string | null;
    newPlan: string;
    reason: string;
    createdAt: string;
    userName: string | null;
    userEmail: string | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metrics: {
    churnRate: number;
    churnedCount: number;
    totalPaid: number;
    graceRecoveryRate: number;
    graceFailedCount: number;
    graceRecoveryCount: number;
  };
  failedWebhooks: Array<{
    id: number;
    stripeEventId: string;
    eventType: string;
    retryCount: number;
    errorMessage: string | null;
    processedAt: string | null;
  }>;
  mrrTrends: Array<{
    month: string;
    mrr: number;
    proMonthly: number;
    proAnnual: number;
    agency: number;
  }>;
  ltvEstimates: Record<
    string,
    {
      plan: string;
      monthlyPrice: number;
      avgMonths: number;
      ltv: number;
    }
  >;
  cohortData: Array<{
    cohort: string;
    totalUsers: number;
    month0: number;
    month1: number;
    month2: number;
    month3: number;
    month6: number;
  }>;
}

function MetricCard({
  title,
  value,
  description,
  trend,
}: {
  title: string;
  value: string | number;
  description: string;
  trend?: "healthy" | "warning";
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
          <TrendingUp className="text-primary h-4 w-4" />
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-foreground text-sm font-medium">{title}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            <span
              className={
                trend === "warning"
                  ? "text-yellow-600"
                  : trend === "healthy"
                    ? "text-green-600"
                    : ""
              }
            >
              {description}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-5">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface BillingAnalyticsDashboardProps {
  initialData?: BillingAnalyticsData | null;
}

export function BillingAnalyticsDashboard({ initialData }: BillingAnalyticsDashboardProps = {}) {
  const [page, setPage] = useState(1);

  const fetchAnalytics = async (signal: AbortSignal): Promise<BillingAnalyticsData> => {
    const response = await fetch(`/api/admin/billing/analytics?page=${page}`, { signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch analytics: ${response.status}`);
    }
    const json = await response.json();
    return json;
  };

  const { data, loading, error, refresh } = useAdminPolling<BillingAnalyticsData>({
    fetchFn: fetchAnalytics,
    intervalMs: 60_000,
    enabled: true,
    ...(initialData !== undefined && { initialData }),
  });

  const goToPage = (newPage: number) => {
    setPage(newPage);
    refresh();
  };

  if (loading && !data) return <LoadingSkeleton />;
  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive text-sm font-medium">{error}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Please ensure you are logged in as an admin.
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={refresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }
  if (!data) return null;

  const {
    planDistribution,
    recentChanges,
    pagination,
    metrics,
    failedWebhooks,
    mrrTrends,
    ltvEstimates,
    cohortData,
  } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Paid Users"
          value={metrics.totalPaid}
          description="Currently on paid plans"
        />
        <MetricCard
          title="30-Day Churn Rate"
          value={`${metrics.churnRate}%`}
          description={`${metrics.churnedCount} cancellations`}
          trend={metrics.churnRate > 5 ? "warning" : "healthy"}
        />
        <MetricCard
          title="Grace Recovery Rate"
          value={`${metrics.graceRecoveryRate}%`}
          description={`${metrics.graceRecoveryCount} of ${metrics.graceFailedCount} recovered`}
          trend={metrics.graceRecoveryRate > 50 ? "healthy" : "warning"}
        />
        <MetricCard
          title="Failed Webhooks"
          value={failedWebhooks?.length ?? 0}
          description="Events with retry attempts"
          trend={failedWebhooks?.length > 0 ? "warning" : "healthy"}
        />
      </div>

      {mrrTrends && mrrTrends.length > 0 && <MRRTrendChart mrrTrends={mrrTrends} />}

      <div className="grid gap-6 md:grid-cols-2">
        {ltvEstimates && Object.keys(ltvEstimates).length > 0 && (
          <LTVEstimatesTable ltvEstimates={ltvEstimates} />
        )}
        {cohortData && cohortData.length > 0 && <CohortRetentionTable cohortData={cohortData} />}
      </div>

      <div>
        <h3 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
          Plan Distribution
        </h3>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {(["free", "pro_monthly", "pro_annual", "agency"] as const).map((plan) => {
                const count = planDistribution[plan] ?? 0;
                const total = (Object.values(planDistribution) as number[]).reduce(
                  (a, b) => a + b,
                  0
                );
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div
                    key={plan}
                    className="grid items-center gap-3"
                    style={{ gridTemplateColumns: "8rem 1fr 3rem 3rem" }}
                  >
                    <span
                      className="text-muted-foreground truncate text-sm"
                      title={PLAN_LABELS[plan]}
                    >
                      {PLAN_LABELS[plan]}
                    </span>
                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                      <div
                        className="bg-primary/80 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-right text-sm font-medium tabular-nums">{count}</span>
                    <span className="text-muted-foreground text-right text-sm tabular-nums">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {failedWebhooks && failedWebhooks.length > 0 && (
        <div>
          <h3 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
            Failed Webhooks
          </h3>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        Event Type
                      </TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        Event ID
                      </TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        Retries
                      </TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        Error
                      </TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        Last Attempt
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failedWebhooks.map((wh) => (
                      <TableRow key={wh.id}>
                        <TableCell className="font-mono text-xs">
                          {wh.eventType ?? "unknown"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate font-mono text-xs">
                          {wh.stripeEventId ?? ""}
                        </TableCell>
                        <TableCell>
                          <Badge variant={wh.retryCount >= 3 ? "destructive" : "secondary"}>
                            {wh.retryCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[250px] truncate text-xs">
                          {wh.errorMessage ?? "N/A"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {wh.processedAt ? new Date(wh.processedAt).toLocaleDateString() : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <h3 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
          Recent Plan Changes
        </h3>
        <Card>
          <CardContent className="pt-6">
            {recentChanges.length === 0 ? (
              <EmptyState
                title="No plan changes yet"
                description="When users upgrade, downgrade, or cancel their subscriptions, the changes will appear here."
                variant="billing"
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                          Date
                        </TableHead>
                        <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                          User
                        </TableHead>
                        <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                          From
                        </TableHead>
                        <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                          To
                        </TableHead>
                        <TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                          Reason
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentChanges.map((change) => (
                        <TableRow key={change.id}>
                          <TableCell className="text-muted-foreground">
                            {change.createdAt
                              ? new Date(change.createdAt).toLocaleDateString()
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{change.userName ?? "Unknown"}</div>
                            <div className="text-muted-foreground text-xs">
                              {change.userEmail ?? ""}
                            </div>
                          </TableCell>
                          <TableCell>
                            {change.oldPlan ? (
                              <Badge variant="outline">
                                {PLAN_LABELS[change.oldPlan] ?? change.oldPlan}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">None</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge>{PLAN_LABELS[change.newPlan] ?? change.newPlan}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {REASON_LABELS[change.reason] ?? change.reason}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t pt-4">
                    <p className="text-muted-foreground text-sm">
                      Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page <= 1}
                        onClick={() => goToPage(pagination.page - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => goToPage(pagination.page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
