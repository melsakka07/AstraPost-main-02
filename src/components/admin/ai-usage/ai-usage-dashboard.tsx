"use client";

import { useState } from "react";
import { subDays } from "date-fns";
import { Bot, BarChart3, Users, Zap, Calendar } from "lucide-react";
import { DateRangePicker, type DateRange } from "@/components/admin/date-range-picker";
import { EmptyState } from "@/components/admin/empty-state";
import { useAdminPolling } from "@/components/admin/use-admin-polling";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AiUsageData {
  summary: {
    totalGenerations: number;
    thisMonth: number;
    activeUsersThisMonth: number;
    tokensThisMonth: number;
  };
  topConsumers: {
    data: Array<{
      userId: string;
      userName: string | null;
      userEmail: string | null;
      generationCount: number;
      totalTokens: number;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  dailyTrend: Array<{ date: string; count: number }>;
  typeBreakdown: Array<{ type: string | null; count: number }>;
  dateRange?: {
    from: string;
    to: string;
  };
}

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
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface AiUsageDashboardProps {
  initialData?: AiUsageData | null;
}

export function AiUsageDashboard({ initialData }: AiUsageDashboardProps = {}) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const fetchUsage = async (signal: AbortSignal): Promise<AiUsageData> => {
    const params = new URLSearchParams();
    if (dateRange?.from) {
      params.set("from", dateRange.from.toISOString());
    }
    if (dateRange?.to) {
      params.set("to", dateRange.to.toISOString());
    }

    const response = await fetch(`/api/admin/ai-usage?${params.toString()}`, { signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch AI usage: ${response.status}`);
    }
    const json = await response.json();
    return json.data ?? null;
  };

  const { data, loading, error, refresh } = useAdminPolling<AiUsageData | null>({
    fetchFn: fetchUsage,
    intervalMs: 60_000,
    enabled: true,
    ...(initialData !== undefined && { initialData }),
  });

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
          Overview
        </h2>
        <div className="flex items-center gap-2">
          <Calendar className="text-muted-foreground h-4 w-4" />
          <DateRangePicker
            value={dateRange ?? { from: subDays(new Date(), 30), to: new Date() }}
            onChange={handleDateRangeChange}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Generations"
          value={data.summary.totalGenerations.toLocaleString()}
          description="All time"
          icon={Bot}
        />
        <StatCard
          title="In Range"
          value={data.summary.thisMonth.toLocaleString()}
          description={
            data.dateRange
              ? `${new Date(data.dateRange.from).toLocaleDateString()} - ${new Date(data.dateRange.to).toLocaleDateString()}`
              : "Selected period"
          }
          icon={BarChart3}
        />
        <StatCard
          title="Active Users"
          value={data.summary.activeUsersThisMonth.toLocaleString()}
          description="Used AI in range"
          icon={Users}
        />
        <StatCard
          title="Tokens Used"
          value={data.summary.tokensThisMonth.toLocaleString()}
          description="In selected range"
          icon={Zap}
        />
      </div>

      <div>
        <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
          Top AI Consumers
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Users by Generations
              {data.topConsumers.pagination.total > 0 && (
                <span className="text-muted-foreground ml-2 text-sm font-normal">
                  {data.topConsumers.pagination.total.toLocaleString()} total users
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topConsumers.data.length === 0 ? (
              <EmptyState
                title="No AI usage in this period"
                description="No users have generated AI content in the selected date range."
                variant="ai"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Generations</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topConsumers.data.map((consumer) => (
                    <TableRow key={consumer.userId}>
                      <TableCell className="font-medium">
                        {consumer.userName ?? "Unknown"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {consumer.userEmail ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {consumer.generationCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {consumer.totalTokens.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
          Usage by Type
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generation Types (All Time)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.typeBreakdown.length === 0 ? (
              <EmptyState
                title="No usage data available"
                description="No AI generation types have been recorded yet."
                variant="analytics"
              />
            ) : (
              (() => {
                const maxCount = Math.max(...data.typeBreakdown.map((b) => b.count));
                const total = data.typeBreakdown.reduce((s, b) => s + b.count, 0);
                return (
                  <div className="space-y-2">
                    {data.typeBreakdown.map((item) => {
                      const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                      const share = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0";
                      return (
                        <div
                          key={item.type ?? "null"}
                          className="grid items-center gap-3"
                          style={{ gridTemplateColumns: "10rem 1fr 5rem" }}
                        >
                          {/* Fixed-width label — all bars start at the same x position */}
                          <span
                            className="truncate text-sm font-medium"
                            title={item.type ?? "Unknown"}
                          >
                            {item.type ?? "Unknown"}
                          </span>

                          {/* Bar track */}
                          <div className="bg-muted relative h-5 overflow-hidden rounded-md">
                            <div
                              className="bg-primary/80 h-full rounded-md transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          {/* Count + share — right-aligned, fixed width */}
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-semibold tabular-nums">
                              {item.count.toLocaleString()}
                            </span>
                            <span className="text-muted-foreground text-xs tabular-nums">
                              {share}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
