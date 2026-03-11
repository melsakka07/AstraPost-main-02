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

export function BestTimeHeatmap({ data }: { data: HeatmapData[] }) {
  const grid = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach(d => map.set(`${d.day}-${d.hour}`, d.score));
    return map;
  }, [data]);

  const getColor = (score: number) => {
    if (score === 0) return "bg-muted/20";
    if (score < 25) return "bg-primary/20";
    if (score < 50) return "bg-primary/40";
    if (score < 75) return "bg-primary/60";
    return "bg-primary text-primary-foreground font-bold";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Best Time to Post</CardTitle>
        <CardDescription>Based on your engagement history (last 90 days)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 overflow-x-auto">
          {/* Header Row */}
          <div className="flex">
            <div className="w-10 shrink-0" />
            {HOURS.filter(h => h % 2 === 0).map(h => (
              <div key={h} className="flex-1 text-[10px] text-center text-muted-foreground min-w-[20px]">
                {h === 0 ? '12am' : h === 12 ? '12pm' : h > 12 ? `${h-12}pm` : `${h}am`}
              </div>
            ))}
          </div>

          {/* Grid */}
          {DAYS.map((day, dayIndex) => (
            <div key={day} className="flex items-center gap-1">
              <div className="w-10 text-xs font-medium text-muted-foreground shrink-0">
                {day}
              </div>
              {HOURS.map(hour => {
                const score = grid.get(`${dayIndex}-${hour}`) || 0;
                return (
                  <div
                    key={`${day}-${hour}`}
                    className={cn(
                      "h-8 flex-1 min-w-[20px] rounded-sm flex items-center justify-center text-[10px] transition-all hover:scale-110 cursor-help",
                      getColor(score)
                    )}
                    title={`${day} ${hour}:00 - Score: ${score}`}
                  >
                    {score > 75 && score}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <span>Less Active</span>
          <div className="flex gap-1">
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
