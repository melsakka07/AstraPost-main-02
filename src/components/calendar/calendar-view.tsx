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
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CalendarDay } from "./calendar-day";
import { CalendarPostItem } from "./calendar-post-item";

type ViewType = "month" | "week" | "day";

export interface CalendarPost {
  id: string;
  type: string | null;
  status: string | null;
  scheduledAt: Date | null;
  tweets: { id: string; content: string; position: number }[];
}

interface CalendarViewProps {
  posts: CalendarPost[];
  currentDate: Date;
  initialView?: ViewType;
}

export function CalendarView({ posts, currentDate, initialView = "month" }: CalendarViewProps) {
  const router = useRouter();
  const [view, setView] = React.useState<ViewType>(initialView);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [isUpdating, setIsUpdating] = React.useState(false);

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

  const activePost: CalendarPost | null = activeId ? (posts.find((p) => p.id === activeId) ?? null) : null;

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <Button variant="ghost" onClick={handleToday}>
            Today
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Select
            value={view}
            onValueChange={(v) => {
              setView(v as ViewType);
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="day">Day</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="rounded-md border flex-1 overflow-hidden flex flex-col">
            {view !== "day" && (
                <div className="grid grid-cols-7 border-b bg-muted/50">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                        <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0">
                            {day}
                        </div>
                    ))}
                </div>
            )}
            
            <div className={cn(
                "grid bg-background",
                view === "month" ? "grid-cols-7 grid-rows-6" :
                view === "week" ? "grid-cols-7 grid-rows-1" :
                "grid-cols-1 grid-rows-1"
            )}>
                {days.map((day) => {
                    const dayKey = format(day, "yyyy-MM-dd");
                    const dayPosts = posts.filter((p) => 
                        p.scheduledAt && isSameDay(new Date(p.scheduledAt), day)
                    );
                    
                    return (
                        <CalendarDay
                            key={dayKey}
                            date={day}
                            id={dayKey}
                            posts={dayPosts}
                            isCurrentMonth={isSameMonth(day, currentDate)}
                            view={view}
                        />
                    );
                })}
            </div>
        </div>

        <DragOverlay>
          {activePost ? <CalendarPostItem post={activePost} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
