"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type HeatmapData = {
  day: number; // 0-6
  hour: number; // 0-23
  score: number; // 0-100
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number) {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h > 12 ? `${h - 12}pm` : `${h}am`;
}

export function BestTimeHeatmap({ data }: { data: HeatmapData[] }) {
  const grid = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((d) => map.set(`${d.day}-${d.hour}`, d.score));
    return map;
  }, [data]);

  const getColor = (score: number) => {
    if (score === 0) return "bg-muted/20";
    if (score < 25) return "bg-primary/20";
    if (score < 50) return "bg-primary/40";
    if (score < 75) return "bg-primary/60";
    return "bg-primary text-primary-foreground font-bold";
  };

  // Derive the best posting time for a visually hidden summary
  const bestCell = useMemo(() => {
    let best = { day: -1, hour: -1, score: -1 };
    for (const d of data) {
      if (d.score > best.score) best = d;
    }
    return best;
  }, [data]);

  const bestSummary =
    bestCell.day >= 0
      ? `Your best posting time is ${DAYS[bestCell.day]} at ${formatHour(bestCell.hour)} (score: ${bestCell.score}).`
      : "Not enough data to determine a best posting time.";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Best Time to Post</CardTitle>
        <CardDescription>Based on your engagement history (last 90 days)</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Visually hidden summary for screen readers */}
        <p className="sr-only">{bestSummary}</p>

        <div className="overflow-x-auto">
          <table
            className="w-full border-separate border-spacing-[3px]"
            role="grid"
            aria-label="Posting engagement heatmap by day and hour"
          >
            <thead>
              <tr>
                {/* Empty corner cell */}
                <th scope="col" className="w-10" aria-label="Day / Hour" />
                {HOURS.map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="text-muted-foreground min-w-[20px] pb-1 text-center text-[10px] font-normal"
                  >
                    {h % 2 === 0 ? formatHour(h) : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, dayIndex) => (
                <tr key={day}>
                  <th
                    scope="row"
                    className="text-muted-foreground w-10 pr-1 text-left text-xs font-medium whitespace-nowrap"
                  >
                    {day}
                  </th>
                  {HOURS.map((hour) => {
                    const score = grid.get(`${dayIndex}-${hour}`) ?? 0;
                    return (
                      <td
                        key={`${day}-${hour}`}
                        className={cn(
                          "h-8 min-w-[20px] cursor-help rounded-sm text-center text-[10px] transition-all hover:scale-110",
                          getColor(score)
                        )}
                        title={`${day} ${formatHour(hour)} — Score: ${score}`}
                        aria-label={`${day} ${formatHour(hour)}: engagement score ${score}`}
                      >
                        {score > 75 ? score : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-muted-foreground mt-4 flex items-center justify-end gap-2 text-xs">
          <span>Less Active</span>
          <div className="flex gap-1" aria-hidden="true">
            <div className="bg-muted/20 h-4 w-4 rounded-sm" />
            <div className="bg-primary/20 h-4 w-4 rounded-sm" />
            <div className="bg-primary/40 h-4 w-4 rounded-sm" />
            <div className="bg-primary/60 h-4 w-4 rounded-sm" />
            <div className="bg-primary h-4 w-4 rounded-sm" />
          </div>
          <span>More Active</span>
        </div>
      </CardContent>
    </Card>
  );
}
