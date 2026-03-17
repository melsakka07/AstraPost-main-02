"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const CalendarViewClient = dynamic(
  () => import("@/components/calendar/calendar-view").then((m) => m.CalendarView),
  { ssr: false, loading: () => <Skeleton className="h-[600px] w-full rounded-lg" /> }
);
