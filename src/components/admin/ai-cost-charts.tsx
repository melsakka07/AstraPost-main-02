import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  DailyCost,
  TopSpender,
  FeatureCost,
  ModelMix,
  RouteLatency,
  ModelLatency,
  FallbackRateResult,
  FeedbackByVersion,
} from "@/lib/services/admin-ai-metrics";
import { cn } from "@/lib/utils";

// ── Mini Bar Chart: 7-day Cost Trend ──────────────────────────────────────────

interface MiniBarChartProps {
  data: DailyCost[];
  className?: string;
}

export function MiniBarChart({ data, className }: MiniBarChartProps) {
  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">7-Day Cost Trend</CardTitle>
          <CardDescription>No data available for this period</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const maxCost = Math.max(...data.map((d) => d.cost), 1);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">7-Day Cost Trend</CardTitle>
        <CardDescription>Daily AI generation spend (cents)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-32 items-end gap-1">
          {data.map((d) => {
            const heightPct = Math.max((d.cost / maxCost) * 100, 2);
            return (
              <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="text-muted-foreground text-xs tabular-nums">
                  {d.cost > 0 ? `${d.cost}` : "0"}
                </span>
                <div
                  className="bg-brand-9 hover:bg-brand-10 w-full rounded-t transition-colors"
                  style={{ height: `${heightPct}%` }}
                  title={`${d.date}: ${d.cost} cents (${d.count} generations)`}
                />
                <span className="text-muted-foreground w-full truncate text-center text-[10px]">
                  {d.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Top Spenders Table ────────────────────────────────────────────────────────

interface TopSpendersTableProps {
  data: TopSpender[];
  className?: string;
}

export function TopSpendersTable({ data, className }: TopSpendersTableProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Top Spenders (30 days)</CardTitle>
        <CardDescription>Users ranked by total AI generation cost</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="text-muted-foreground p-6 text-center text-sm">No data available</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Generations</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.count.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-success-11 text-right font-medium tabular-nums">
                    ${(row.cost / 100).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ── Feature Breakdown Table ───────────────────────────────────────────────────

interface FeatureBreakdownTableProps {
  data: FeatureCost[];
  className?: string;
}

export function FeatureBreakdownTable({ data, className }: FeatureBreakdownTableProps) {
  const totalCost = data.reduce((sum, d) => sum + d.cost, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Spend by Feature (30 days)</CardTitle>
        <CardDescription>Cost breakdown per AI sub-feature</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="text-muted-foreground p-6 text-center text-sm">No data available</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Avg Cost</TableHead>
                <TableHead className="w-24">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => {
                const share = totalCost > 0 ? (row.cost / totalCost) * 100 : 0;
                return (
                  <TableRow key={row.subFeature}>
                    <TableCell className="font-medium">
                      <Badge variant="secondary">{row.subFeature}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      ${(row.cost / 100).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      ${(row.avgCost / 100).toFixed(4)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                          <div
                            className="bg-brand-9 h-full rounded-full"
                            style={{ width: `${Math.min(share, 100)}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground w-9 text-right text-xs tabular-nums">
                          {Math.round(share)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ── Model Mix Table ───────────────────────────────────────────────────────────

interface ModelMixTableProps {
  data: ModelMix[];
  className?: string;
}

export function ModelMixTable({ data, className }: ModelMixTableProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Model Mix (30 days)</CardTitle>
        <CardDescription>Generation distribution by AI model</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="text-muted-foreground p-6 text-center text-sm">No data available</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Share</TableHead>
                <TableHead className="w-32">Usage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.model}>
                  <TableCell className="font-mono text-xs font-medium">{row.model}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.count.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.percentage}%</TableCell>
                  <TableCell>
                    <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                      <div
                        className="bg-brand-9 h-full rounded-full"
                        style={{ width: `${row.percentage}%` }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ── Latency Table (Route) ─────────────────────────────────────────────────────

interface RouteLatencyTableProps {
  data: RouteLatency[];
  className?: string;
}

export function RouteLatencyTable({ data, className }: RouteLatencyTableProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Latency by Route (7 days)</CardTitle>
        <CardDescription>p50 / p95 / p99 latency per sub-feature</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="text-muted-foreground p-6 text-center text-sm">
            No latency data available
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">p50</TableHead>
                <TableHead className="text-right">p95</TableHead>
                <TableHead className="text-right">p99</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.subFeature}>
                  <TableCell className="font-medium">
                    <Badge variant="secondary">{row.subFeature}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.count.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.p50}ms</TableCell>
                  <TableCell className="text-right tabular-nums">{row.p95}ms</TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium tabular-nums",
                      row.p99 > 5000 ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {row.p99}ms
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ── Latency Table (Model) ─────────────────────────────────────────────────────

interface ModelLatencyTableProps {
  data: ModelLatency[];
  className?: string;
}

export function ModelLatencyTable({ data, className }: ModelLatencyTableProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Latency by Model (7 days)</CardTitle>
        <CardDescription>p50 / p95 latency per AI model</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="text-muted-foreground p-6 text-center text-sm">
            No latency data available
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">p50</TableHead>
                <TableHead className="text-right">p95</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.model}>
                  <TableCell className="font-mono text-xs font-medium">{row.model}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.count.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.p50}ms</TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium tabular-nums",
                      row.p95 > 5000 ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {row.p95}ms
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ── Fallback Summary Card ─────────────────────────────────────────────────────

interface FallbackSummaryProps {
  data: FallbackRateResult;
  className?: string;
}

export function FallbackSummary({ data, className }: FallbackSummaryProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Fallback Rate (7 days)</CardTitle>
        <CardDescription>Percentage of generations that used a fallback model</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-4">
          <div>
            <p className="text-3xl font-bold tabular-nums">{data.percentage}%</p>
            <p className="text-muted-foreground text-sm">of total</p>
          </div>
          <div className="text-muted-foreground">
            <p className="text-sm">
              <span className="font-medium tabular-nums">
                {data.fallbackCount.toLocaleString()}
              </span>{" "}
              fallback
            </p>
            <p className="text-sm">
              <span className="font-medium tabular-nums">{data.count.toLocaleString()}</span> total
            </p>
          </div>
        </div>
        <div className="bg-muted mt-3 h-2 w-full overflow-hidden rounded-full">
          <div
            className={cn(
              "h-full rounded-full",
              data.percentage > 10 ? "bg-destructive" : "bg-success-9"
            )}
            style={{ width: `${Math.min(data.percentage, 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Feedback Breakdown Table ──────────────────────────────────────────────────

interface FeedbackBreakdownProps {
  data: FeedbackByVersion[];
  className?: string;
}

export function FeedbackBreakdown({ data, className }: FeedbackBreakdownProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Feedback by Prompt Version (7 days)</CardTitle>
        <CardDescription>Positive vs negative feedback per prompt version</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="text-muted-foreground p-6 text-center text-sm">
            No feedback data available
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead className="text-right">Positive</TableHead>
                <TableHead className="text-right">Negative</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-32">Sentiment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => {
                const total = row.positive + row.negative;
                const positivePct = total > 0 ? Math.round((row.positive / total) * 100) : 0;
                return (
                  <TableRow key={row.promptVersion}>
                    <TableCell className="font-mono text-xs font-medium">
                      {row.promptVersion}
                    </TableCell>
                    <TableCell className="text-success-11 text-right tabular-nums">
                      {row.positive.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-destructive text-right tabular-nums">
                      {row.negative.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {total.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                          <div
                            className="bg-success-9 h-full rounded-full"
                            style={{ width: `${positivePct}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground w-9 text-right text-xs tabular-nums">
                          {positivePct}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
