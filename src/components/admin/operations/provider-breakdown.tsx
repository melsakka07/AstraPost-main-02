"use client";

import { EmptyState } from "@/components/admin/empty-state";
import {
  type ProviderConsumption,
  formatUsd,
  providerLabel,
} from "@/components/admin/operations/operations-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProviderBreakdownProps {
  providers: ProviderConsumption[];
}

export function ProviderBreakdown({ providers }: ProviderBreakdownProps) {
  const total = providers.reduce((sum, p) => sum + p.costCents, 0);
  const maxCost = Math.max(1, ...providers.map((p) => p.costCents));
  const hasData = providers.some((p) => p.calls > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Cost by Provider</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyState
            title="No consumption in this range"
            description="No AI generations have been recorded for the selected period."
            variant="analytics"
          />
        ) : (
          <div className="space-y-3">
            {providers.map((p) => {
              const pct = (p.costCents / maxCost) * 100;
              const share = total > 0 ? ((p.costCents / total) * 100).toFixed(1) : "0";
              return (
                <div
                  key={p.provider}
                  className="grid items-center gap-3"
                  style={{ gridTemplateColumns: "8rem 1fr 9rem" }}
                >
                  <span className="truncate text-sm font-medium" title={providerLabel(p.provider)}>
                    {providerLabel(p.provider)}
                  </span>
                  <div className="bg-muted relative h-5 overflow-hidden rounded-md">
                    <div
                      className="bg-primary/80 h-full rounded-md transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatUsd(p.costCents)}
                      <span className="text-muted-foreground ms-1 text-xs">({share}%)</span>
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {p.calls.toLocaleString()} calls · {p.tokens.toLocaleString()} tokens
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
