"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ── Time slot definitions (same data previously in composer.tsx) ─────────

interface TimeSlot {
  value: string; // "HH:mm"
  label: string; // "2:00 PM"
  hour: number;
}

const TIME_SLOTS: TimeSlot[] = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  const value = `${String(h).padStart(2, "0")}:${m}`;
  const period = h < 12 ? "AM" : "PM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { value, label: `${displayH}:${m} ${period}`, hour: h };
});

const TIME_GROUPS = [
  {
    label: "Morning",
    slots: TIME_SLOTS.filter((s) => s.hour >= 5 && s.hour < 12),
  },
  {
    label: "Afternoon",
    slots: TIME_SLOTS.filter((s) => s.hour >= 12 && s.hour < 17),
  },
  {
    label: "Evening",
    slots: TIME_SLOTS.filter((s) => s.hour >= 17 && s.hour < 21),
  },
  {
    label: "Night",
    slots: TIME_SLOTS.filter((s) => s.hour >= 21 || s.hour < 5),
  },
];

// ── Component ───────────────────────────────────────────────────────────

interface DateTimePickerProps {
  /** Value as ISO datetime string "YYYY-MM-DDTHH:mm" or empty string */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function DateTimePicker({ value, onChange, disabled, id, className }: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Internal temp state — only committed to parent on Apply
  const [tempDate, setTempDate] = React.useState<string>(value ? value.slice(0, 10) : "");
  const [tempTime, setTempTime] = React.useState<string>(value ? value.slice(11, 16) : "");

  // Sync temp state when external value changes or popover opens
  React.useEffect(() => {
    if (open) {
      setTempDate(value ? value.slice(0, 10) : "");
      setTempTime(value ? value.slice(11, 16) : "");
    }
  }, [open, value]);

  const canApply = tempDate && tempTime;

  const handleApply = () => {
    if (canApply) {
      onChange(`${tempDate}T${tempTime}`);
    }
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setOpen(false);
  };

  // Format the display value
  const displayText = React.useMemo(() => {
    if (!value) return null;
    try {
      const d = parseISO(value);
      return format(d, "MMM d 'at' h:mm a");
    } catch {
      return null;
    }
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* Wrapper gives the clear button an absolutely-positioned anchor without
          nesting a <button> inside the trigger <button> (invalid HTML). */}
      <div className="relative w-full">
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              value && "pr-8", // leave room for the clear button
              !value && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            {displayText ?? <span>Schedule for</span>}
          </Button>
        </PopoverTrigger>
        {value && (
          <button
            type="button"
            className="focus-visible:ring-ring absolute top-1/2 right-2 -translate-y-1/2 rounded-sm opacity-70 hover:opacity-100 focus-visible:ring-2 focus-visible:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            aria-label="Clear schedule"
            disabled={disabled}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <PopoverContent
        className="w-auto overflow-hidden p-0"
        align="start"
        // Wide enough for calendar + time grid side-by-side on desktop,
        // stacks vertically on small viewports
      >
        <div className="flex flex-col sm:flex-row">
          {/* Calendar */}
          <div className="border-b p-3 sm:border-r sm:border-b-0">
            <Calendar
              mode="single"
              selected={tempDate ? parseISO(tempDate) : undefined}
              onSelect={(day) => {
                const d = day ? format(day, "yyyy-MM-dd") : "";
                setTempDate(d);
                // Auto-select noon if no time yet
                if (d && !tempTime) {
                  setTempTime("12:00");
                }
              }}
              disabled={(day) => day < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
            />
          </div>

          {/* Time grid */}
          <div className="max-h-[320px] w-full overflow-y-auto p-3 sm:w-48">
            <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium">
              <Clock className="h-3.5 w-3.5" />
              {tempDate ? format(parseISO(tempDate), "EEE, MMM d") : "Select a date first"}
            </div>

            <div className={cn("space-y-3", !tempDate && "pointer-events-none opacity-50")}>
              {TIME_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-muted-foreground/60 mb-1 text-[10px] font-semibold tracking-wider uppercase">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-3 gap-1">
                    {group.slots.map((slot) => (
                      <button
                        key={slot.value}
                        type="button"
                        className={cn(
                          "rounded-md px-1.5 py-1 text-[11px] leading-none transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          tempTime === slot.value
                            ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                            : "text-foreground/80"
                        )}
                        onClick={() => setTempTime(slot.value)}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer: Clear + Apply */}
        {(tempDate || value) && (
          <div className="bg-muted/30 flex items-center justify-between border-t px-3 py-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleClear}>
              Clear
            </Button>
            <Button size="sm" className="h-7 text-xs" disabled={!canApply} onClick={handleApply}>
              {tempDate && tempTime
                ? `Apply · ${format(parseISO(`${tempDate}T${tempTime}`), "MMM d, h:mm a")}`
                : "Apply"}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
