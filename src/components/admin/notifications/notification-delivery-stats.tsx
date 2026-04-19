"use client";

import { Activity, Eye, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { useAdminPolling } from "../use-admin-polling";

interface DeliveryStats {
  totalSentThisMonth: number;
  avgDeliveryRate: number;
  avgReadRate: number;
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <StatCard key={i} title="" value="" icon={Activity} className="animate-pulse opacity-50" />
      ))}
    </div>
  );
}

interface NotificationDeliveryStatsProps {
  initialData?: DeliveryStats | null;
}

export function NotificationDeliveryStats({ initialData }: NotificationDeliveryStatsProps = {}) {
  const { data: stats, loading } = useAdminPolling<DeliveryStats>({
    fetchFn: async (signal) => {
      const r = await fetch("/api/admin/notifications/stats", { signal });
      if (!r.ok) throw new Error("Failed to fetch notification stats");
      const json = await r.json();
      return json.data;
    },
    intervalMs: 60_000,
    ...(initialData !== undefined && { initialData }),
  });

  if (loading && !stats) return <LoadingSkeleton />;
  if (!stats) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        title="Sent This Month"
        value={stats.totalSentThisMonth.toLocaleString()}
        description="Total notifications"
        icon={Activity}
      />
      <StatCard
        title="Avg Delivery Rate"
        value={stats.avgDeliveryRate}
        unit="%"
        description="Successfully delivered"
        icon={TrendingUp}
        variant={
          stats.avgDeliveryRate >= 90
            ? "success"
            : stats.avgDeliveryRate >= 70
              ? "warning"
              : "destructive"
        }
      />
      <StatCard
        title="Avg Read Rate"
        value={stats.avgReadRate}
        unit="%"
        description="User engagement rate"
        icon={Eye}
        variant={stats.avgReadRate >= 50 ? "success" : "default"}
      />
    </div>
  );
}
