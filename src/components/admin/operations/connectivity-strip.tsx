"use client";

import {
  type ServiceConnectivity,
  formatUsd,
} from "@/components/admin/operations/operations-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SERVICE_LABELS: Record<string, string> = {
  openrouter: "OpenRouter",
  replicate: "Replicate",
  openai: "OpenAI",
  deepgram: "Deepgram",
};

interface ConnectivityStripProps {
  services: ServiceConnectivity[];
}

export function ConnectivityStrip({ services }: ConnectivityStripProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Provider Connectivity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => (
            <div key={s.service} className="bg-muted/40 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {SERVICE_LABELS[s.service] ?? s.service}
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className={cn("h-2 w-2 rounded-full", s.up ? "bg-success-9" : "bg-danger-9")}
                  />
                  <span
                    className={cn(
                      "text-xs font-medium",
                      s.up ? "text-success-11" : "text-danger-11"
                    )}
                  >
                    {s.up ? "Up" : "Down"}
                  </span>
                </span>
              </div>
              <div className="mt-2">
                {s.balanceSource === "api" ? (
                  <p className="text-sm font-semibold tabular-nums">{formatUsd(s.balanceCents)}</p>
                ) : (
                  <p className="text-muted-foreground text-xs">Balance not exposed by provider</p>
                )}
                {s.error ? (
                  <p className="text-danger-11 mt-1 truncate text-xs" title={s.error}>
                    {s.error}
                  </p>
                ) : (
                  <p className="text-muted-foreground mt-1 text-xs">{s.latencyMs}ms</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
