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
}

export function CalendarPostItem({ post, isOverlay }: CalendarPostItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: post.id,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isOverlay ? 999 : undefined,
      }
    : undefined;

  const content = post.tweets?.[0]?.content || "No content";
  const type = post.type === "thread" ? "Thread" : "Tweet";
  const time = post.scheduledAt ? format(new Date(post.scheduledAt), "HH:mm") : "";

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow",
        isDragging && "opacity-50",
        isOverlay && "shadow-xl opacity-90 scale-105 rotate-2 cursor-grabbing",
        "bg-card border-l-4 border-l-primary/50"
      )}
    >
      <CardContent className="p-2 space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px] px-1 h-5">
            {type}
          </Badge>
          <span>{time}</span>
        </div>
        <div className="flex items-start gap-1">
          <GripVertical className="h-4 w-4 text-muted-foreground/30 flex-shrink-0 mt-0.5" />
          <p className="line-clamp-2 text-xs leading-tight break-words flex-1">
            {content}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
