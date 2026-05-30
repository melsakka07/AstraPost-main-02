"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calendar } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MAX_RANGE_DAYS = 365;

function daysBetween(from: string, to: string): number {
  const diff = new Date(to).getTime() - new Date(from).getTime();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export function DateRangeSelector() {
  const t = useTranslations("analytics");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const range = searchParams.get("range") || "30d";
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const isCustom = range === "custom";

  const [customFrom, setCustomFrom] = useState(fromParam || "");
  const [customTo, setCustomTo] = useState(toParam || "");
  const [error, setError] = useState<string | null>(null);

  const handleRangeChange = (value: string) => {
    setError(null);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "custom") {
      params.set("range", "custom");
      // Clear stale from/to when switching to custom — user fills fresh
      params.delete("from");
      params.delete("to");
      setCustomFrom("");
      setCustomTo("");
    } else {
      params.set("range", value);
      params.delete("from");
      params.delete("to");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleCustomApply = () => {
    setError(null);

    if (!customFrom || !customTo) {
      setError(t("custom_range_fill_both"));
      return;
    }

    const days = daysBetween(customFrom, customTo);
    if (days < 1) {
      setError(t("custom_range_invalid"));
      return;
    }

    if (days > MAX_RANGE_DAYS) {
      setError(t("custom_range_max", { max: MAX_RANGE_DAYS }));
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    params.set("from", customFrom);
    params.set("to", customTo);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Select value={range} onValueChange={handleRangeChange}>
          <SelectTrigger className="h-9 w-[120px]">
            <SelectValue placeholder={t("date_range.placeholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">{t("date_range.last_7d")}</SelectItem>
            <SelectItem value="14d">{t("date_range.last_14d")}</SelectItem>
            <SelectItem value="30d">{t("date_range.last_30d")}</SelectItem>
            <SelectItem value="90d">{t("date_range.last_90d")}</SelectItem>
            <SelectItem value="custom">{t("custom_range")}</SelectItem>
          </SelectContent>
        </Select>
        {isCustom && !fromParam && (
          <span className="text-muted-foreground hidden text-xs sm:inline">
            {t("custom_range_hint")}
          </span>
        )}
      </div>

      {isCustom && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="analytics-from-date" className="text-muted-foreground text-xs">
              {t("from_date")}
            </label>
            <Input
              id="analytics-from-date"
              type="date"
              value={customFrom}
              onChange={(e) => {
                setCustomFrom(e.target.value);
                setError(null);
              }}
              className={cn("h-9 w-[148px] text-xs")}
              max={customTo || undefined}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="analytics-to-date" className="text-muted-foreground text-xs">
              {t("to_date")}
            </label>
            <Input
              id="analytics-to-date"
              type="date"
              value={customTo}
              onChange={(e) => {
                setCustomTo(e.target.value);
                setError(null);
              }}
              className={cn("h-9 w-[148px] text-xs")}
              min={customFrom || undefined}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCustomApply}
            className="h-11 min-h-11 min-w-11 text-xs"
            disabled={!customFrom && !customTo}
          >
            <Calendar className="me-1.5 h-4 w-4 shrink-0" />
            {t("apply")}
          </Button>
          {error && (
            <p className="text-danger-11 mt-1 w-full text-xs" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
