"use client";

import { addDays, format, startOfDay, endOfDay } from "date-fns";
import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DateRange {
  from?: Date;
  to?: Date;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets?: ("7d" | "30d" | "90d" | "custom")[];
  disabled?: boolean;
}

const PRESET_RANGES = {
  "7d": {
    label: "Last 7 days",
    getValue: () => ({
      from: startOfDay(addDays(new Date(), -7)),
      to: endOfDay(new Date()),
    }),
  },
  "30d": {
    label: "Last 30 days",
    getValue: () => ({
      from: startOfDay(addDays(new Date(), -30)),
      to: endOfDay(new Date()),
    }),
  },
  "90d": {
    label: "Last 90 days",
    getValue: () => ({
      from: startOfDay(addDays(new Date(), -90)),
      to: endOfDay(new Date()),
    }),
  },
};

export function DateRangePicker({
  value,
  onChange,
  presets = ["7d", "30d", "90d", "custom"],
  disabled = false,
}: DateRangePickerProps) {
  const formatDateRange = () => {
    if (!value.from || !value.to) {
      return "Select date range";
    }
    return `${format(value.from, "MMM d, yyyy")} - ${format(value.to, "MMM d, yyyy")}`;
  };

  const today = endOfDay(new Date());

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between text-left font-normal md:w-auto",
            !value && "text-muted-foreground"
          )}
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">{formatDateRange()}</span>
            <span className="inline sm:hidden">
              {value.from ? format(value.from, "MMM d") : "Date"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-0" align="start">
        <div className="flex flex-col gap-4 p-4">
          {/* Presets */}
          <div className="flex flex-col gap-2">
            {presets.map((preset) => {
              if (preset === "custom") return null;

              const presetConfig = PRESET_RANGES[preset];
              if (!presetConfig) return null;

              const isActive =
                value.from &&
                value.to &&
                format(value.from, "yyyy-MM-dd") ===
                  format(presetConfig.getValue().from, "yyyy-MM-dd") &&
                format(value.to, "yyyy-MM-dd") === format(presetConfig.getValue().to, "yyyy-MM-dd");

              return (
                <Button
                  key={preset}
                  variant={isActive ? "default" : "outline"}
                  className="h-10 justify-start text-sm"
                  onClick={() => onChange(presetConfig.getValue())}
                >
                  {presetConfig.label}
                </Button>
              );
            })}
          </div>

          {/* Calendar */}
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-muted-foreground text-xs font-semibold">From</label>
                <CalendarComponent
                  mode="single"
                  selected={value.from}
                  onSelect={(date) => {
                    if (date) {
                      onChange({
                        from: startOfDay(date),
                        to: value.to || endOfDay(date),
                      });
                    }
                  }}
                  disabled={(date) => date > today}
                  initialFocus
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-muted-foreground text-xs font-semibold">To</label>
                <CalendarComponent
                  mode="single"
                  selected={value.to}
                  onSelect={(date) => {
                    if (date) {
                      onChange({
                        from: value.from || startOfDay(addDays(date, -30)),
                        to: endOfDay(date),
                      });
                    }
                  }}
                  disabled={(date) => date > today || (value.from ? date < value.from : false)}
                />
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
