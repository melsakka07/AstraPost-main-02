"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Activity, Bot, CheckCircle2, FileText, Users, XCircle, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsData {
  users: { total: number; newLast7d: number };
  posts: { totalPublished: number; publishedLast7d: number };
  ai: { totalGenerations: number; generationsThisMonth: number; activeUsersLast30d: number };
  jobs: { failedLast24h: number; successfulLast24h: number };
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  variant?: "default" | "success" | "destructive";
}) {
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

  return (
    <Card>
      <CardContent className="pt-5">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-foreground text-sm font-medium">{label}</p>
          {sub && <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-5">
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PlatformStats() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((json) => setStats(json.data ?? null))
      .finally(() => setLoading(false));
  }, [pathname]);

  if (loading) return <LoadingSkeleton />;
  if (!stats) return null;

  const jobHealthVariant =
    stats.jobs.failedLast24h === 0
      ? "success"
      : stats.jobs.failedLast24h > 5
        ? "destructive"
        : "default";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
          Users
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total users" value={stats.users.total.toLocaleString()} icon={Users} />
          <StatCard
            label="New (last 7 days)"
            value={stats.users.newLast7d}
            sub="Signed up this week"
            icon={Users}
            variant={stats.users.newLast7d > 0 ? "success" : "default"}
          />
          <StatCard
            label="AI active users"
            value={stats.ai.activeUsersLast30d}
            sub="Used AI in last 30 days"
            icon={Bot}
          />
          <StatCard
            label="AI generations / month"
            value={stats.ai.generationsThisMonth.toLocaleString()}
            sub={`${stats.ai.totalGenerations.toLocaleString()} all-time`}
            icon={Zap}
          />
        </div>
      </div>

      <div>
        <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
          Content
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Posts published"
            value={stats.posts.totalPublished.toLocaleString()}
            sub="All time"
            icon={FileText}
          />
          <StatCard
            label="Published (last 7 days)"
            value={stats.posts.publishedLast7d}
            sub="This week"
            icon={FileText}
            variant={stats.posts.publishedLast7d > 0 ? "success" : "default"}
          />
        </div>
      </div>

      <div>
        <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
          Queue Health
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Jobs completed (24h)"
            value={stats.jobs.successfulLast24h}
            icon={CheckCircle2}
            variant="success"
          />
          <StatCard
            label="Jobs failed (24h)"
            value={stats.jobs.failedLast24h}
            sub={stats.jobs.failedLast24h === 0 ? "All clear" : "Investigate in Jobs page"}
            icon={XCircle}
            variant={jobHealthVariant}
          />
          <StatCard
            label="Worker status"
            value="Check jobs page"
            sub="Real-time status in BullMQ board"
            icon={Activity}
          />
        </div>
      </div>
    </div>
  );
}
