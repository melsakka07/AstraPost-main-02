"use client";

import { useDroppable } from "@dnd-kit/core";
import { format, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarPostItem } from "./calendar-post-item";

interface CalendarDayProps {
  id: string;
  date: Date;
  posts: any[];
  isCurrentMonth: boolean;
  view: "month" | "week" | "day";
}

export function CalendarDay({ id, date, posts, isCurrentMonth, view }: CalendarDayProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex flex-col gap-1 border-b border-r p-2 transition-colors last:border-r-0 overflow-hidden",
        !isCurrentMonth && "bg-muted/10 text-muted-foreground",
        isOver && "bg-accent/50",
        view === "month" && "min-h-[80px]",
        view === "week" && "min-h-[120px]",
        view === "day" && "min-h-[400px]"
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-sm font-medium",
            isToday(date) && "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
          )}
        >
          {format(date, "d")}
        </span>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden">
        {posts.map((post) => (
          <CalendarPostItem key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
