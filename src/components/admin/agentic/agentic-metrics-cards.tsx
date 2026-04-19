"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle2, Zap, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AgenticMetrics {
  totalSessions: number;
  successRate: number;
  avgQualityScore: number;
  totalPostsGenerated: number;
}

function MetricCard({
  label,
  value,
  unit = "",
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
          <Icon className="text-primary h-4 w-4" />
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold tabular-nums">
            {value}
            {unit && <span className="text-sm font-normal">{unit}</span>}
          </p>
          <p className="text-foreground mt-0.5 text-sm font-medium">{label}</p>
          {sub && <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-5">
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface AgenticMetricsCardsProps {
  initialData?: AgenticMetrics | null;
}

export function AgenticMetricsCards({ initialData }: AgenticMetricsCardsProps = {}) {
  const [metrics, setMetrics] = useState<AgenticMetrics | null>(initialData ?? null);
  const [loading, setLoading] = useState(initialData === null);

  useEffect(() => {
    if (!initialData) {
      fetch("/api/admin/agentic/metrics")
        .then((r) => r.json())
        .then((json) => setMetrics(json.data ?? null))
        .catch(() => setMetrics(null))
        .finally(() => setLoading(false));
    }
  }, [initialData]);

  if (loading) return <LoadingSkeleton />;
  if (!metrics) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="Total Sessions"
        value={metrics.totalSessions.toLocaleString()}
        icon={Activity}
      />
      <MetricCard
        label="Success Rate"
        value={metrics.successRate}
        unit="%"
        sub="Sessions completed successfully"
        icon={CheckCircle2}
      />
      <MetricCard
        label="Avg Quality Score"
        value={metrics.avgQualityScore.toFixed(1)}
        unit="/100"
        sub="Average across all sessions"
        icon={TrendingUp}
      />
      <MetricCard
        label="Posts Generated"
        value={metrics.totalPostsGenerated.toLocaleString()}
        sub="Total across all sessions"
        icon={Zap}
      />
    </div>
  );
}
