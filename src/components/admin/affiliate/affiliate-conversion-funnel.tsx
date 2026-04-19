"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminPolling } from "../use-admin-polling";

interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
}

interface ConversionData {
  stages: FunnelStage[];
}

function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface AffiliateConversionFunnelProps {
  initialData?: ConversionData | null;
}

export function AffiliateConversionFunnel({ initialData }: AffiliateConversionFunnelProps = {}) {
  const { data, loading } = useAdminPolling<ConversionData>({
    fetchFn: async (signal) => {
      const r = await fetch("/api/admin/affiliate/funnel", { signal });
      if (!r.ok) throw new Error("Failed to fetch conversion funnel");
      const json = await r.json();
      return json.data as ConversionData;
    },
    intervalMs: 60_000,
    ...(initialData !== undefined && { initialData }),
  });

  if (loading) return <LoadingSkeleton />;
  if (!data || data.stages.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.stages.map((stage, index) => {
            const isLastStage = index === data.stages.length - 1;
            const nextStage = !isLastStage ? data.stages[index + 1] : null;
            const dropOffPercentage = nextStage
              ? parseFloat((((stage.count - nextStage.count) / stage.count) * 100).toFixed(1))
              : 0;

            return (
              <div key={stage.name} className="space-y-1.5">
                <div
                  className="grid items-center gap-3"
                  style={{ gridTemplateColumns: "9rem 1fr 3.5rem" }}
                >
                  <span className="truncate text-sm font-medium" title={stage.name}>
                    {stage.name}
                  </span>
                  <div className="bg-muted h-6 overflow-hidden rounded-md">
                    <div
                      className="bg-primary/70 h-full rounded-md transition-all duration-500"
                      style={{ width: `${stage.percentage}%` }}
                    />
                  </div>
                  <span className="text-right text-sm tabular-nums">
                    <span className="font-semibold">{stage.percentage}%</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 pl-0">
                  <span className="text-muted-foreground text-xs">
                    {stage.count.toLocaleString()} users
                  </span>
                  {!isLastStage && dropOffPercentage > 0 && (
                    <span className="text-destructive text-xs">
                      · {dropOffPercentage.toFixed(1)}% drop-off
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
