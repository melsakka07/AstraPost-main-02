"use client";

import { useState, useEffect } from "react";
import { addDays, setHours, setMinutes, setSeconds, format, getDay } from "date-fns";
import { Lock, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";

interface TimeSlot {
  day: number;
  hour: number;
  score: number;
}

interface BestTimeSuggestionsProps {
  onSelect: (date: string) => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function BestTimeSuggestions({ onSelect }: BestTimeSuggestionsProps) {
  const [times, setTimes] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestricted, setIsRestricted] = useState(false);
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
      } finally {
        setIsLoading(false);
      }
    }
    fetchTimes();
  }, []);

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

  if (isLoading) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <CalendarClock className="w-4 h-4" />
        Best times to post
      </div>
      
      {isRestricted ? (
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 border-dashed text-muted-foreground hover:text-primary hover:border-primary"
          onClick={() => openWithContext({ feature: "best_times" })}
        >
          <Lock className="w-3 h-3" />
          Upgrade to see best times
        </Button>
      ) : (
        <div className="flex flex-wrap gap-2">
          {times.map((slot, i) => (
            <Button
              key={i}
              variant="secondary"
              size="sm"
              className="h-7 text-xs bg-primary/10 hover:bg-primary/20 text-primary border-transparent"
              onClick={() => handleSelect(slot)}
            >
              {DAYS[slot.day]} {slot.hour > 12 ? `${slot.hour - 12}PM` : slot.hour === 12 ? "12PM" : slot.hour === 0 ? "12AM" : `${slot.hour}AM`}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
