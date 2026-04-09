"use client";

import { useDraggable } from "@dnd-kit/core";
import { format } from "date-fns";
import { GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type CalendarPost } from "./calendar-view";

interface CalendarPostItemProps {
  post: CalendarPost;
  isOverlay?: boolean;
  view?: "month" | "week" | "day";
  accentColor?: string;
}

export function CalendarPostItem({ post, isOverlay, view, accentColor }: CalendarPostItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: post.id,
  });

  const dndStyle = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isOverlay ? 999 : undefined,
      }
    : undefined;

  const content = post.tweets?.[0]?.content || "No content";
  const type = post.type === "thread" ? "Thread" : "Tweet";
  const time = post.scheduledAt ? format(new Date(post.scheduledAt), "HH:mm") : "";
  const borderColor = accentColor ?? "hsl(var(--primary) / 0.5)";

  // C4 — compact chip in month view to prevent mobile overflow
  if (view === "month") {
    return (
      <div
        ref={setNodeRef}
        style={{ ...dndStyle, borderLeftColor: borderColor }}
        {...attributes}
        {...listeners}
        className={cn(
          "cursor-grab rounded-sm border-l-[3px] px-1 py-0.5 active:cursor-grabbing",
          "bg-primary/5 hover:bg-primary/10 min-h-[20px] overflow-hidden transition-colors",
          isDragging && "opacity-50",
          isOverlay && "scale-105 rotate-2 cursor-grabbing opacity-90 shadow-xl"
        )}
      >
        <p className="truncate text-[10px] leading-tight">
          <span className="text-muted-foreground mr-1 font-medium">{time}</span>
          {content}
        </p>
      </div>
    );
  }

  return (
    <Card
      ref={setNodeRef}
      style={{ ...dndStyle, borderLeftColor: borderColor }}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab transition-shadow hover:shadow-md active:cursor-grabbing",
        isDragging && "opacity-50",
        isOverlay && "scale-105 rotate-2 cursor-grabbing opacity-90 shadow-xl",
        "bg-card border-l-4"
      )}
    >
      <CardContent className="flex min-h-[44px] flex-col justify-center space-y-1 p-2">
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <Badge variant="outline" className="h-5 px-1 text-[10px]">
            {type}
          </Badge>
          <span>{time}</span>
        </div>
        <div className="flex items-start gap-1">
          <GripVertical className="text-muted-foreground/30 mt-0.5 h-4 w-4 flex-shrink-0" />
          <p className="line-clamp-2 flex-1 text-xs leading-tight break-words">{content}</p>
        </div>
      </CardContent>
    </Card>
  );
}
