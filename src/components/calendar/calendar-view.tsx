"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { CalendarDay } from "./calendar-day";
import { CalendarPostItem } from "./calendar-post-item";

type ViewType = "month" | "week" | "day";

export interface CalendarPost {
  id: string;
  type: string | null;
  status: string | null;
  scheduledAt: Date | null;
  xAccountId?: string | null;
  tweets: { id: string; content: string; position: number }[];
}

// C3 — deterministic per-account color palette
const ACCOUNT_COLORS = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ec4899"];

interface CalendarViewProps {
  posts: CalendarPost[];
  currentDate: Date;
  initialView?: ViewType;
}

export function CalendarView({ posts, currentDate, initialView = "month" }: CalendarViewProps) {
  const t = useTranslations("calendar");
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [view, setView] = React.useState<ViewType>(initialView);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [isUpdating, setIsUpdating] = React.useState(false);

  // After hydration, default to "week" on mobile when no explicit view was requested
  React.useEffect(() => {
    if (!isDesktop && initialView === "month") {
      setView("week");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handlePrev = () => {
    let newDate = new Date(currentDate);
    if (view === "month") newDate = subMonths(currentDate, 1);
    else if (view === "week") newDate = subWeeks(currentDate, 1);
    else newDate = subDays(currentDate, 1);

    updateDate(newDate);
  };

  const handleNext = () => {
    let newDate = new Date(currentDate);
    if (view === "month") newDate = addMonths(currentDate, 1);
    else if (view === "week") newDate = addWeeks(currentDate, 1);
    else newDate = addDays(currentDate, 1);

    updateDate(newDate);
  };

  const handleToday = () => {
    updateDate(new Date());
  };

  const updateDate = (date: Date) => {
    const params = new URLSearchParams();
    params.set("date", date.toISOString());
    params.set("view", view);
    router.push(`?${params.toString()}`);
  };

  // Generate days based on view
  const days = React.useMemo(() => {
    const dayList = [];
    let startDate: Date;
    let endDate: Date;

    if (view === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(monthStart);
      startDate = startOfWeek(monthStart);
      endDate = endOfWeek(monthEnd);
    } else if (view === "week") {
      startDate = startOfWeek(currentDate);
      endDate = endOfWeek(currentDate);
    } else {
      startDate = currentDate;
      endDate = currentDate;
    }

    let day = startDate;
    while (day <= endDate) {
      dayList.push(day);
      day = addDays(day, 1);
    }
    return dayList;
  }, [currentDate, view]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const postId = active.id as string;
    const newDateStr = over.id as string; // YYYY-MM-DD
    const originalPost = posts.find((p) => p.id === postId);

    if (!originalPost?.scheduledAt) return;

    const originalDate = new Date(originalPost.scheduledAt);
    const newDate = new Date(newDateStr);

    // Preserve time
    newDate.setHours(originalDate.getHours());
    newDate.setMinutes(originalDate.getMinutes());

    if (newDate.getTime() === originalDate.getTime()) return;

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/posts/${postId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: newDate.toISOString() }),
      });

      if (!res.ok) throw new Error("Failed to reschedule");

      toast.success("Post rescheduled");
      router.refresh();
    } catch (error) {
      toast.error("Failed to reschedule post");
    } finally {
      setIsUpdating(false);
    }
  };

  const activePost: CalendarPost | null = activeId
    ? (posts.find((p) => p.id === activeId) ?? null)
    : null;

  // C3 — map each unique xAccountId to a stable color
  const accountColorMap = React.useMemo<Record<string, string>>(() => {
    const ids = [...new Set(posts.map((p) => p.xAccountId).filter(Boolean))] as string[];
    return Object.fromEntries(
      ids.map((id, i) => [id, ACCOUNT_COLORS[i % ACCOUNT_COLORS.length] as string])
    );
  }, [posts]);

  const handleDateClick = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    router.push(`/dashboard/compose?scheduledAt=${encodeURIComponent(`${dateStr}T09:00`)}`);
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrev} aria-label="Previous period">
            <ChevronLeft className="h-4 w-4 rtl:scale-x-[-1]" aria-hidden="true" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext} aria-label="Next period">
            <ChevronRight className="h-4 w-4 rtl:scale-x-[-1]" aria-hidden="true" />
          </Button>
          <h2 className="text-base font-semibold sm:text-lg">{format(currentDate, "MMMM yyyy")}</h2>
          <Button variant="ghost" onClick={handleToday} className="min-h-[44px]">
            {t("today")}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {isUpdating && <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />}
          <Select
            value={view}
            onValueChange={(v) => {
              setView(v as ViewType);
            }}
          >
            <SelectTrigger className="min-h-[44px] w-full sm:w-[120px]">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">{t("month")}</SelectItem>
              <SelectItem value="week">{t("week")}</SelectItem>
              <SelectItem value="day">Day</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 flex-col overflow-hidden rounded-md border">
          {view !== "day" && (
            <div className="bg-muted/50 grid grid-cols-7 border-b">
              {[
                { short: "S", full: "Sun" },
                { short: "M", full: "Mon" },
                { short: "T", full: "Tue" },
                { short: "W", full: "Wed" },
                { short: "T", full: "Thu" },
                { short: "F", full: "Fri" },
                { short: "S", full: "Sat" },
              ].map((day, i) => (
                <div
                  key={i}
                  className="text-muted-foreground border-r p-1 text-center text-xs font-medium last:border-r-0 sm:p-2 sm:text-sm"
                >
                  <span className="sm:hidden">{day.short}</span>
                  <span className="hidden sm:inline">{day.full}</span>
                </div>
              ))}
            </div>
          )}

          <div
            className={cn(
              "bg-background grid",
              view === "month"
                ? "grid-cols-7 grid-rows-6"
                : view === "week"
                  ? "grid-cols-7 grid-rows-1"
                  : "grid-cols-1 grid-rows-1"
            )}
          >
            {days.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const dayPosts = posts.filter(
                (p) => p.scheduledAt && isSameDay(new Date(p.scheduledAt), day)
              );

              return (
                <CalendarDay
                  key={dayKey}
                  date={day}
                  id={dayKey}
                  posts={dayPosts}
                  isCurrentMonth={isSameMonth(day, currentDate)}
                  view={view}
                  onDateClick={handleDateClick}
                  accountColorMap={accountColorMap}
                />
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {activePost ? (
            <CalendarPostItem
              post={activePost}
              isOverlay
              {...(activePost.xAccountId && accountColorMap[activePost.xAccountId]
                ? { accentColor: accountColorMap[activePost.xAccountId] }
                : {})}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
