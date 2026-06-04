"use client";

import { EmptyState } from "@/components/admin/empty-state";
import {
  type FeatureConsumption,
  formatUsd,
} from "@/components/admin/operations/operations-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FeatureUsagePanelProps {
  features: FeatureConsumption[];
}

export function FeatureUsagePanel({ features }: FeatureUsagePanelProps) {
  const maxCost = Math.max(1, ...features.map((f) => f.costCents));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Cost by Feature</CardTitle>
      </CardHeader>
      <CardContent>
        {features.length === 0 ? (
          <EmptyState
            title="No feature usage"
            description="No AI generations have been recorded for the selected period."
            variant="analytics"
          />
        ) : (
          <div className="space-y-2">
            {features.map((f) => {
              const pct = (f.costCents / maxCost) * 100;
              return (
                <div
                  key={f.feature}
                  className="grid items-center gap-3"
                  style={{ gridTemplateColumns: "10rem 1fr 6rem" }}
                >
                  <span className="truncate text-sm font-medium" title={f.feature}>
                    {f.feature}
                  </span>
                  <div className="bg-muted relative h-5 overflow-hidden rounded-md">
                    <div
                      className="bg-primary/80 h-full rounded-md transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatUsd(f.costCents)}
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {f.calls.toLocaleString()} calls
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
