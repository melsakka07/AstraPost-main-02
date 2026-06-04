"use client";

import { useState } from "react";
import { Activity, Coins, DollarSign, GitBranch } from "lucide-react";
import { ConnectivityStrip } from "@/components/admin/operations/connectivity-strip";
import { ConsumptionTrendChart } from "@/components/admin/operations/consumption-trend-chart";
import { FeatureUsagePanel } from "@/components/admin/operations/feature-usage-panel";
import { ModelUsageTable } from "@/components/admin/operations/model-usage-table";
import { ProviderBreakdown } from "@/components/admin/operations/provider-breakdown";
import { useAdminPolling } from "@/components/admin/use-admin-polling";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";

// ── Shared client-facing types (mirror the service shapes) ────────────────────

export type Provider = "openrouter" | "replicate" | "openai" | "unknown";
export type ConsumptionRange = 1 | 7 | 30;

export interface ProviderConsumption {
  provider: Provider;
  calls: number;
  tokens: number;
  costCents: number;
}

export interface ModelConsumption {
  model: string;
  provider: Provider;
  calls: number;
  tokens: number;
  costCents: number;
}

export interface FeatureConsumption {
  feature: string;
  calls: number;
  costCents: number;
}

export interface DailyConsumption {
  date: string;
  calls: number;
  tokens: number;
  costCents: number;
}

export interface ConsumptionWindow {
  rangeDays: ConsumptionRange;
  totalCalls: number;
  totalTokens: number;
  totalCostCents: number;
  fallbackRate: number;
  byProvider: ProviderConsumption[];
  byModel: ModelConsumption[];
  byFeature: FeatureConsumption[];
  daily: DailyConsumption[];
  imageQuota: { totalUsed: number; activeUsers: number };
}

export interface ServiceConnectivity {
  service: string;
  up: boolean;
  balanceCents: number | null;
  balanceSource: "api" | "none";
  latencyMs: number;
  error?: string;
}

export interface OperationsData {
  consumption: ConsumptionWindow;
  connectivity: ServiceConnectivity[];
}

// ── Formatting helpers (shared across panels) ─────────────────────────────────

export function formatUsd(cents: number | null): string {
  if (cents === null) return "—";
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function providerLabel(provider: Provider): string {
  switch (provider) {
    case "openrouter":
      return "OpenRouter";
    case "replicate":
      return "Replicate";
    case "openai":
      return "OpenAI";
    default:
      return "Unknown";
  }
}

const RANGES: ReadonlyArray<{ value: ConsumptionRange; label: string }> = [
  { value: 1, label: "Today" },
  { value: 7, label: "7 Days" },
  { value: 30, label: "30 Days" },
];

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
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}

interface OperationsDashboardProps {
  initialData?: OperationsData | null;
}

export function OperationsDashboard({ initialData }: OperationsDashboardProps = {}) {
  const [range, setRange] = useState<ConsumptionRange>(7);

  const fetchData = async (signal: AbortSignal): Promise<OperationsData> => {
    const res = await fetch(`/api/admin/operations?range=${range}`, { signal });
    if (!res.ok) throw new Error(`Failed to load operations data: ${res.status}`);
    const json = await res.json();
    return json.data;
  };

  const { data, loading, error, refresh } = useAdminPolling<OperationsData | null>({
    fetchFn: fetchData,
    intervalMs: 60_000,
    enabled: true,
    ...(initialData !== undefined && { initialData }),
  });

  const handleRange = (next: ConsumptionRange) => {
    setRange(next);
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
      </div>
    );
  }
  if (!data) return null;

  const { consumption, connectivity } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
          AI Consumption
        </h2>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.value}
              variant={range === r.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleRange(r.value)}
              className="h-7 text-xs"
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="API Calls"
          value={consumption.totalCalls.toLocaleString()}
          description="In selected range"
          icon={Activity}
        />
        <StatCard
          title="Tokens"
          value={consumption.totalTokens.toLocaleString()}
          description="Text generation"
          icon={Coins}
        />
        <StatCard
          title="Est. Cost"
          value={formatUsd(consumption.totalCostCents)}
          description="Recorded estimates"
          icon={DollarSign}
        />
        <StatCard
          title="Fallback Rate"
          value={`${(consumption.fallbackRate * 100).toFixed(1)}%`}
          description="Calls using a model fallback"
          icon={GitBranch}
        />
      </div>

      <ProviderBreakdown providers={consumption.byProvider} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ModelUsageTable models={consumption.byModel} />
        <FeatureUsagePanel features={consumption.byFeature} />
      </div>

      <ConsumptionTrendChart daily={consumption.daily} />

      <ConnectivityStrip services={connectivity} />
    </div>
  );
}
