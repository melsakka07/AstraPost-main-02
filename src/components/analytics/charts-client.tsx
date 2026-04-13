"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const FollowerChart = dynamic(
  () => import("@/components/analytics/follower-chart").then((m) => m.FollowerChart),
  { ssr: false, loading: () => <Skeleton className="h-[250px] w-full" /> }
);

export const ImpressionsChart = dynamic(
  () => import("@/components/analytics/impressions-chart").then((m) => m.ImpressionsChart),
  { ssr: false, loading: () => <Skeleton className="h-[200px] w-full" /> }
);

export const EngagementRateChart = dynamic(
  () => import("@/components/analytics/engagement-rate-chart").then((m) => m.EngagementRateChart),
  { ssr: false, loading: () => <Skeleton className="h-[200px] w-full" /> }
);
