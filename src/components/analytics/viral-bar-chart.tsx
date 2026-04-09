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

interface ViralBarChartItem {
  name: string;
  value: number;
  count?: number;
}

interface ViralBarChartProps {
  data: ViralBarChartItem[];
  /**
   * "horizontal" → bars grow left-to-right, labels on Y axis (best for long text).
   * "vertical"   → bars grow upward, labels on X axis (best for short categories).
   * Default: "horizontal"
   */
  orientation?: "horizontal" | "vertical";
  /** How many top items to highlight with primary color */
  highlightTop?: number;
  /** Formatter for the value label (e.g. formatPercent) */
  formatValue?: (v: number) => string;
  height?: number;
  emptyText?: string;
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
  return (
    <div className="bg-background/95 rounded-lg border px-3 py-2 text-xs shadow-md backdrop-blur-sm">
      <p className="font-medium">{item.payload.name}</p>
      <p className="text-muted-foreground">
        Engagement:{" "}
        <span className="text-foreground font-semibold">
          {formatValue ? formatValue(item.value) : item.value}
        </span>
      </p>
      {item.payload.count !== undefined && (
        <p className="text-muted-foreground">{item.payload.count} tweets</p>
      )}
    </div>
  );
}

export function ViralBarChart({
  data,
  orientation = "horizontal",
  highlightTop = 1,
  formatValue,
  height = 220,
  emptyText = "No data yet",
}: ViralBarChartProps) {
  if (!data.length) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        {emptyText}
      </div>
    );
  }

  // Top values (already sorted descending by caller)
  const topValues = new Set(
    data
      .slice()
      .sort((a, b) => b.value - a.value)
      .slice(0, highlightTop)
      .map((d) => d.name)
  );

  const isHorizontal = orientation === "horizontal";

  // recharts: layout="vertical" = horizontal bars; layout="horizontal" = vertical bars
  const layout = isHorizontal ? "vertical" : "horizontal";

  return (
    <ResponsiveContainer width="100%" height={height} aria-label="Bar chart">
      <BarChart
        data={data}
        layout={layout}
        margin={
          isHorizontal
            ? { top: 4, right: 16, bottom: 4, left: 8 }
            : { top: 4, right: 8, bottom: 4, left: 0 }
        }
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          horizontal={!isHorizontal}
          vertical={isHorizontal}
        />
        {isHorizontal ? (
          <>
            <XAxis
              type="number"
              {...(formatValue !== undefined && { tickFormatter: formatValue })}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={90}
              tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
              axisLine={false}
              tickLine={false}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              {...(formatValue !== undefined && { tickFormatter: formatValue })}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
          </>
        )}
        <Tooltip
          content={<CustomTooltip {...(formatValue !== undefined && { formatValue })} />}
          cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
        />
        <Bar dataKey="value" radius={[3, 3, 3, 3]} maxBarSize={32}>
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={topValues.has(entry.name) ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.3)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
