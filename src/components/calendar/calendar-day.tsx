"use client";

import { useDroppable } from "@dnd-kit/core";
import { format, isToday } from "date-fns";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CalendarPostItem } from "./calendar-post-item";
import { type CalendarPost } from "./calendar-view";

interface CalendarDayProps {
  id: string;
  date: Date;
  posts: CalendarPost[];
  isCurrentMonth: boolean;
  view: "month" | "week" | "day";
  onDateClick?: (date: Date) => void;
  accountColorMap?: Record<string, string>;
}

export function CalendarDay({ id, date, posts, isCurrentMonth, view, onDateClick, accountColorMap }: CalendarDayProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group relative flex flex-col gap-1 border-b border-r p-2 transition-colors last:border-r-0 overflow-hidden",
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
        {onDateClick && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDateClick(date); }}
            aria-label={`Create post for ${format(date, "MMMM d")}`}
            className="opacity-0 group-hover:opacity-100 flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden">
        {posts.map((post) => (
          <CalendarPostItem
            key={post.id}
            post={post}
            view={view}
            {...(accountColorMap && post.xAccountId && accountColorMap[post.xAccountId]
              ? { accentColor: accountColorMap[post.xAccountId] }
              : {})}
          />
        ))}
      </div>
    </div>
  );
}
