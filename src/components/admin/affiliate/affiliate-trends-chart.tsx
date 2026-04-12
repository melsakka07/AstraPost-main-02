"use client";

import { useState } from "react";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminPolling } from "../use-admin-polling";

interface TrendDataPoint {
  date: string;
  clicks: number;
  conversions: number;
}

type DateRange = "7d" | "30d" | "90d";

function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-80 w-full" />
      </CardContent>
    </Card>
  );
}

export function AffiliateTrendsChart() {
  const [period, setPeriod] = useState<DateRange>("30d");

  const { data, loading } = useAdminPolling<TrendDataPoint[]>({
    fetchFn: async (signal) => {
      const r = await fetch(`/api/admin/affiliate/trends?period=${period}`, { signal });
      if (!r.ok) throw new Error("Failed to fetch trends data");
      const json = await r.json();
      return json.data?.data ?? [];
    },
    intervalMs: 60_000,
  });

  if (loading) return <LoadingSkeleton />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Trends</CardTitle>
        <div className="flex gap-2">
          {(["7d", "30d", "90d"] as const).map((range) => (
            <Button
              key={range}
              variant={period === range ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(range)}
              className="h-7 text-xs"
            >
              {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : "90 Days"}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <div className="text-muted-foreground flex h-80 items-center justify-center">
            No data available for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" stroke="var(--muted-foreground)" style={{ fontSize: "12px" }} />
              <YAxis stroke="var(--muted-foreground)" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "var(--foreground)" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
                name="Clicks"
              />
              <Line
                type="monotone"
                dataKey="conversions"
                stroke="var(--secondary)"
                strokeWidth={2}
                dot={false}
                name="Conversions"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
