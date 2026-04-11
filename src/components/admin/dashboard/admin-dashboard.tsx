"use client";

import { useEffect, useState } from "react";
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
          {href && <ArrowRight className="text-muted-foreground h-4 w-4" />}
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

export function AdminDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    Promise.all([
      fetch("/api/admin/stats", { signal: controller.signal }).then((r) => r.json()),
      fetch("/api/admin/billing/overview", { signal: controller.signal }).then((r) => r.json()),
    ])
      .then(([statsJson, billingJson]) => {
        setStats(statsJson.data ?? null);
        setBilling(billingJson.data ?? null);
      })
      .catch(() => {
        // Silently fail - individual stat cards show empty state
      })
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  if (loading) return <LoadingSkeleton />;

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {billing && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-5">
              <p className="text-muted-foreground text-xs font-medium">Cancelled This Month</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {billing.subscriptions.cancelledThisMonth}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {billing.subscriptions.cancelledLastMonth} last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-muted-foreground text-xs font-medium">New Users (month)</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{billing.users.newThisMonth}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-muted-foreground text-xs font-medium">System Health</p>
              <Link
                href="/admin/health"
                className="text-primary hover:text-primary/80 mt-1 inline-flex items-center gap-1 text-sm font-medium"
              >
                View details <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
