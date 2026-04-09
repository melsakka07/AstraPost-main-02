"use client";

import { useState, useEffect } from "react";
import { addDays, setHours, setMinutes, setSeconds, format, getDay } from "date-fns";
import { Lock, CalendarClock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";

interface TimeSlot {
  day: number;
  hour: number;
  score: number;
}

interface BestTimeSuggestionsProps {
  onSelect: (date: string) => void;
  /** When true, hides the "Best times to post" header (used when embedded inside a container) */
  hideHeader?: boolean;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function BestTimeSuggestions({ onSelect, hideHeader = false }: BestTimeSuggestionsProps) {
  const [times, setTimes] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestricted, setIsRestricted] = useState(false);
  const [isError, setIsError] = useState(false);
  const { openWithContext } = useUpgradeModal();

  useEffect(() => {
    async function fetchTimes() {
      try {
        const res = await fetch("/api/analytics/best-times");
        if (res.status === 402) {
          setIsRestricted(true);
          setIsLoading(false);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setTimes(data.times);
        }
      } catch (e) {
        console.error(e);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTimes();
  }, []);

  const handleNow = () => {
    const now = new Date();
    const dateStr = format(now, "yyyy-MM-dd'T'HH:mm");
    onSelect(dateStr);
  };

  const handleSelect = (slot: TimeSlot) => {
    // Calculate next occurrence
    const today = new Date();
    const currentDay = getDay(today);
    let daysUntil = slot.day - currentDay;

    // If it's today but hour passed, move to next week
    if (daysUntil === 0 && today.getHours() >= slot.hour) {
      daysUntil = 7;
    } else if (daysUntil < 0) {
      daysUntil += 7;
    }

    let targetDate = addDays(today, daysUntil);
    targetDate = setHours(targetDate, slot.hour);
    targetDate = setMinutes(targetDate, 0);
    targetDate = setSeconds(targetDate, 0);

    // Format for datetime-local input: YYYY-MM-DDTHH:mm
    const dateStr = format(targetDate, "yyyy-MM-dd'T'HH:mm");
    onSelect(dateStr);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {!hideHeader && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            <CalendarClock className="h-4 w-4" />
            Best times to post
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-muted h-7 w-16 animate-pulse rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-muted-foreground/70 flex items-center gap-1.5 text-xs">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        Could not load best times
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!hideHeader && (
        <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          <CalendarClock className="h-4 w-4" />
          Best times to post
        </div>
      )}

      {isRestricted ? (
        <Button
          variant="outline"
          className="text-muted-foreground hover:text-primary hover:border-primary w-full justify-start gap-2 border-dashed"
          onClick={() => openWithContext({ feature: "best_times" })}
        >
          <Lock className="h-3 w-3" />
          Upgrade to see best times
        </Button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="bg-primary/10 hover:bg-primary/20 text-primary h-7 border-transparent text-xs"
            onClick={handleNow}
          >
            Now
          </Button>
          {times.map((slot, i) => (
            <Button
              key={i}
              variant="secondary"
              size="sm"
              className="bg-primary/10 hover:bg-primary/20 text-primary h-7 border-transparent text-xs"
              onClick={() => handleSelect(slot)}
            >
              {DAYS[slot.day]}{" "}
              {slot.hour > 12
                ? `${slot.hour - 12}PM`
                : slot.hour === 12
                  ? "12PM"
                  : slot.hour === 0
                    ? "12AM"
                    : `${slot.hour}AM`}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
