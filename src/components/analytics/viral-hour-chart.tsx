"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface HourDataPoint {
  hour: string; // e.g. "9:00", "14:00"
  avgEngagement: number;
  count: number;
}

interface ViralHourChartProps {
  data: HourDataPoint[];
  formatValue?: (v: number) => string;
  /** Number of top bars to highlight */
  highlightTop?: number;
}

/** Parse "9:00" or "14:00" → numeric hour 0–23 */
function parseHour(hourStr: string): number {
  return parseInt(hourStr.split(":")[0] ?? "0", 10);
}

/** Format hour number to short label like "9 AM", "2 PM" */
function formatHourLabel(h: number): string {
  if (h === 0) return "12a";
  if (h === 12) return "12p";
  return h < 12 ? `${h}a` : `${h - 12}p`;
}

function CustomTooltip({
  active,
  payload,
  formatValue,
}: {
  active?: boolean;
  payload?: any[];
  formatValue?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const h = item.payload.hourNum as number;
  const label =
    h === 0 ? "12:00 AM" : h === 12 ? "12:00 PM" : h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;

  return (
    <div className="bg-background/95 rounded-lg border px-3 py-2 text-xs shadow-md backdrop-blur-sm">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">
        Engagement:{" "}
        <span className="text-foreground font-semibold">
          {formatValue ? formatValue(item.value) : item.value}
        </span>
      </p>
      {item.payload.count > 0 && (
        <p className="text-muted-foreground">{item.payload.count} tweets</p>
      )}
    </div>
  );
}

export function ViralHourChart({ data, formatValue, highlightTop = 3 }: ViralHourChartProps) {
  // Build a complete 24-slot array
  const engagementByHour = new Map<number, { value: number; count: number }>();
  for (const d of data) {
    engagementByHour.set(parseHour(d.hour), {
      value: d.avgEngagement,
      count: d.count,
    });
  }

  const chartData = Array.from({ length: 24 }, (_, h) => ({
    label: formatHourLabel(h),
    hourNum: h,
    value: engagementByHour.get(h)?.value ?? 0,
    count: engagementByHour.get(h)?.count ?? 0,
  }));

  // Determine top N hours by value
  const topHours = new Set(
    [...engagementByHour.entries()]
      .sort((a, b) => b[1].value - a[1].value)
      .slice(0, highlightTop)
      .map(([h]) => h)
  );

  return (
    <ResponsiveContainer width="100%" height={180} aria-label="Best posting hours chart">
      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          interval={2}
        />
        <YAxis
          {...(formatValue !== undefined && { tickFormatter: formatValue })}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          content={<CustomTooltip {...(formatValue !== undefined && { formatValue })} />}
          cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
        />
        <Bar dataKey="value" radius={[2, 2, 0, 0]} maxBarSize={18}>
          {chartData.map((entry) => (
            <Cell
              key={entry.hourNum}
              fill={
                topHours.has(entry.hourNum) ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.25)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
