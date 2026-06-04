"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type DailyConsumption } from "@/components/admin/operations/operations-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ConsumptionTrendChartProps {
  daily: DailyConsumption[];
}

export function ConsumptionTrendChart({ daily }: ConsumptionTrendChartProps) {
  const series = daily.map((d) => ({
    date: d.date,
    cost: Number((d.costCents / 100).toFixed(2)),
    calls: d.calls,
  }));

  const summary = `Daily AI spend and call volume over ${daily.length} day(s).`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Consumption Trend</CardTitle>
      </CardHeader>
      <CardContent>
        {series.length === 0 ? (
          <div className="text-muted-foreground flex h-72 items-center justify-center">
            No data available for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={series} aria-label={summary} role="img">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" stroke="var(--muted-foreground)" style={{ fontSize: "12px" }} />
              <YAxis
                yAxisId="cost"
                stroke="var(--muted-foreground)"
                style={{ fontSize: "12px" }}
                tickFormatter={(v) => `$${v}`}
              />
              <YAxis
                yAxisId="calls"
                orientation="right"
                stroke="var(--muted-foreground)"
                style={{ fontSize: "12px" }}
              />
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
                yAxisId="cost"
                type="monotone"
                dataKey="cost"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
                name="Cost ($)"
              />
              <Line
                yAxisId="calls"
                type="monotone"
                dataKey="calls"
                stroke="var(--secondary)"
                strokeWidth={2}
                dot={false}
                name="Calls"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
