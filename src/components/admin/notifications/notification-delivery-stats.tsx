"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Activity, TrendingUp, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface DeliveryStats {
  totalSentThisMonth: number;
  avgDeliveryRate: number;
  avgReadRate: number;
}

function StatCard({
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
    <div className="grid gap-4 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-5">
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function NotificationDeliveryStats() {
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/admin/notifications/stats")
      .then((r) => r.json())
      .then((json) => setStats(json.data ?? null))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [pathname]);

  if (loading) return <LoadingSkeleton />;
  if (!stats) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        label="Sent This Month"
        value={stats.totalSentThisMonth.toLocaleString()}
        sub="Total notifications"
        icon={Activity}
      />
      <StatCard
        label="Avg Delivery Rate"
        value={stats.avgDeliveryRate}
        unit="%"
        sub="Successfully delivered"
        icon={TrendingUp}
      />
      <StatCard
        label="Avg Read Rate"
        value={stats.avgReadRate}
        unit="%"
        sub="User engagement rate"
        icon={Eye}
      />
    </div>
  );
}
