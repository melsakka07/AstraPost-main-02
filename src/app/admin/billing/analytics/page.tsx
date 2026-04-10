import { TrendingUp } from "lucide-react";
import { AdminPageWrapper } from "@/components/admin/admin-page-wrapper";

export const metadata = { title: "Billing Analytics — Admin" };

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

export default async function BillingAnalyticsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/admin/billing/analytics`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return (
      <AdminPageWrapper
        icon={TrendingUp}
        title="Billing Analytics"
        description="Plan conversions, churn, and recovery metrics"
      >
        <p className="text-muted-foreground">Failed to load analytics data.</p>
      </AdminPageWrapper>
    );
  }

  const data = await res.json();
  const { planDistribution, recentChanges, pagination, metrics, failedWebhooks } = data;

  return (
    <AdminPageWrapper
      icon={TrendingUp}
      title="Billing Analytics"
      description="Plan conversions, churn, and recovery metrics"
    >
      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      {/* Plan Distribution */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Plan Distribution</h3>
        <div className="grid gap-3">
          {(["free", "pro_monthly", "pro_annual", "agency"] as const).map((plan) => {
            const count = planDistribution[plan] ?? 0;
            const total = (Object.values(planDistribution) as number[]).reduce((a, b) => a + b, 0);
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={plan} className="flex items-center gap-3">
                <span className="text-muted-foreground w-28 text-sm">{PLAN_LABELS[plan]}</span>
                <div className="bg-muted h-6 flex-1 overflow-hidden rounded">
                  <div
                    className="bg-primary/80 h-full rounded transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-16 text-right text-sm font-medium">{count}</span>
                <span className="text-muted-foreground w-12 text-right text-sm">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Failed Webhooks */}
      {failedWebhooks && failedWebhooks.length > 0 && (
        <div>
          <h3 className="mb-4 text-lg font-semibold">Failed Webhooks</h3>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="p-3 text-left font-medium">Event Type</th>
                  <th className="p-3 text-left font-medium">Event ID</th>
                  <th className="p-3 text-left font-medium">Retries</th>
                  <th className="p-3 text-left font-medium">Error</th>
                  <th className="p-3 text-left font-medium">Last Attempt</th>
                </tr>
              </thead>
              <tbody>
                {failedWebhooks.map((wh: Record<string, unknown>) => (
                  <tr key={String(wh.id)} className="border-b last:border-0">
                    <td className="p-3 font-mono text-xs">{String(wh.eventType ?? "unknown")}</td>
                    <td className="max-w-[200px] truncate p-3 font-mono text-xs">
                      {String(wh.stripeEventId ?? "")}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                          Number(wh.retryCount) >= 3
                            ? "bg-destructive/10 text-destructive"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {String(wh.retryCount)}
                      </span>
                    </td>
                    <td className="text-muted-foreground max-w-[250px] truncate p-3 text-xs">
                      {String(wh.errorMessage ?? "N/A")}
                    </td>
                    <td className="text-muted-foreground p-3 text-xs">
                      {wh.processedAt
                        ? new Date(String(wh.processedAt)).toLocaleDateString()
                        : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Plan Changes */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Recent Plan Changes</h3>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="p-3 text-left font-medium">Date</th>
                <th className="p-3 text-left font-medium">User</th>
                <th className="p-3 text-left font-medium">From</th>
                <th className="p-3 text-left font-medium">To</th>
                <th className="p-3 text-left font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {recentChanges.map((change: Record<string, unknown>) => (
                <tr key={String(change.id)} className="border-b last:border-0">
                  <td className="text-muted-foreground p-3">
                    {change.createdAt
                      ? new Date(String(change.createdAt)).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{String(change.userName ?? "Unknown")}</div>
                    <div className="text-muted-foreground text-xs">
                      {String(change.userEmail ?? "")}
                    </div>
                  </td>
                  <td className="p-3">
                    {change.oldPlan ? (
                      <span className="bg-muted inline-flex items-center rounded px-2 py-0.5 text-xs font-medium">
                        {PLAN_LABELS[String(change.oldPlan)] ?? String(change.oldPlan)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">None</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="bg-primary/10 text-primary inline-flex items-center rounded px-2 py-0.5 text-xs font-medium">
                      {PLAN_LABELS[String(change.newPlan)] ?? String(change.newPlan)}
                    </span>
                  </td>
                  <td className="text-muted-foreground p-3 text-xs">
                    {REASON_LABELS[String(change.reason)] ?? String(change.reason)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.totalPages > 1 && (
          <p className="text-muted-foreground mt-2 text-sm">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
        )}
      </div>
    </AdminPageWrapper>
  );
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
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-sm">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="text-muted-foreground mt-1 text-xs">
        <span
          className={
            trend === "warning" ? "text-yellow-600" : trend === "healthy" ? "text-green-600" : ""
          }
        >
          {description}
        </span>
      </p>
    </div>
  );
}
