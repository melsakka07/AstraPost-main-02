"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const AgenticPostingClient = dynamic(
  () => import("@/components/ai/agentic-posting-client").then((m) => m.AgenticPostingClient),
  {
    loading: () => (
      <div className="animate-pulse space-y-6">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    ),
    ssr: false,
  }
);
