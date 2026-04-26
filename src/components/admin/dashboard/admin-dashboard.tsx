"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  DollarSign,
  FileText,
  TrendingUp,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { useAdminPolling } from "@/components/admin/use-admin-polling";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsData {
  users: { total: number; newLast7d: number };
  posts: { totalPublished: number; publishedLast7d: number };
  ai: {
    totalGenerations: number;
    generationsThisMonth: number;
    activeUsersLast30d: number;
  };
  jobs: { failedLast24h: number; successfulLast24h: number };
}

interface BillingData {
  mrr: { cents: number; configured: boolean };
  subscriptions: {
    active: number;
    trialing: number;
    cancelledThisMonth: number;
    cancelledLastMonth: number;
  };
  users: { total: number; newThisMonth: number };
  trialToPaidRate: number;
}

interface DashboardData {
  stats: StatsData | null;
  billing: BillingData | null;
}

interface KpiCard {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  href?: string;
  variant?: "default" | "success" | "destructive";
}

function KpiCard({ label, value, sub, icon: Icon, href, variant = "default" }: KpiCard) {
  const iconColor =
    variant === "success"
      ? "text-green-500"
      : variant === "destructive"
        ? "text-destructive"
        : "text-primary";
  const iconBg =
    variant === "success"
      ? "bg-green-500/10"
      : variant === "destructive"
        ? "bg-destructive/10"
        : "bg-primary/10";

  const content = (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          {href && <ArrowRight className="text-muted-foreground h-4 w-4 rtl:scale-x-[-1]" />}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-foreground text-sm font-medium">{label}</p>
          {sub && <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-5">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function getJobVariant(failedJobs: number): "default" | "success" | "destructive" {
  if (failedJobs === 0) return "success";
  const MAX_FAILED_JOBS_THRESHOLD = 5;
  if (failedJobs > MAX_FAILED_JOBS_THRESHOLD) return "destructive";
  return "default";
}

function getNewUsersVariant(newUsers: number): "default" | "success" {
  return newUsers > 0 ? "success" : "default";
}

interface AdminDashboardProps {
  initialData?: DashboardData | null;
}

export function AdminDashboard({ initialData }: AdminDashboardProps = {}) {
  const fetchDashboardData = async (signal: AbortSignal): Promise<DashboardData> => {
    const [statsRes, billingRes] = await Promise.all([
      fetch("/api/admin/stats", { signal }).then((r) => r.json()),
      fetch("/api/admin/billing/overview", { signal }).then((r) => r.json()),
    ]);

    return {
      stats: statsRes.data ?? null,
      billing: billingRes.data ?? null,
    };
  };

  const { data, loading } = useAdminPolling<DashboardData>({
    fetchFn: fetchDashboardData,
    intervalMs: 60_000,
    enabled: true,
    ...(initialData !== undefined && { initialData }),
  });

  if (loading && !data) return <LoadingSkeleton />;

  const stats = data?.stats ?? null;
  const billing = data?.billing ?? null;

  const mrrDollars = billing ? (billing.mrr.cents / 100).toFixed(2) : "--";

  const failedJobs = stats?.jobs.failedLast24h ?? 0;
  const jobVariant = getJobVariant(failedJobs);

  const newUsersVariant = getNewUsersVariant(stats?.users.newLast7d ?? 0);

  const kpis: KpiCard[] = [
    {
      label: "Monthly Recurring Revenue",
      value: billing?.mrr.configured ? `$${mrrDollars}` : "Not configured",
      sub: `${billing?.subscriptions.active ?? "--"} active subscriptions`,
      icon: DollarSign,
      href: "/admin/billing",
    },
    {
      label: "Total Users",
      value: (stats?.users.total ?? billing?.users.total ?? 0).toLocaleString(),
      sub: `${stats?.users.newLast7d ?? 0} new this week`,
      icon: Users,
      href: "/admin/subscribers",
      variant: newUsersVariant,
    },
    {
      label: "AI Generations (month)",
      value: (stats?.ai.generationsThisMonth ?? 0).toLocaleString(),
      sub: `${(stats?.ai.totalGenerations ?? 0).toLocaleString()} all-time`,
      icon: Zap,
      href: "/admin/ai-usage",
    },
    {
      label: "Posts Published (week)",
      value: stats?.posts.publishedLast7d ?? 0,
      sub: `${stats?.posts.totalPublished.toLocaleString()} all-time`,
      icon: FileText,
      href: "/admin/content",
      variant: (stats?.posts.publishedLast7d ?? 0) > 0 ? "success" : "default",
    },
    {
      label: "Active Trials",
      value: billing?.subscriptions.trialing ?? 0,
      sub: `${billing?.trialToPaidRate ?? 0}% trial-to-paid conversion`,
      icon: TrendingUp,
      href: "/admin/billing/analytics",
    },
    {
      label: "AI Active Users (30d)",
      value: stats?.ai.activeUsersLast30d ?? 0,
      sub: "Used AI features recently",
      icon: Bot,
      href: "/admin/ai-usage",
    },
    {
      label: "Jobs Completed (24h)",
      value: stats?.jobs.successfulLast24h ?? 0,
      icon: CheckCircle2,
      href: "/admin/jobs",
      variant: "success",
    },
    {
      label: "Jobs Failed (24h)",
      value: stats?.jobs.failedLast24h ?? 0,
      sub: (stats?.jobs.failedLast24h ?? 0) === 0 ? "All clear" : "Check Jobs page",
      icon: XCircle,
      href: "/admin/jobs",
      variant: jobVariant,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {billing && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-5">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Cancelled This Month
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums">
                {billing.subscriptions.cancelledThisMonth}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {billing.subscriptions.cancelledLastMonth > 0
                  ? `${billing.subscriptions.cancelledLastMonth} last month`
                  : "None last month"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                New Users This Month
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums">{billing.users.newThisMonth}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {billing.users.total.toLocaleString()} total users
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                System Health
              </p>
              <Link
                href="/admin/health"
                className="text-primary hover:text-primary/80 mt-2 inline-flex items-center gap-1 text-sm font-medium"
              >
                View details <ArrowRight className="h-3 w-3 rtl:scale-x-[-1]" />
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
