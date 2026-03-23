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
          <table className="w-full border-separate border-spacing-[3px]" role="grid" aria-label="Posting engagement heatmap by day and hour">
            <thead>
              <tr>
                {/* Empty corner cell */}
                <th scope="col" className="w-10" aria-label="Day / Hour" />
                {HOURS.map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="text-[10px] text-center text-muted-foreground font-normal min-w-[20px] pb-1"
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
                    className="w-10 text-xs font-medium text-muted-foreground text-left pr-1 whitespace-nowrap"
                  >
                    {day}
                  </th>
                  {HOURS.map((hour) => {
                    const score = grid.get(`${dayIndex}-${hour}`) ?? 0;
                    return (
                      <td
                        key={`${day}-${hour}`}
                        className={cn(
                          "h-8 min-w-[20px] rounded-sm text-[10px] text-center transition-all hover:scale-110 cursor-help",
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

        <div className="mt-4 flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <span>Less Active</span>
          <div className="flex gap-1" aria-hidden="true">
            <div className="w-4 h-4 rounded-sm bg-muted/20" />
            <div className="w-4 h-4 rounded-sm bg-primary/20" />
            <div className="w-4 h-4 rounded-sm bg-primary/40" />
            <div className="w-4 h-4 rounded-sm bg-primary/60" />
            <div className="w-4 h-4 rounded-sm bg-primary" />
          </div>
          <span>More Active</span>
        </div>
      </CardContent>
    </Card>
  );
}
