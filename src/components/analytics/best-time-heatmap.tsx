"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type HeatmapData = {
  day: number; // 0-6
  hour: number; // 0-23
  score: number; // 0-100
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

// 2023-01-01 (UTC) is a Sunday — used as a stable reference to derive
// locale-aware weekday/hour labels indexed 0=Sun..6=Sat.
const REF_SUNDAY = Date.UTC(2023, 0, 1);

export function BestTimeHeatmap({ data }: { data: HeatmapData[] }) {
  const locale = useLocale();
  const t = useTranslations("analytics");

  // Locale-aware labels (Arabic, English, …) without hardcoded strings.
  const { dayLabels, formatHour } = useMemo(() => {
    const dayFmt = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
    const hourFmt = new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      hour12: true,
      timeZone: "UTC",
    });
    return {
      dayLabels: Array.from({ length: 7 }, (_, i) => dayFmt.format(REF_SUNDAY + i * 86_400_000)),
      formatHour: (h: number) => hourFmt.format(REF_SUNDAY + h * 3_600_000),
    };
  }, [locale]);

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
      ? t("best_time_summary", {
          day: dayLabels[bestCell.day] ?? "",
          hour: formatHour(bestCell.hour),
          score: bestCell.score,
        })
      : t("best_time_no_data");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("best_time_post")}</CardTitle>
        <CardDescription>{t("best_time_description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Visually hidden summary for screen readers */}
        <p className="sr-only">{bestSummary}</p>

        <div className="overflow-x-auto">
          <table
            className="w-full border-separate border-spacing-[3px]"
            role="grid"
            aria-label={t("best_time_heatmap_label")}
          >
            <thead>
              <tr>
                {/* Empty corner cell */}
                <th scope="col" className="w-10" aria-label={t("best_time_day_hour")} />
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
              {dayLabels.map((day, dayIndex) => (
                <tr key={day}>
                  <th
                    scope="row"
                    className="text-muted-foreground w-10 pe-1 text-start text-xs font-medium whitespace-nowrap"
                  >
                    {day}
                  </th>
                  {HOURS.map((hour) => {
                    const score = grid.get(`${dayIndex}-${hour}`) ?? 0;
                    const cellLabel = t("best_time_cell", {
                      day,
                      hour: formatHour(hour),
                      score,
                    });
                    return (
                      <td
                        key={`${day}-${hour}`}
                        className={cn(
                          "h-8 min-w-[20px] cursor-help rounded-sm text-center text-[10px] transition-all hover:scale-110",
                          getColor(score)
                        )}
                        title={cellLabel}
                        aria-label={cellLabel}
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
          <span>{t("less_active")}</span>
          <div className="flex gap-1" aria-hidden="true">
            <div className="bg-muted/20 h-4 w-4 rounded-sm" />
            <div className="bg-primary/20 h-4 w-4 rounded-sm" />
            <div className="bg-primary/40 h-4 w-4 rounded-sm" />
            <div className="bg-primary/60 h-4 w-4 rounded-sm" />
            <div className="bg-primary h-4 w-4 rounded-sm" />
          </div>
          <span>{t("more_active")}</span>
        </div>
      </CardContent>
    </Card>
  );
}
