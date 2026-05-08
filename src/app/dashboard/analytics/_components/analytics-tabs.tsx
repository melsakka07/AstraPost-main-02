"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompetitorTab } from "./competitor-tab";
import { ViralTab } from "./viral-tab";

export type AnalyticsTabValue = "overview" | "viral" | "competitor";

interface AnalyticsTabsProps {
  /** Active tab resolved on the server from `?tab=` (defaults to "overview"). */
  initialTab: AnalyticsTabValue;
  /** Pre-rendered overview content (the heavy RSC analytics surface). */
  overview: React.ReactNode;
}

/**
 * Client wrapper that surfaces the Analytics hub as three tabs (Overview /
 * Viral / Competitor). The active tab is mirrored to `?tab=…` so deep links
 * and the redirects from `/analytics/viral` and `/analytics/competitor` keep
 * working.
 *
 * The Overview tab content is rendered on the server and passed in as a
 * `ReactNode` so we don't lose RSC benefits (DB queries, parallel fetches).
 * The Viral and Competitor tabs are fully client islands.
 */
export function AnalyticsTabs({ initialTab, overview }: AnalyticsTabsProps) {
  const t = useTranslations("analytics");
  const tNav = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleValueChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (value === "overview") {
        params.delete("tab");
      } else {
        params.set("tab", value);
      }
      const query = params.toString();
      const path = pathname ?? "/dashboard/analytics";
      router.replace(query ? `${path}?${query}` : path, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <Tabs value={initialTab} onValueChange={handleValueChange} className="w-full">
      <TabsList className="h-auto flex-wrap">
        <TabsTrigger value="overview">{t("overview_tab")}</TabsTrigger>
        <TabsTrigger value="viral">{tNav("viral_analyzer")}</TabsTrigger>
        <TabsTrigger value="competitor">{tNav("competitor")}</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="space-y-6">
        {overview}
      </TabsContent>
      <TabsContent value="viral" className="space-y-6">
        <ViralTab />
      </TabsContent>
      <TabsContent value="competitor" className="space-y-6">
        <CompetitorTab />
      </TabsContent>
    </Tabs>
  );
}
