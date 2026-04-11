"use client";

import { useEffect, useState } from "react";
import { Bot, BarChart3, Users, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
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
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-foreground text-sm font-medium">{label}</p>
          {sub && <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
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

export function AiUsageDashboard() {
  const [data, setData] = useState<AiUsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/ai-usage")
      .then((r) => r.json())
      .then((json) => setData(json.data ?? null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards */}
      <div>
        <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
          Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Generations"
            value={data.summary.totalGenerations.toLocaleString()}
            sub="All time"
            icon={Bot}
          />
          <StatCard
            label="This Month"
            value={data.summary.thisMonth.toLocaleString()}
            sub="Generations this month"
            icon={BarChart3}
          />
          <StatCard
            label="Active Users"
            value={data.summary.activeUsersThisMonth.toLocaleString()}
            sub="Used AI this month"
            icon={Users}
          />
          <StatCard
            label="Tokens Used"
            value={data.summary.tokensThisMonth.toLocaleString()}
            sub="This month"
            icon={Zap}
          />
        </div>
      </div>

      {/* Top Consumers Table */}
      <div>
        <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
          Top AI Consumers
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Users by Generations (This Month)
              {data.topConsumers.pagination.total > 0 && (
                <span className="text-muted-foreground ml-2 text-sm font-normal">
                  {data.topConsumers.pagination.total.toLocaleString()} total users
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topConsumers.data.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No AI usage this month
              </p>
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

      {/* Usage by Type */}
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
              <p className="text-muted-foreground py-8 text-center text-sm">
                No usage data available
              </p>
            ) : (
              <div className="space-y-3">
                {data.typeBreakdown.map((item) => (
                  <div key={item.type ?? "null"} className="flex items-center gap-3">
                    <Badge variant="outline" className="min-w-24 justify-center">
                      {item.type ?? "Unknown"}
                    </Badge>
                    <div className="bg-muted h-6 flex-1 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{
                          width: `${(item.count / Math.max(...data.typeBreakdown.map((b) => b.count))) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="min-w-20 text-right text-sm font-medium tabular-nums">
                      {item.count.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
