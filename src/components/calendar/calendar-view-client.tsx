"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { CalendarPost } from "./calendar-view";

export interface CalendarViewClientProps {
  posts: CalendarPost[];
  drafts?: CalendarPost[] | undefined;
  currentDate: Date;
  initialView?: "month" | "week" | "day";
}

export function CalendarViewClient({
  posts,
  drafts,
  currentDate,
  initialView,
}: CalendarViewClientProps) {
  const DynCalendarView = dynamic(
    () => import("@/components/calendar/calendar-view").then((m) => m.CalendarView),
    { loading: () => <Skeleton className="h-[600px] w-full rounded-lg" /> }
  );
  return (
    <DynCalendarView
      posts={posts}
      {...(drafts !== undefined && { drafts })}
      currentDate={currentDate}
      {...(initialView !== undefined && { initialView })}
    />
  );
}
