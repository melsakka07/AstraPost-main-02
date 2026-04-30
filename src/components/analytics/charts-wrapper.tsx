"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const FollowerChart = dynamic(
  () => import("@/components/analytics/follower-chart").then((m) => m.FollowerChart),
  {
    loading: () => <Skeleton className="h-[300px] w-full rounded-lg" />,
  }
);

const ImpressionsChart = dynamic(
  () => import("@/components/analytics/impressions-chart").then((m) => m.ImpressionsChart),
  {
    loading: () => <Skeleton className="h-[300px] w-full rounded-lg" />,
  }
);

const EngagementRateChart = dynamic(
  () => import("@/components/analytics/engagement-rate-chart").then((m) => m.EngagementRateChart),
  {
    loading: () => <Skeleton className="h-[300px] w-full rounded-lg" />,
  }
);

const BestTimeHeatmap = dynamic(
  () => import("@/components/analytics/best-time-heatmap").then((m) => m.BestTimeHeatmap),
  {
    loading: () => <Skeleton className="h-[400px] w-full rounded-lg" />,
  }
);

export { FollowerChart, ImpressionsChart, EngagementRateChart, BestTimeHeatmap };
