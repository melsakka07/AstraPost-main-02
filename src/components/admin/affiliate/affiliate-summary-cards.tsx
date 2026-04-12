"use client";

import { Users, TrendingUp, DollarSign, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminPolling } from "../use-admin-polling";

interface AffiliateSummary {
  totalAffiliates: number;
  activeAffiliates: number;
  totalEarnings: number;
  avgConversionRate: number;
}

function SummaryCard({
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

export function AffiliateSummaryCards() {
  const { data: summary, loading } = useAdminPolling<AffiliateSummary>({
    fetchFn: async (signal) => {
      const r = await fetch("/api/admin/affiliate/summary", { signal });
      if (!r.ok) throw new Error("Failed to fetch affiliate summary");
      const json = await r.json();
      return json.data as AffiliateSummary;
    },
    intervalMs: 60_000,
  });

  if (loading) return <LoadingSkeleton />;
  if (!summary) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        label="Total Affiliates"
        value={summary.totalAffiliates.toLocaleString()}
        sub="All time"
        icon={Users}
      />
      <SummaryCard
        label="Active Affiliates"
        value={summary.activeAffiliates.toLocaleString()}
        sub="Clicked this period"
        icon={Activity}
      />
      <SummaryCard
        label="Total Earnings"
        value={`$${(summary.totalEarnings / 100).toFixed(2)}`}
        sub="Affiliate payouts"
        icon={DollarSign}
      />
      <SummaryCard
        label="Avg Conversion Rate"
        value={summary.avgConversionRate}
        unit="%"
        sub="Across all affiliates"
        icon={TrendingUp}
      />
    </div>
  );
}
