"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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

export function AffiliateConversionFunnel() {
  const [data, setData] = useState<ConversionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/affiliate/funnel")
      .then((r) => r.json())
      .then((json) => setData(json.data ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (!data || data.stages.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.stages.map((stage, index) => {
            const isLastStage = index === data.stages.length - 1;
            const nextStage = !isLastStage ? data.stages[index + 1] : null;
            const dropOffPercentage = nextStage
              ? parseFloat((((stage.count - nextStage.count) / stage.count) * 100).toFixed(1))
              : 0;

            return (
              <div key={stage.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{stage.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {stage.count.toLocaleString()} ({stage.percentage}%)
                    </p>
                  </div>
                </div>
                <div className="bg-muted relative h-8 overflow-hidden rounded-lg">
                  <div
                    className="bg-primary/60 h-full rounded-lg transition-all duration-300"
                    style={{ width: `${stage.percentage}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-foreground text-xs font-semibold">
                      {stage.percentage}%
                    </span>
                  </div>
                </div>
                {!isLastStage && dropOffPercentage > 0 && (
                  <p className="text-destructive text-xs">
                    {dropOffPercentage.toFixed(1)}% drop-off to next stage
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
